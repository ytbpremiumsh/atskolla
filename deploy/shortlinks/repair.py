#!/usr/bin/env python3
"""Repair the existing PostgreSQL shortlink resolver without Lovable or schema-wide changes."""
import os
from pathlib import Path
import shutil
import subprocess
import sys

SQL = """
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
DO $check$ BEGIN
 IF to_regclass('public.short_links') IS NULL THEN
  RAISE EXCEPTION 'Missing public.short_links: check the selected database before continuing';
 END IF;
END $check$;
CREATE OR REPLACE FUNCTION public.resolve_shortlink(_code text)
RETURNS TABLE (link_id uuid, target_url text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
 SELECT sl.id, sl.target_url FROM public.short_links AS sl
 WHERE lower(btrim(sl.code)) = lower(btrim(_code)) AND sl.is_active IS TRUE
 ORDER BY sl.created_at DESC NULLS LAST LIMIT 1;
$function$;
REVOKE ALL ON FUNCTION public.resolve_shortlink(text) FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_shortlink(text) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
BEGIN;
SET LOCAL ROLE anon;
SELECT count(*) AS resolver_access_verified FROM public.resolve_shortlink('__atskolla_probe_missing__');
ROLLBACK;
"""

def main():
 if not shutil.which('psql'):
  print('psql belum tersedia. Pasang PostgreSQL client pada VPS.', file=sys.stderr); return 1
 database_url=os.environ.get('DATABASE_URL','').strip()
 if not database_url:
  print('DATABASE_URL belum diatur. Gunakan koneksi PostgreSQL database ATSkolla yang aktif.',file=sys.stderr); return 1
 env=os.environ.copy()
 # libpq accepts a connection URI through PGDATABASE; never expose the URI in process arguments/logs.
 env['PGDATABASE']=database_url
 env['PGCONNECT_TIMEOUT']='10'
 env['PSQL_HISTORY']='/dev/null'
 result=subprocess.run(['psql','-X','--no-password','--set','ON_ERROR_STOP=1','--quiet'],input=SQL,text=True,env=env,capture_output=True)
 if result.returncode:
  print('Perbaikan belum berhasil. Periksa koneksi, database tujuan, dan izin pemilik database. Tidak ada detail kredensial yang ditampilkan.',file=sys.stderr); return 1
 print('Fungsi redirect diperbarui dan akses publik terverifikasi. Data tautan tetap tersimpan.');return 0

if __name__=='__main__':sys.exit(main())
