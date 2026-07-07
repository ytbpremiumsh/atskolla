import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";


type EventType = "register" | "spp_paid" | "broadcast" | "test";

interface SendPayload {
  event_type: EventType;
  to: string | string[];
  // Variables for template substitution
  vars?: Record<string, string>;
  // For broadcast / test, allow direct override
  subject_override?: string;
  html_override?: string;
  school_id?: string | null;
}

function applyVars(tpl: string, vars: Record<string, string> = {}) {
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const body = (await req.json()) as SendPayload;
    if (!body?.event_type || !body?.to) {
      return new Response(JSON.stringify({ success: false, error: "event_type and to are required" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await admin
      .from("email_settings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!settings || !settings.is_active) {
      return new Response(JSON.stringify({ success: false, error: "Email settings not configured or inactive" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.event_type === "register" && !settings.send_on_register) {
      return new Response(JSON.stringify({ success: false, skipped: true, error: "register email disabled" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.event_type === "spp_paid" && !settings.send_on_spp_paid) {
      return new Response(JSON.stringify({ success: false, skipped: true, error: "spp_paid email disabled" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subject = body.subject_override || "";
    let html = body.html_override || "";
    if (!subject || !html) {
      if (body.event_type === "register") {
        subject = applyVars(settings.template_register_subject, body.vars);
        html = applyVars(settings.template_register_html, body.vars);
      } else if (body.event_type === "spp_paid") {
        subject = applyVars(settings.template_spp_subject, body.vars);
        html = applyVars(settings.template_spp_html, body.vars);
      } else if (body.event_type === "test") {
        subject = "Tes Email — ATSkolla";
        html = `<p>Email server berhasil dikonfigurasi. Waktu: ${new Date().toLocaleString("id-ID")}</p>`;
      } else {
        return new Response(JSON.stringify({ success: false, error: "subject/html required for broadcast" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const recipients = Array.isArray(body.to) ? body.to : [body.to];

    const client = new SMTPClient({
      connection: {
        hostname: settings.smtp_host,
        port: settings.smtp_port,
        tls: settings.smtp_secure,
        auth: { username: settings.smtp_username, password: settings.smtp_password },
      },
    });

    let okCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const to of recipients) {
      try {
        await client.send({
          from: `${settings.from_name} <${settings.from_email}>`,
          to,
          subject,
          html,
          content: html.replace(/<[^>]+>/g, ""),
        });
        okCount++;
        await admin.from("email_logs").insert({
          to_email: to, subject, event_type: body.event_type, status: "sent",
          school_id: body.school_id ?? null,
        });
      } catch (e: any) {
        failCount++;
        errors.push(`${to}: ${e?.message || e}`);
        await admin.from("email_logs").insert({
          to_email: to, subject, event_type: body.event_type, status: "failed",
          error: String(e?.message || e), school_id: body.school_id ?? null,
        });
      }
    }

    try { await client.close(); } catch { /* ignore */ }

    return new Response(JSON.stringify({ success: failCount === 0, sent: okCount, failed: failCount, errors }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("send-email error", e);
    return new Response(JSON.stringify({ success: false, error: String(e?.message || e) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
