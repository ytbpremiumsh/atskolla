// Deploy together with migration 20261016000000_doku_payment_reconciliation.sql.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyDokuWebhook, dokuStatus, isDokuPaid } from "../_shared/doku.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, client-id, request-id, request-timestamp, signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { success: false, error: "method_not_allowed" });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const rawBody = await req.text();
    let payload: any;
    try { payload = JSON.parse(rawBody); }
    catch { return reply(400, { success: false, error: "invalid_json" }); }
    const { data, error } = await admin.from("platform_settings").select("key,value")
      .in("key", ["doku_client_id", "doku_secret_key"]);
    if (error) throw error;
    const cfg = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
    const clientId = cfg.doku_client_id || Deno.env.get("DOKU_CLIENT_ID") || "";
    const secretKey = cfg.doku_secret_key || Deno.env.get("DOKU_SECRET_KEY") || "";
    if (!clientId || !secretKey) return reply(503, { success: false, error: "gateway_not_configured" });
    const signatureOk = verifyDokuWebhook(req, rawBody, { clientId, secretKey });
    const order = payload?.order?.invoice_number || payload?.response?.order?.invoice_number;
    const status = dokuStatus(payload);
    const { error: logError } = await admin.from("spp_logs").insert({
      school_id: null, invoice_id: null, event_type: "doku_webhook",
      status: signatureOk ? "received" : "sig_mismatch",
      payload: { body: payload, headers: {
        "client-id": req.headers.get("client-id"), "request-id": req.headers.get("request-id"),
        "request-timestamp": req.headers.get("request-timestamp"),
      } },
      message: `invoice=${order || "-"} status=${status || "-"}`,
    });
    if (logError) throw logError;
    // Fail closed. Never disable verification to make a payment appear paid.
    if (!signatureOk) return reply(403, { success: false, error: "invalid_signature" });
    if (!order) return reply(400, { success: false, error: "missing_invoice_number" });
    if (!isDokuPaid(status)) return reply(200, { success: true, ignored: status });
    const { data: settlement, error: settlementError } = await admin.rpc("settle_verified_doku_payment", {
      p_order: order, p_payload: payload,
    });
    if (settlementError) throw settlementError;
    return reply(200, { success: true, ...settlement });
  } catch (error) {
    console.error("DOKU webhook processing failed", error);
    // Failed writes/missing mappings must remain retriable instead of acknowledging success.
    return reply(503, { success: false, error: "payment_processing_failed" });
  }
});
