// Webhook DOKU Cash Disbursement — dipanggil DOKU untuk kirim status final
// disbursement secara async (SUCCESS / FAILED / REVERSED / SETTLED).
//
// Signature verification: HMAC-SHA256 dgn scheme SNAP (Client-Id / Request-Id /
// Timestamp / Target / Digest). Bisa dinonaktifkan sementara via
// platform_settings.doku_disbursement_webhook_verify = "false" saat setup awal.
//
// SELALU return 200 OK ke DOKU (mencegah retry-storm), status detail di body.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac, createHash } from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, signature, digest, request-id, request-timestamp, client-id",
};

function sha256B64(s: string) {
  return createHash("sha256").update(s).digest("base64");
}
function hmacB64(key: string, msg: string) {
  return createHmac("sha256", key).update(msg).digest("base64");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const rawBody = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  // Log setiap notifikasi (audit).
  try {
    await admin.from("spp_logs").insert({
      event_type: "doku_disbursement_webhook",
      payload: { headers, body: rawBody.slice(0, 8000) },
    });
  } catch (_) { /* tabel spp_logs mungkin tanpa policy insert – abaikan */ }

  let body: any = {};
  try { body = JSON.parse(rawBody); } catch { body = {}; }

  // Config
  const { data: cfgRows } = await admin
    .from("platform_settings")
    .select("key,value")
    .in("key", ["doku_disbursement_secret_key", "doku_disbursement_webhook_verify"]);
  const cfg: Record<string, string> = {};
  (cfgRows || []).forEach((r: any) => { cfg[r.key] = r.value || ""; });
  const secret = cfg.doku_disbursement_secret_key || Deno.env.get("DOKU_DISBURSEMENT_SECRET_KEY") || "";
  const verify = (cfg.doku_disbursement_webhook_verify || "true").toLowerCase() !== "false";

  // Verifikasi signature (opsional)
  if (verify && secret) {
    try {
      const clientId = headers["client-id"] || "";
      const requestId = headers["request-id"] || "";
      const ts = headers["request-timestamp"] || "";
      const sigHdr = headers["signature"] || "";
      const url = new URL(req.url);
      const target = url.pathname;
      const digest = sha256B64(rawBody);
      const canonical = `Client-Id:${clientId}\nRequest-Id:${requestId}\nRequest-Timestamp:${ts}\nRequest-Target:${target}\nDigest:${digest}`;
      const expected = "HMACSHA256=" + hmacB64(secret, canonical);
      if (sigHdr !== expected) {
        return new Response(JSON.stringify({ ok: false, error: "invalid_signature" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } catch (e) {
      console.error("sig verify error", e);
    }
  }

  // Ekstrak status
  const partnerRef = body?.partner_reference_no || body?.partnerReferenceNo;
  const refNo = body?.reference_no || body?.referenceNo || body?.transaction_id;
  const tStatus = String(body?.transaction_status || body?.transactionStatus || body?.status || "").toUpperCase();
  const rc = String(body?.response_code || body?.responseCode || "");

  let newStatus: string | null = null;
  if (["SUCCESS", "SETTLED", "COMPLETED"].includes(tStatus) || rc.startsWith("200")) newStatus = "success";
  else if (["FAILED", "REJECTED", "REVERSED", "CANCELLED"].includes(tStatus) || rc.startsWith("40") || rc.startsWith("50")) newStatus = "failed";
  else if (["PROCESSING", "PENDING"].includes(tStatus) || rc.startsWith("202")) newStatus = "processing";

  if (partnerRef && newStatus) {
    const patch: any = {
      disbursement_status: newStatus,
      disbursement_response: body,
      disbursement_callback_at: new Date().toISOString(),
      doku_reference_id: refNo || undefined,
    };
    if (newStatus === "success") {
      patch.status = "paid";
      patch.paid_at = new Date().toISOString();
    } else if (newStatus === "failed") {
      patch.status = "rejected";
      patch.disbursement_error = body?.response_message || body?.message || "Disbursement gagal";
    }
    await admin.from("spp_settlements")
      .update(patch)
      .eq("doku_partner_reference_no", partnerRef);
  }

  return new Response(JSON.stringify({ ok: true, received: true, mapped_status: newStatus }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
