import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handlePreflight } from "../_shared/cors.ts";
import { getAdminClient } from "../_shared/supabaseAdmin.ts";

serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;

  try {
    const supabaseAdmin = getAdminClient();

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) throw new Error('Unauthorized');

    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id);

    const callerRoles = (roles || []).map(r => r.role);
    if (!callerRoles.includes('school_admin') && !callerRoles.includes('super_admin')) {
      throw new Error('Insufficient permissions');
    }

    const { user_id, full_name, email, password, phone, nip, position, roles: roles_wanted } = await req.json();
    if (!user_id) throw new Error('user_id is required');

    // Cross-tenant guard: school_admin only allowed to update users within own school
    if (callerRoles.includes('school_admin') && !callerRoles.includes('super_admin')) {
      const [{ data: callerProfile }, { data: targetProfile }] = await Promise.all([
        supabaseAdmin.from('profiles').select('school_id').eq('user_id', caller.id).maybeSingle(),
        supabaseAdmin.from('profiles').select('school_id').eq('user_id', user_id).maybeSingle(),
      ]);
      if (!callerProfile?.school_id || callerProfile.school_id !== targetProfile?.school_id) {
        throw new Error('Forbidden: cannot edit user from different school');
      }
    }

    // Update profile name, phone, nip, position if provided
    const profileUpdate: Record<string, string | null> = {};
    if (full_name) profileUpdate.full_name = full_name;
    if (phone !== undefined) profileUpdate.phone = phone || null;
    if (nip !== undefined) profileUpdate.nip = nip || null;
    if (position !== undefined) profileUpdate.position = position || null;
    
    if (Object.keys(profileUpdate).length > 0) {
      const { error: profileError } = await supabaseAdmin.from('profiles').update(profileUpdate).eq('user_id', user_id);
      if (profileError) {
        console.error('Profile update error:', profileError);
      }
    }

    // Update auth user (email, password) if provided - skip phone to avoid E.164 issues
    const authUpdate: Record<string, any> = {};
    if (email) {
      authUpdate.email = email;
      authUpdate.email_confirm = true;
    }
    if (password && password.length >= 6) authUpdate.password = password;

    if (Object.keys(authUpdate).length > 0) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, authUpdate);
      if (updateError) {
        console.error('Auth update error:', JSON.stringify(updateError));
        throw new Error(updateError.message || 'Gagal update auth user');
      }
    }

    // Sinkronisasi peran (role) — dilakukan di server agar tidak gagal diam-diam
    if (Array.isArray(roles_wanted)) {
      const ALLOWED = ['staff', 'teacher', 'bendahara', 'principal'];
      const wanted = roles_wanted.filter((r: string) => ALLOWED.includes(r));
      if (wanted.length === 0) throw new Error('Minimal pilih satu role');
      const { data: cur } = await supabaseAdmin.from('user_roles').select('role').eq('user_id', user_id);
      const current = (cur || []).map((r: any) => r.role as string);
      const toAdd = wanted.filter((r: string) => !current.includes(r));
      const toRemove = current.filter((r) => ALLOWED.includes(r) && !wanted.includes(r));
      if (toAdd.length) {
        const { error } = await supabaseAdmin.from('user_roles').insert(toAdd.map((role: string) => ({ user_id, role })));
        if (error) throw new Error('Gagal menambah role: ' + error.message);
      }
      if (toRemove.length) {
        const { error } = await supabaseAdmin.from('user_roles').delete().eq('user_id', user_id).in('role', toRemove);
        if (error) throw new Error('Gagal menghapus role: ' + error.message);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('update-user error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
