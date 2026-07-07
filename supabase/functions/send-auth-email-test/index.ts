import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const SITE_NAME = 'ATSkolla'
const ROOT_DOMAIN = 'atskolla.com'
const SENDER_DOMAIN = 'notify.atskolla.com'
const FROM_DOMAIN = 'atskolla.com'

const SUBJECT_FALLBACK: Record<string, string> = {
  signup: 'Confirm your email',
  invite: "You've been invited",
  magiclink: 'Your login link',
  recovery: 'Reset your password',
  email_change: 'Confirm your new email',
  reauthentication: 'Your verification code',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Verify caller is super admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401)

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: hasRole } = await admin.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'super_admin',
    })
    if (!hasRole) return json({ error: 'Forbidden' }, 403)

    const body = await req.json().catch(() => ({}))
    const type = String(body.type || '').trim()
    const to = String(body.to || '').trim()
    if (!type || !to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      return json({ error: 'type dan email tujuan wajib diisi' }, 400)
    }

    const { data: tpl, error: tplErr } = await admin
      .from('auth_email_templates')
      .select('subject, html, sender_name')
      .eq('type', type)
      .maybeSingle()
    if (tplErr) return json({ error: tplErr.message }, 500)
    if (!tpl || !tpl.html) return json({ error: 'Template belum tersedia' }, 404)

    const vars: Record<string, string> = {
      site_name: SITE_NAME,
      site_url: `https://${ROOT_DOMAIN}`,
      recipient: to,
      email: to,
      confirmation_url: `https://${ROOT_DOMAIN}/verify?token=TEST_${Date.now()}`,
      token: '123456',
      old_email: to,
      new_email: to,
    }
    const replace = (s: string) =>
      s.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, k) => vars[String(k).toLowerCase()] ?? '')

    const subject = '[TEST] ' + replace(tpl.subject || SUBJECT_FALLBACK[type] || 'Notification')
    const senderName = tpl.sender_name || SITE_NAME
    const html = replace(tpl.html)
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

    const messageId = crypto.randomUUID()

    await admin.from('email_send_log').insert({
      message_id: messageId,
      template_name: `${type}_test`,
      recipient_email: to,
      status: 'pending',
    })

    const { error: qErr } = await admin.rpc('enqueue_email', {
      queue_name: 'auth_emails',
      payload: {
        run_id: `test_${messageId}`,
        message_id: messageId,
        to,
        from: `${senderName} <noreply@${FROM_DOMAIN}>`,
        sender_domain: SENDER_DOMAIN,
        subject,
        html,
        text,
        purpose: 'transactional',
        label: `${type}_test`,
        queued_at: new Date().toISOString(),
      },
    })
    if (qErr) {
      await admin.from('email_send_log').insert({
        message_id: messageId,
        template_name: `${type}_test`,
        recipient_email: to,
        status: 'failed',
        error_message: qErr.message,
      })
      return json({ error: 'Gagal enqueue email: ' + qErr.message }, 500)
    }

    return json({ success: true, message_id: messageId }, 200)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return json({ error: msg }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
