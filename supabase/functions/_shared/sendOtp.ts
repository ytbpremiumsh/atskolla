// Shared OTP sender — prioritizes Platform MPWA so OTP delivery does not depend
// on a single school's WhatsApp session being healthy.
//
// Order of attempts:
//   1. Platform MPWA sender (mpwa_platform_*)
//   2. School-level MPWA sender (when schoolId is provided)
//   3. School-level OneSender (when schoolId is provided)
//   4. Any active OneSender integration (last-resort fallback)
//
// Returns { ok, gateway, raw } for logging/diagnostics.

const MPWA_URL = "https://atskollagateway.my.id/send-message";

export type OtpSendResult = {
  ok: boolean;
  gateway: string;
  raw?: any;
};

function formatPhone(phone: string): string {
  let p = (phone || "").replace(/\D/g, "");
  if (p.startsWith("0")) p = "62" + p.substring(1);
  if (p.startsWith("8")) p = "62" + p;
  return p;
}

async function tryMpwa(apiKey: string, sender: string, phone: string, message: string): Promise<OtpSendResult> {
  try {
    const res = await fetch(MPWA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey, sender, number: phone, message }),
    });
    const text = await res.text();
    let data: any;
    try { data = JSON.parse(text); } catch { data = { status: false, raw: text.substring(0, 200) }; }
    const ok = res.ok && data?.status !== false;
    return { ok, gateway: `mpwa:${sender}`, raw: data };
  } catch (e) {
    return { ok: false, gateway: `mpwa:${sender}`, raw: { error: String(e) } };
  }
}

async function tryOneSender(apiUrl: string, apiKey: string, phone: string, message: string): Promise<OtpSendResult> {
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ recipient_type: "individual", to: phone, type: "text", text: { body: message } }),
    });
    const text = await res.text();
    let data: any; try { data = JSON.parse(text); } catch { data = { raw: text.substring(0, 200) }; }
    return { ok: res.ok, gateway: `onesender:${apiUrl}`, raw: data };
  } catch (e) {
    return { ok: false, gateway: `onesender:${apiUrl}`, raw: { error: String(e) } };
  }
}

/**
 * Send a critical OTP message.
 * @param admin Supabase service-role client
 * @param phone Raw phone (any common format)
 * @param message Message body
 * @param schoolId Optional school context for fallback
 */
export async function sendOtpMessage(
  admin: any,
  phone: string,
  message: string,
  schoolId?: string | null,
): Promise<OtpSendResult> {
  const formatted = formatPhone(phone);
  const attempts: OtpSendResult[] = [];

  // 1) Platform MPWA — preferred for OTP
  try {
    const { data: settings } = await admin
      .from("platform_settings")
      .select("key,value")
      .in("key", ["mpwa_platform_api_key", "mpwa_platform_sender", "mpwa_platform_connected"]);
    const ps: Record<string, string> = {};
    (settings || []).forEach((s: any) => { ps[s.key] = s.value; });
    if (ps.mpwa_platform_connected === "true" && ps.mpwa_platform_api_key && ps.mpwa_platform_sender) {
      const r = await tryMpwa(ps.mpwa_platform_api_key, ps.mpwa_platform_sender, formatted, message);
      attempts.push(r);
      if (r.ok) return r;
    }
  } catch (e) {
    attempts.push({ ok: false, gateway: "platform-mpwa-lookup", raw: { error: String(e) } });
  }

  // 2 & 3) School-level integration
  if (schoolId) {
    try {
      const { data: intData } = await admin
        .from("school_integrations")
        .select("api_url, api_key, is_active, gateway_type, mpwa_api_key, mpwa_sender, mpwa_connected")
        .eq("school_id", schoolId)
        .eq("integration_type", "onesender")
        .maybeSingle();

      if (intData?.is_active) {
        if (intData.gateway_type === "mpwa" && intData.mpwa_connected && intData.mpwa_sender) {
          let apiKey: string = intData.mpwa_api_key || "";
          if (!apiKey) {
            const { data: ps } = await admin
              .from("platform_settings").select("value").eq("key", "mpwa_platform_api_key").maybeSingle();
            if (ps?.value) apiKey = ps.value;
          }
          if (apiKey) {
            const r = await tryMpwa(apiKey, intData.mpwa_sender, formatted, message);
            attempts.push(r);
            if (r.ok) return r;
          }
        }
        if (intData.api_url && intData.api_key) {
          const r = await tryOneSender(intData.api_url, intData.api_key, formatted, message);
          attempts.push(r);
          if (r.ok) return r;
        }
      }
    } catch (e) {
      attempts.push({ ok: false, gateway: "school-integration-lookup", raw: { error: String(e) } });
    }
  }

  // 4) Last-resort: any active OneSender
  try {
    const { data: fallback } = await admin
      .from("school_integrations")
      .select("api_url, api_key")
      .eq("integration_type", "onesender")
      .eq("is_active", true)
      .not("api_url", "is", null)
      .not("api_key", "is", null)
      .limit(1)
      .maybeSingle();
    if (fallback?.api_url && fallback?.api_key) {
      const r = await tryOneSender(fallback.api_url, fallback.api_key, formatted, message);
      attempts.push(r);
      if (r.ok) return r;
    }
  } catch (e) {
    attempts.push({ ok: false, gateway: "fallback-onesender-lookup", raw: { error: String(e) } });
  }

  return {
    ok: false,
    gateway: "none",
    raw: { attempts: attempts.map((a) => ({ gateway: a.gateway, raw: a.raw })) },
  };
}
