import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";


serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized');

    const token = authHeader.replace('Bearer ', '');
    
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) throw new Error('Unauthorized');
    const userId = claimsData.claims.sub;

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Check super_admin role
    const { data: hasRole } = await supabaseAdmin.rpc('has_role', { _user_id: userId, _role: 'super_admin' });
    if (!hasRole) throw new Error('Forbidden: Super admin only');

    const { action, api_key } = await req.json();

    if (action === 'get') {
      // Return masked key from platform_settings
      const { data } = await supabaseAdmin
        .from('platform_settings')
        .select('value')
        .eq('key', 'mayar_api_key')
        .maybeSingle();
      
      const key = data?.value || '';
      const masked = key ? key.substring(0, 8) + '••••••••' + key.substring(key.length - 4) : '';
      return new Response(JSON.stringify({ has_key: !!key, masked_key: masked }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'set') {
      if (!api_key) throw new Error('api_key is required');
      
      // Upsert into platform_settings
      const { data: existing } = await supabaseAdmin
        .from('platform_settings')
        .select('id')
        .eq('key', 'mayar_api_key')
        .maybeSingle();

      if (existing) {
        await supabaseAdmin.from('platform_settings')
          .update({ value: api_key, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabaseAdmin.from('platform_settings')
          .insert({ key: 'mayar_api_key', value: api_key });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid action');
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
