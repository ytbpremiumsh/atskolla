import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";


const MPWA_SEND_URL = 'https://app.ayopintar.com/send-message';
const MPWA_BUTTON_URL = 'https://app.ayopintar.com/send-button';

/**
 * Detect if a message should be sent as a button message.
 * Returns button payload spec or null.
 */
const detectButtons = (message: string, messageType?: string): {
  buttons: Array<Record<string, any>>;
  footer?: string;
  imageUrl?: string;
} | null => {
  const IMG_PAID = 'https://bohuglednqirnaearrkj.supabase.co/storage/v1/object/public/landing-assets/wa-spp-berhasil.jpg';
  const IMG_INVOICE = 'https://bohuglednqirnaearrkj.supabase.co/storage/v1/object/public/landing-assets/wa-tagihan-spp.jpg';

  // 2) SPP / payment link — cari URL pertama dalam pesan
  const urlMatch = message.match(/https?:\/\/[^\s)]+/);
  if (urlMatch) {
    const url = urlMatch[0].replace(/[.,)]+$/, '');
    const isSpp = messageType === 'spp_invoice' || messageType === 'spp_reminder' || /spp|tagihan|invoice/i.test(message);
    const isPayment = isSpp || /mayar\.|payment|bayar/i.test(url) || /bayar/i.test(message);
    if (isPayment) {
      return {
        buttons: [{ type: 'url', displayText: 'Bayar SPP Sekarang', url }],
        footer: 'ATSkolla - Platform Digital Sekolah',
        imageUrl: IMG_INVOICE,
      };
    }
  }

  // 3) SPP Lunas — tidak ada URL, tetap kirim sebagai button supaya footer aktif
  if (messageType === 'spp_paid') {
    return {
      buttons: [{ type: 'url', displayText: 'Lihat Riwayat Pembayaran', url: 'https://atskolla.com/parent' }],
      footer: 'ATSkolla - Platform Digital Sekolah',
      imageUrl: IMG_PAID,
    };
  }

  return null;
};

/**
 * Send a button message via MPWA /send-button endpoint.
 */
const sendMpwaButton = async (
  apiKey: string,
  sender: string,
  recipient: string,
  message: string,
  buttons: Array<Record<string, any>>,
  footer?: string,
  imageUrl?: string,
): Promise<{ ok: boolean; data: any }> => {
  const payload: Record<string, any> = {
    api_key: apiKey,
    sender,
    number: recipient,
    message,
    // MPWA /send-button mewajibkan parameter image walau hanya berupa URL gambar header
    image: imageUrl || 'https://bohuglednqirnaearrkj.supabase.co/storage/v1/object/public/landing-assets/atskolla-wa-header.png',
    button: buttons.slice(0, 5),
  };
  if (footer) payload.footer = footer;
  console.log(`MPWA send-button | sender:${sender} | to:${recipient} | btns:${buttons.length}`);
  try {
    const r = await fetch(MPWA_BUTTON_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const text = await r.text();
    const parsed = parseJsonSafely(text);
    console.log(`MPWA send-button response: status=${r.status} body=${text.substring(0, 300)}`);
    return { ok: r.ok && parsed?.status !== false, data: parsed };
  } catch (err) {
    return { ok: false, data: { status: false, msg: String(err) } };
  }
};

const parseJsonSafely = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    return { status: false, msg: 'Invalid response', raw: text.substring(0, 200) };
  }
};

const formatPhoneNumber = (value: string) => {
  let formatted = value.replace(/\D/g, '');
  if (formatted.startsWith('0')) {
    formatted = '62' + formatted.substring(1);
  }
  return formatted;
};

/**
 * Send a message via MPWA /send-message endpoint.
 * Works for both personal numbers and group IDs.
 * Group IDs should be in format like "120363401633740599@g.us"
 */
