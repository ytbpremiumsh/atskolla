import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type DokuConfig = { clientId: string; secretKey: string; baseUrl: string };

export function buildDokuOrderNumber(base: string): string {
  // DOKU permits at most 64 characters. A UUID prevents regeneration collisions
  // caused by keeping only the last four base-36 timestamp digits.
  const prefix = (base.replace(/[^A-Za-z0-9-]/g, "-") || "SPP").slice(0, 31);
  return `${prefix}-${crypto.randomUUID().replaceAll("-", "")}`;
}

export function buildDokuSignature(opts: {
  clientId: string;
  secretKey: string;
  requestId: string;
  requestTimestamp: string;
  requestTarget: string;
  body?: string;
}) {
  const digest = opts.body === undefined ? undefined
    : createHash("sha256").update(opts.body, "utf8").digest("base64");
  const components = [
    `Client-Id:${opts.clientId}`, `Request-Id:${opts.requestId}`,
    `Request-Timestamp:${opts.requestTimestamp}`, `Request-Target:${opts.requestTarget}`,
  ];
  if (digest !== undefined) components.push(`Digest:${digest}`);
  const signature = "HMACSHA256=" + createHmac("sha256", opts.secretKey)
    .update(components.join("\n"), "utf8").digest("base64");
  return { digest, signature };
}

export function verifyDokuWebhook(req: Request, rawBody: string, cfg: Pick<DokuConfig, "clientId" | "secretKey">) {
  const signature = req.headers.get("signature") || "";
  const requestId = req.headers.get("request-id") || "";
  const requestTimestamp = req.headers.get("request-timestamp") || "";
  if (!cfg.clientId || !cfg.secretKey || !requestId || !requestTimestamp || !signature
    || req.headers.get("client-id") !== cfg.clientId) return false;
  // Supabase's gateway can strip /functions/v1 before forwarding to the runtime.
  // Accept only the two published endpoint paths; never trust a forwarded target header.
  const pathname = new URL(req.url).pathname;
  if (!["/doku-webhook", "/functions/v1/doku-webhook"].includes(pathname)) return false;
  return ["/doku-webhook", "/functions/v1/doku-webhook"].some((requestTarget) => {
    const expected = buildDokuSignature({ ...cfg, requestId, requestTimestamp, requestTarget, body: rawBody }).signature;
    const actualBytes = new TextEncoder().encode(signature);
    const expectedBytes = new TextEncoder().encode(expected);
    return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
  });
}

export function dokuStatus(payload: any): string {
  return String(payload?.transaction?.status ?? payload?.response?.transaction?.status
    ?? payload?.order?.status ?? payload?.response?.order?.status ?? "").trim().toUpperCase();
}

export function isDokuPaid(status: unknown): boolean {
  return ["SUCCESS", "PAID", "SETTLED", "COMPLETED", "SUCCESSFUL"].includes(String(status).trim().toUpperCase());
}

export async function checkDokuOrder(cfg: DokuConfig, orderNumber: string) {
  const target = `/orders/v1/status/${encodeURIComponent(orderNumber)}`;
  const requestId = crypto.randomUUID();
  const requestTimestamp = new Date().toISOString().split(".")[0] + "Z";
  // DOKU Non-SNAP GET signatures have no Digest component or Digest header.
  const { signature } = buildDokuSignature({ ...cfg, requestId, requestTimestamp, requestTarget: target });
  const response = await fetch(`${cfg.baseUrl}${target}`, {
    method: "GET", signal: AbortSignal.timeout(10000),
    headers: { "Client-Id": cfg.clientId, "Request-Id": requestId,
      "Request-Timestamp": requestTimestamp, "Signature": signature },
  });
  const json = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, json };
}

// Parent portal and admin sync use the same atomic settlement as the cron worker.
// next_check_at acts as a short lease so browser polling does not flood DOKU.
export async function syncDokuAttempts(admin: any, cfg: DokuConfig, invoiceIds: string[]) {
  if (!invoiceIds.length || !cfg.clientId || !cfg.secretKey) return { checked: 0, paid: 0 };
  const now = new Date().toISOString();
  const { data, error } = await admin.from("doku_payment_attempts").select("order_number,next_check_at")
    .in("invoice_id", invoiceIds).eq("state", "pending").is("request_id", null)
    .lte("next_check_at", now).order("next_check_at").limit(5);
  if (error) throw error;
  let checked = 0, paid = 0;
  for (const attempt of data || []) {
    const { data: leased, error: leaseError } = await admin.from("doku_payment_attempts")
      .update({ next_check_at: new Date(Date.now() + 60000).toISOString() })
      .eq("order_number", attempt.order_number).eq("state", "pending").is("request_id", null)
      .eq("next_check_at", attempt.next_check_at).select("order_number").maybeSingle();
    if (leaseError) throw leaseError;
    if (!leased) continue;
    try {
      const result = await checkDokuOrder(cfg, attempt.order_number);
      checked++;
      if (!result.ok) throw new Error(`DOKU status HTTP ${result.status}`);
      if (!isDokuPaid(dokuStatus(result.json))) continue;
      const { data: settlement, error: settleError } = await admin.rpc("settle_verified_doku_payment", {
        p_order: attempt.order_number, p_payload: result.json,
      });
      if (settleError) throw settleError;
      if (settlement?.marked_paid || settlement?.already) paid++;
    } catch (error) {
      console.error("DOKU reconciliation failed", attempt.order_number, error);
      await admin.from("doku_payment_attempts").update({
        last_error: error instanceof Error ? error.message : String(error),
        next_check_at: new Date(Date.now() + 300000).toISOString(),
      }).eq("order_number", attempt.order_number).eq("state", "pending");
    }
  }
  return { checked, paid };
}
