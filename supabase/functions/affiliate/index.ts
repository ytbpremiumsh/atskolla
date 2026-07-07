import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64Encode } from "https://deno.land/std@0.168.0/encoding/base64.ts";
import { corsHeaders } from "../_shared/cors.ts";


function respond(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!.slice(0, 16));
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64Encode(new Uint8Array(hash));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const body = await req.json();
    const { action } = body;

    // ===== REGISTER =====
    if (action === 'register') {
      const { email, password, full_name, phone, custom_code } = body;
      if (!email || !password || !full_name) {
        return respond({ error: 'Email, password, dan nama lengkap wajib diisi' }, 400);
      }
      if (password.length < 6) {
        return respond({ error: 'Password minimal 6 karakter' }, 400);
      }

      // Check duplicate email
      const { data: existing } = await supabaseAdmin
        .from('affiliates')
        .select('id')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();
      if (existing) return respond({ error: 'Email sudah terdaftar sebagai affiliate' }, 400);

      // Generate or validate custom code
      let code = custom_code?.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
      if (!code || code.length < 3) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        code = 'AFF-';
        for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
      } else {
        code = 'AFF-' + code;
      }

      // Check code uniqueness
      const { data: codeExists } = await supabaseAdmin
        .from('affiliates')
        .select('id')
        .eq('affiliate_code', code)
        .maybeSingle();
      if (codeExists) return respond({ error: 'Kode affiliate sudah digunakan, coba kode lain' }, 400);

      const passwordHash = await hashPassword(password);

      const { data: affiliate, error } = await supabaseAdmin
        .from('affiliates')
        .insert({
          email: email.toLowerCase().trim(),
          password_hash: passwordHash,
          full_name: full_name.trim(),
          phone: phone || null,
          affiliate_code: code,
        })
        .select('id, affiliate_code')
        .single();

      if (error) return respond({ error: error.message }, 400);
      return respond({ success: true, affiliate_code: affiliate.affiliate_code, id: affiliate.id });
    }

    // ===== LOGIN =====
    if (action === 'login') {
      const { email, password } = body;
      if (!email || !password) return respond({ error: 'Email dan password wajib diisi' }, 400);

      const passwordHash = await hashPassword(password);
      const { data: affiliate } = await supabaseAdmin
        .from('affiliates')
        .select('*')
        .eq('email', email.toLowerCase().trim())
        .eq('password_hash', passwordHash)
        .maybeSingle();

      if (!affiliate) return respond({ error: 'Email atau password salah' }, 401);
      if (affiliate.status !== 'active') return respond({ error: 'Akun affiliate tidak aktif' }, 403);

      return respond({ success: true, affiliate });
    }

    // ===== GET DASHBOARD =====
    if (action === 'dashboard') {
      const { affiliate_id } = body;
      if (!affiliate_id) return respond({ error: 'affiliate_id required' }, 400);

      const [affiliateRes, commissionsRes, withdrawalsRes] = await Promise.all([
        supabaseAdmin.from('affiliates').select('*').eq('id', affiliate_id).single(),
        supabaseAdmin.from('affiliate_commissions').select('*').eq('affiliate_id', affiliate_id).order('created_at', { ascending: false }).limit(50),
        supabaseAdmin.from('affiliate_withdrawals').select('*').eq('affiliate_id', affiliate_id).order('created_at', { ascending: false }).limit(50),
      ]);

      return respond({
        success: true,
        affiliate: affiliateRes.data,
        commissions: commissionsRes.data || [],
        withdrawals: withdrawalsRes.data || [],
      });
    }

    // ===== REQUEST WITHDRAWAL =====
    if (action === 'withdraw') {
      const { affiliate_id, amount, bank_name, account_number, account_holder } = body;
      if (!affiliate_id || !amount || !bank_name || !account_number || !account_holder) {
        return respond({ error: 'Semua field wajib diisi' }, 400);
      }
      if (amount < 500000) return respond({ error: 'Minimum pencairan Rp 500.000' }, 400);

      const { data: aff } = await supabaseAdmin
        .from('affiliates')
        .select('current_balance')
        .eq('id', affiliate_id)
        .single();

      if (!aff || aff.current_balance < amount) {
        return respond({ error: 'Saldo tidak mencukupi' }, 400);
      }

      // Check pending withdrawal
      const { data: pending } = await supabaseAdmin
        .from('affiliate_withdrawals')
        .select('id')
        .eq('affiliate_id', affiliate_id)
        .eq('status', 'pending')
        .maybeSingle();
      if (pending) return respond({ error: 'Masih ada request pencairan yang pending' }, 400);

      const { error } = await supabaseAdmin
        .from('affiliate_withdrawals')
        .insert({ affiliate_id, amount, bank_name, account_number, account_holder });

      if (error) return respond({ error: error.message }, 400);

      // Deduct balance
      await supabaseAdmin
        .from('affiliates')
        .update({
          current_balance: aff.current_balance - amount,
          total_withdrawn: (await supabaseAdmin.from('affiliates').select('total_withdrawn').eq('id', affiliate_id).single()).data!.total_withdrawn + amount,
        })
        .eq('id', affiliate_id);

      return respond({ success: true });
    }

    // ===== UPDATE PROFILE =====
    if (action === 'update_profile') {
      const { affiliate_id, full_name, phone, custom_code, current_password, new_password } = body;
      if (!affiliate_id) return respond({ error: 'affiliate_id required' }, 400);

      const updates: any = {};
      if (full_name) updates.full_name = full_name.trim();
      if (phone !== undefined) updates.phone = phone || null;

      if (custom_code) {
        const code = 'AFF-' + custom_code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
        const { data: codeExists } = await supabaseAdmin
          .from('affiliates')
          .select('id')
          .eq('affiliate_code', code)
          .neq('id', affiliate_id)
          .maybeSingle();
        if (codeExists) return respond({ error: 'Kode sudah digunakan' }, 400);
        updates.affiliate_code = code;
      }

      if (new_password) {
        if (!current_password) return respond({ error: 'Password lama wajib diisi' }, 400);
        const oldHash = await hashPassword(current_password);
        const { data: check } = await supabaseAdmin
          .from('affiliates')
          .select('id')
          .eq('id', affiliate_id)
          .eq('password_hash', oldHash)
          .maybeSingle();
        if (!check) return respond({ error: 'Password lama salah' }, 400);
        updates.password_hash = await hashPassword(new_password);
      }

      if (Object.keys(updates).length > 0) {
        await supabaseAdmin.from('affiliates').update(updates).eq('id', affiliate_id);
      }

      return respond({ success: true });
    }

    // ===== VALIDATE CODE (for registration page) =====
    if (action === 'validate_code') {
      const { code } = body;
      if (!code) return respond({ error: 'Code required' }, 400);
      const { data } = await supabaseAdmin
        .from('affiliates')
        .select('id, affiliate_code, full_name')
        .eq('affiliate_code', code.toUpperCase())
        .eq('status', 'active')
        .maybeSingle();
      return respond({ success: true, valid: !!data, affiliate: data });
    }

    return respond({ error: 'Invalid action' }, 400);
  } catch (error) {
    return respond({ error: error.message }, 500);
  }
});