const sendMpwaMessage = async (
  apiKey: string,
  sender: string,
  recipient: string,
  message: string,
  isGroup: boolean = false,
): Promise<{ ok: boolean; data: any }> => {
  console.log(`MPWA send | sender: ${sender} | recipient: ${recipient} | isGroup: ${isGroup} | msg_len: ${message.length}`);

  const tryPost = async (payload: Record<string, any>): Promise<{ ok: boolean; data: any; status: number }> => {
    try {
      const response = await fetch(MPWA_SEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      const parsed = parseJsonSafely(text);
      console.log(`MPWA POST response: status=${response.status} body=${text.substring(0, 300)}`);
      return { ok: response.ok && parsed?.status !== false, data: parsed, status: response.status };
    } catch (err) {
      return { ok: false, data: { status: false, msg: String(err) }, status: 0 };
    }
  };

  try {
    if (isGroup) {
      // Strategy 1: Use 'number' param with group JID (standard approach)
      const r1 = await tryPost({ api_key: apiKey, sender, number: recipient, message });
      if (r1.ok) return { ok: true, data: r1.data };

      // Strategy 2: Use 'chatId' param for group
      console.log('MPWA: trying chatId param for group');
      const r2 = await tryPost({ api_key: apiKey, sender, chatId: recipient, message });
      if (r2.ok) return { ok: true, data: r2.data };

      // Strategy 3: Use 'number' with 'full' flag
      console.log('MPWA: trying number + full=1 for group');
      const r3 = await tryPost({ api_key: apiKey, sender, number: recipient, message, full: 1 });
      if (r3.ok) return { ok: true, data: r3.data };

      return { ok: false, data: r1.data };
    } else {
      // Individual message: standard 'number' param
      const result = await tryPost({ api_key: apiKey, sender, number: recipient, message });
      if (result.ok) return { ok: true, data: result.data };

      // GET fallback for individual
      console.log('MPWA: trying GET fallback for individual');
      const params = new URLSearchParams({ api_key: apiKey, sender, number: recipient, message });
      const getResponse = await fetch(`${MPWA_SEND_URL}?${params.toString()}`);
      const getText = await getResponse.text();
      const getParsed = parseJsonSafely(getText);
      console.log(`MPWA GET response: status=${getResponse.status} body=${getText.substring(0, 300)}`);

      if (getResponse.ok && getParsed?.status !== false) {
        return { ok: true, data: getParsed };
      }

      return { ok: false, data: getParsed };
    }
  } catch (err) {
    console.error(`MPWA send error for ${recipient}:`, err);
    return { ok: false, data: { status: false, msg: String(err) } };
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { phone, message, api_url, api_key, school_id, group_id, student_name, message_type, gateway_type: explicitGateway, gateway, mpwa_api_key, mpwa_sender } = body;

    if ((!phone && !group_id) || !message) {
      return new Response(JSON.stringify({ error: 'phone or group_id, and message are required' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    let finalApiUrl = api_url;
    let finalApiKey = api_key;
    let gatewayType = gateway || explicitGateway || 'onesender';
    let mpwaSenderNum = mpwa_sender || '';

    // If direct MPWA params provided (e.g. from Super Admin test)
    if (gatewayType === 'mpwa' && mpwa_api_key) {
      finalApiKey = mpwa_api_key;
      mpwaSenderNum = mpwa_sender || '';
    }

    // If school_id provided, look up integration settings
    if (school_id && (!finalApiUrl || !finalApiKey)) {
      const { data: integration } = await supabaseAdmin
        .from('school_integrations')
        .select('api_url, api_key, is_active, gateway_type, mpwa_api_key, mpwa_sender')
        .eq('school_id', school_id)
        .eq('integration_type', 'onesender')
        .maybeSingle();

      if (!integration) {
        return new Response(JSON.stringify({ success: false, error: 'WhatsApp integration not configured or inactive' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      gatewayType = integration.gateway_type || 'onesender';

      if (gatewayType === 'mpwa') {
        mpwaSenderNum = integration.mpwa_sender || '';
        finalApiKey = integration.mpwa_api_key || '';

        if (!finalApiKey) {
          const { data: platformKey } = await supabaseAdmin
            .from('platform_settings').select('value')
            .eq('key', 'mpwa_platform_api_key').maybeSingle();
          if (platformKey?.value) finalApiKey = platformKey.value;
        }

        if (!mpwaSenderNum) {
          return new Response(JSON.stringify({ success: false, error: 'MPWA sender belum dikonfigurasi. Scan QR terlebih dahulu.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        finalApiUrl = MPWA_SEND_URL;
      } else {
        finalApiUrl = integration.api_url;
        finalApiKey = integration.api_key;
      }
    }

    if (!finalApiKey) {
      return new Response(JSON.stringify({ error: 'API Key is required' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══ Check WA credits (only when add-on enabled) ═══
    let waCreditAddonEnabled = true;
    {
      const { data: addonFlag } = await supabaseAdmin
        .from('platform_settings').select('value')
        .eq('key', 'addon_wa_credit_enabled').maybeSingle();
      if (addonFlag?.value === 'false' || addonFlag?.value === false) waCreditAddonEnabled = false;
    }

    if (school_id && waCreditAddonEnabled) {
      const messageCount = (phone ? 1 : 0) + (group_id ? 1 : 0);
      const { data: credit } = await supabaseAdmin
        .from('wa_credits')
        .select('balance')
        .eq('school_id', school_id)
        .maybeSingle();

      if (!credit || credit.balance < messageCount) {
        return new Response(JSON.stringify({ success: false, error: 'Kredit WhatsApp tidak mencukupi. Silakan beli kredit tambahan.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const results: { target: string; ok: boolean; data: any }[] = [];

    if (gatewayType === 'mpwa') {
      const buttonSpec = detectButtons(message, message_type);

      if (phone) {
        const formattedPhone = formatPhoneNumber(phone);
        const result = buttonSpec
          ? await sendMpwaButton(finalApiKey, mpwaSenderNum, formattedPhone, message, buttonSpec.buttons, buttonSpec.footer, buttonSpec.imageUrl)
          : await sendMpwaMessage(finalApiKey, mpwaSenderNum, formattedPhone, message);
        // Fallback to plain text if button send fails
        if (!result.ok && buttonSpec) {
          const fallback = await sendMpwaMessage(finalApiKey, mpwaSenderNum, formattedPhone, message);
          results.push({ target: `phone:${formattedPhone}`, ...fallback });
        } else {
          results.push({ target: `phone:${formattedPhone}`, ...result });
        }
      }

      if (group_id) {
        // Buttons not supported for groups in MPWA; always plain text
        const result = await sendMpwaMessage(finalApiKey, mpwaSenderNum, group_id, message, true);
        results.push({ target: `group:${group_id}`, ...result });
      }
    } else {
      // ═══ OneSender Gateway ═══
      if (!finalApiUrl) {
        return new Response(JSON.stringify({ error: 'API URL is required for OneSender' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (phone) {
        const formattedPhone = formatPhoneNumber(phone);
        try {
          const r = await fetch(finalApiUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${finalApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient_type: 'individual', to: formattedPhone, type: 'text', text: { body: message } }),
          });
          const data = parseJsonSafely(await r.text());
          results.push({ target: `phone:${formattedPhone}`, ok: r.ok, data });
        } catch (err) {
          results.push({ target: `phone:${formattedPhone}`, ok: false, data: { error: String(err) } });
        }
      }

      if (group_id) {
        try {
          const r = await fetch(finalApiUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${finalApiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient_type: 'group', to: group_id, type: 'text', text: { body: message } }),
          });
          const data = parseJsonSafely(await r.text());
          results.push({ target: `group:${group_id}`, ok: r.ok, data });
        } catch (err) {
          results.push({ target: `group:${group_id}`, ok: false, data: { error: String(err) } });
        }
      }
    }

    const hasError = results.some(r => !r.ok);

    // Detect MPWA session disconnected (sender logged out)
    const isSessionLost = gatewayType === 'mpwa' && results.some(r => {
      const msg = String(r?.data?.msg || r?.data?.raw || '').toLowerCase();
      return msg.includes('periksa koneksi') || msg.includes('not connected') || msg.includes('disconnect');
    });

    if (isSessionLost && school_id) {
      try {
        await supabaseAdmin
          .from('school_integrations')
          .update({ mpwa_connected: false })
          .eq('school_id', school_id)
          .eq('integration_type', 'onesender');
      } catch { /* ignore */ }
    }

    const friendlyError = isSessionLost
      ? 'Sesi WhatsApp terputus. Silakan scan ulang QR di menu Pengaturan WhatsApp → Gateway.'
      : (hasError ? `${gatewayType} error` : null);

    // Log message to wa_message_logs
    if (school_id) {
      try {
        await supabaseAdmin.from('wa_message_logs').insert({
          school_id,
          phone: phone || null,
          group_id: group_id || null,
          message: (friendlyError ? `[${friendlyError}] ` : '') + message.substring(0, 500),
          message_type: message_type || 'attendance',
          status: hasError ? 'failed' : 'sent',
          student_name: student_name || null,
        });
      } catch { /* ignore logging errors */ }

      // Deduct WA credits on successful send (only if add-on enabled)
      if (!hasError && waCreditAddonEnabled) {
        const messageCount = (phone ? 1 : 0) + (group_id ? 1 : 0);
        try {
          const { data: credit } = await supabaseAdmin
            .from('wa_credits')
            .select('balance, total_used')
            .eq('school_id', school_id)
            .maybeSingle();

          if (credit) {
            await supabaseAdmin.from('wa_credits').update({
              balance: Math.max(0, credit.balance - messageCount),
              total_used: credit.total_used + messageCount,
              updated_at: new Date().toISOString(),
            }).eq('school_id', school_id);
          }
        } catch { /* ignore credit errors */ }
      }
    }

    if (hasError) {
      console.error(`${gatewayType} error:`, JSON.stringify(results));
      return new Response(JSON.stringify({
        success: false,
        error: friendlyError || `${gatewayType} error`,
        session_lost: isSessionLost,
        details: results,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, data: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Send WhatsApp error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
