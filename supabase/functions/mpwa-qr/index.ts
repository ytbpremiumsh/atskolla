import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";


const MPWA_BASE = 'https://app.ayopintar.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { action, school_id, sender } = await req.json();

    if (!action || !school_id) {
      return new Response(JSON.stringify({ error: 'action and school_id are required' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Resolve API Key
    let finalApiKey = '';
    const { data: integration } = await supabaseAdmin
      .from('school_integrations')
      .select('mpwa_api_key, mpwa_sender')
      .eq('school_id', school_id)
      .eq('integration_type', 'onesender')
      .maybeSingle();

    finalApiKey = integration?.mpwa_api_key || '';

    if (!finalApiKey) {
      const { data: ps } = await supabaseAdmin
        .from('platform_settings').select('value')
        .eq('key', 'mpwa_platform_api_key').maybeSingle();
      if (ps?.value) finalApiKey = ps.value;
    }

    if (!finalApiKey) {
      return new Response(JSON.stringify({ error: 'MPWA API Key belum dikonfigurasi. Hubungi administrator.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const finalSender = sender || integration?.mpwa_sender || '';

    const safeJson = async (res: Response) => {
      const text = await res.text();
      try { return JSON.parse(text); }
      catch { 
        console.error('Non-JSON response:', text.substring(0, 200));
        return { status: false, msg: 'Invalid API response' };
      }
    };

    const isConnected = (data: any) =>
      data?.msg === 'Device already connected!' ||
      data?.msg === 'Perangkat sudah terhubung!';

    const markConnected = async (connected: boolean) => {
      await supabaseAdmin.from('school_integrations')
        .update({ mpwa_connected: connected })
        .eq('school_id', school_id)
        .eq('integration_type', 'onesender');
    };

    // ═══ CONNECT: Save sender + Generate QR (device auto-registered by MPWA) ═══
    if (action === 'connect') {
      if (!finalSender) {
        return new Response(JSON.stringify({ error: 'Nomor WhatsApp (sender) harus diisi terlebih dahulu' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Save sender number and set gateway type
      await supabaseAdmin.from('school_integrations')
        .update({ mpwa_sender: finalSender, gateway_type: 'mpwa' })
        .eq('school_id', school_id)
        .eq('integration_type', 'onesender');

      console.log(`Connecting device: ${finalSender}`);

      // Generate QR — MPWA auto-registers the device when generating QR
      const qrUrl = `${MPWA_BASE}/generate-qr?api_key=${encodeURIComponent(finalApiKey)}&device=${encodeURIComponent(finalSender)}`;
      const res = await fetch(qrUrl);
      const data = await safeJson(res);
      console.log('Generate QR result:', JSON.stringify(data).substring(0, 200));

      if (isConnected(data)) {
        await markConnected(true);
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══ POLL: Check connection status ═══
    if (action === 'poll-status') {
      if (!finalSender) {
        return new Response(JSON.stringify({ connected: false }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const qrUrl = `${MPWA_BASE}/generate-qr?api_key=${encodeURIComponent(finalApiKey)}&device=${encodeURIComponent(finalSender)}`;
      const res = await fetch(qrUrl);
      const data = await safeJson(res);

      if (isConnected(data)) {
        await markConnected(true);
      }

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ═══ DISCONNECT ═══
    if (action === 'disconnect') {
      if (!finalSender) {
        return new Response(JSON.stringify({ error: 'Sender tidak ditemukan' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const res = await fetch(`${MPWA_BASE}/logout-device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: finalApiKey, sender: finalSender }),
      });
      const data = await safeJson(res);
      await markConnected(false);

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('MPWA QR error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
