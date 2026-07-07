// iPaymu Notification (Callback) webhook.
// Register in iPaymu Dashboard → Integrations → URL Notify:
//   https://<project-ref>.functions.supabase.co/ipaymu-webhook
//
// iPaymu POSTs application/x-www-form-urlencoded fields, notably:
//   trx_id, sid (SessionID), reference_id, status_code, status,
//   amount, via, channel, paid_off, ...
// See https://ipaymu.com/dokumentasi/ for full field list.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function isPaidStatus(codeOrText: unknown) {
  const s = String(codeOrText || "").toLowerCase();
  return ["1", "berhasil", "success", "paid", "settled", "successful"].includes(s);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const ok = (data: any) => new Response(JSON.stringify({ success: true, ...data }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const contentType = (req.headers.get("content-type") || "").toLowerCase();
    let payload: Record<string, any> = {};
    if (contentType.includes("application/json")) {
      payload = await req.json().catch(() => ({}));
    } else {
      const form = await req.formData().catch(() => null);
      if (form) {
        for (const [k, v] of form.entries()) payload[k] = typeof v === "string" ? v : String(v);
      } else {
        // Fallback: try urlencoded raw parse
        const raw = await req.text();
        try {
          const params = new URLSearchParams(raw);
          params.forEach((v, k) => { payload[k] = v; });
        } catch { /* ignore */ }
      }
    }

    const sid = payload.sid || payload.SessionID || payload.session_id || null;
    const trxId = payload.trx_id || payload.TransactionId || null;
    const referenceId = payload.reference_id || payload.referenceId || null;
    const statusCode = payload.status_code ?? payload.StatusCode ?? null;
    const statusText = payload.status ?? payload.Status ?? null;

    await admin.from("spp_logs").insert({
      school_id: null,
      invoice_id: null,
      event_type: "ipaymu_webhook",
      status: "received",
      payload: { headers: Object.fromEntries(req.headers), body: payload },
      message: `sid=${sid || "-"} trx=${trxId || "-"} ref=${referenceId || "-"} status=${statusText || statusCode || "-"}`,
    });

    const paid = isPaidStatus(statusCode) || isPaidStatus(statusText);
    if (!paid) return ok({ ignored: `status=${statusText || statusCode}` });

    // We stored SessionID (or fallback referenceId) as mayar_invoice_id when creating.
    const candidates = [sid, referenceId, trxId].filter(Boolean) as string[];
    let inv: any = null;
    for (const c of candidates) {
      const { data } = await admin
        .from("spp_invoices")
        .select("id, school_id, status")
        .eq("mayar_invoice_id", c)
        .maybeSingle();
      if (data) { inv = data; break; }
    }
    if (!inv) return ok({ ignored: "invoice not found", candidates });
    if (inv.status === "paid") return ok({ already: true });

    const paidAt = new Date().toISOString();
    await admin.from("spp_invoices")
      .update({ status: "paid", paid_at: paidAt, payment_method: "ipaymu" })
      .eq("id", inv.id);
    await admin.from("payment_transactions")
      .update({ status: "paid", paid_at: paidAt })
      .eq("school_id", inv.school_id)
      .in("mayar_transaction_id", candidates)
      .eq("status", "pending");
    await admin.from("spp_logs").insert({
      school_id: inv.school_id, invoice_id: inv.id,
      event_type: "ipaymu_webhook_paid",
      status: "paid",
      payload, message: "SPP paid (iPaymu webhook)",
    });

    return ok({ marked_paid: true, invoice_id: inv.id });
  } catch (e: any) {
    console.error("ipaymu-webhook error:", e);
    return ok({ error: e?.message || "internal" });
  }
});
