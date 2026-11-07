import { backupManifest, exportApplicationData, restoreOrder } from "../_shared/backup.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Verify caller is super_admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).eq('role', 'super_admin').maybeSingle()
    if (!roleData) {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden: super_admin only' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const body = await req.json()
    const { action } = body

    const manifest = await backupManifest(supabase)
    const tables = manifest.map(t => t.table_name)

    if (action === 'export') {
      const {backup,meta} = await exportApplicationData(supabase)
      const {error: recordError} = await supabase.from('platform_settings').upsert([
        {key:'last_backup_at', value:meta.exported_at, updated_at:meta.exported_at},
        {key:'last_backup_stats', value:JSON.stringify(meta), updated_at:meta.exported_at},
      ], {onConflict:'key'})
      if(recordError) throw recordError
      return new Response(JSON.stringify({success:true,backup,meta}), {headers:{...corsHeaders,'Content-Type':'application/json'}})
    }

    if (action === 'stats') {
      const stats: Record<string, number> = {}
      for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
        if (error) {
          throw new Error(`Gagal membaca statistik ${table}: ${error.message}`)
        } else {
          stats[table] = count || 0
        }
      }
      const totalRows = Object.values(stats).reduce((a, b) => a + b, 0)

      const [lastBackup, lastStats] = await Promise.all([
        supabase.from('platform_settings').select('value').eq('key', 'last_backup_at').maybeSingle(),
        supabase.from('platform_settings').select('value').eq('key', 'last_backup_stats').maybeSingle(),
      ])

      let parsedStats = null
      if (lastStats.data?.value) {
        try {
          parsedStats = JSON.parse(lastStats.data.value)
          // Compat: old key 'totalRows' -> 'total_rows'
          if (parsedStats && parsedStats.totalRows != null && parsedStats.total_rows == null) {
            parsedStats.total_rows = parsedStats.totalRows
          }
        } catch { parsedStats = null }
      }

      return new Response(JSON.stringify({
        success: true,
        current: { tables: Object.keys(stats).length, total_rows: totalRows, stats },
        last_backup_at: lastBackup.data?.value || null,
        last_backup_stats: parsedStats,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'import') {
      const payload = body.backup as Record<string, any[]> | undefined
      const mode = (body.mode as string) || 'upsert' // 'upsert' | 'replace'
      if (!payload || typeof payload !== 'object') {
        return new Response(JSON.stringify({ success: false, error: 'Body harus mengandung "backup" (object per-tabel)' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if(mode !== 'upsert') throw new Error('Replace tidak didukung. Gunakan upsert atau pemulihan database penyedia agar penghapusan tidak parsial.')
      const orderedTables = restoreOrder(manifest,Object.keys(payload))
      for(const table of orderedTables) if(!Array.isArray(payload[table.table_name])) throw new Error(`Data ${table.table_name} harus berupa array`)
      const CHUNK = 200
      const stats: Record<string, { inserted: number; failed: number; error?: string }> = {}

      for (const entry of orderedTables) {
        const table = entry.table_name
        const conflict = entry.key_columns.join(",")
        const rows = payload[table] || []
        if (!Array.isArray(rows) || rows.length === 0) { stats[table] = { inserted: 0, failed: 0 }; continue }

        let inserted = 0
        let failed = 0
        let lastErr: string | undefined
        for (let i = 0; i < rows.length; i += CHUNK) {
          const chunk = rows.slice(i, i + CHUNK)
          const { error } = await supabase.from(table).upsert(chunk, { onConflict: conflict, ignoreDuplicates: false })
          if (error) {
            // Retry row-by-row so a single bad row doesn't drop the whole chunk
            for (const row of chunk) {
              const { error: rowErr } = await supabase.from(table).upsert(row, { onConflict: conflict })
              if (rowErr) { failed++; lastErr = rowErr.message } else { inserted++ }
            }
          } else {
            inserted += chunk.length
          }
        }
        stats[table] = { inserted, failed, error: lastErr }
      }

      const totalInserted = Object.values(stats).reduce((a, s) => a + s.inserted, 0)
      const totalFailed = Object.values(stats).reduce((a, s) => a + s.failed, 0)

      return new Response(JSON.stringify({
        success: totalFailed === 0,
        partial: totalFailed > 0,
        mode,
        summary: {
          tables: Object.keys(stats).length,
          inserted: totalInserted,
          failed: totalFailed,
          imported_at: new Date().toISOString(),
        },
        stats,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ success: false, error: 'Invalid action. Use "export", "import" or "stats"' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: any) {
    console.error('database-backup error', err)
    return new Response(JSON.stringify({ success: false, error: err?.message || String(err) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
