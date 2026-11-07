-- Complete aggregates retain RLS and reject cross-school requests explicitly.
CREATE OR REPLACE FUNCTION public.principal_finance_summary(p_school_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '' AS $$
DECLARE result jsonb; tz text; today date; first_month date;
BEGIN
 IF auth.uid() IS NULL OR NOT coalesce((
   public.has_role(auth.uid(), 'super_admin'::public.app_role) OR
   (public.get_user_school_id(auth.uid()) = p_school_id AND (
     public.has_role(auth.uid(), 'principal'::public.app_role) OR
     public.has_role(auth.uid(), 'school_admin'::public.app_role) OR
     public.has_role(auth.uid(), 'bendahara'::public.app_role)))
 ),false) THEN RAISE EXCEPTION 'Akses laporan ditolak' USING ERRCODE='42501'; END IF;
 SELECT timezone INTO tz FROM public.schools WHERE id=p_school_id;
 IF tz IS NULL OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name=tz) THEN tz := 'Asia/Jakarta'; END IF;
 today := (now() AT TIME ZONE tz)::date;
 first_month := (date_trunc('month',today) - interval '5 months')::date;
 WITH invoices AS MATERIALIZED (SELECT * FROM public.spp_invoices WHERE school_id=p_school_id),
 cash AS MATERIALIZED (SELECT * FROM public.cash_book_entries WHERE school_id=p_school_id),
 legacy AS (SELECT count(*) n, coalesce(sum(coalesce(net_amount,total_amount,0)),0) net FROM invoices
   WHERE status='paid' AND settlement_id IS NULL AND NOT coalesce(doku_split,false)
   AND lower(coalesce(payment_method,'')) NOT IN ('offline_cash','offline_transfer')),
 months AS (SELECT generate_series(first_month::timestamp,date_trunc('month',today),interval '1 month')::date m),
 inv_month AS (SELECT date_trunc('month',paid_at AT TIME ZONE tz)::date m,sum(total_amount) total FROM invoices
   WHERE status='paid' AND paid_at >= (first_month::timestamp AT TIME ZONE tz) GROUP BY 1),
 cash_month AS (SELECT date_trunc('month',entry_date)::date m,
   sum(amount) FILTER(WHERE direction='in') incoming,sum(amount) FILTER(WHERE direction='out') outgoing
   FROM cash WHERE entry_date>=first_month GROUP BY 1),
 teacher_month AS (SELECT date_trunc('month',date)::date m,count(*) n FROM public.teacher_attendance_logs
   WHERE school_id=p_school_id AND date>=first_month AND status='hadir' AND coalesce(attendance_type,'datang')='datang' GROUP BY 1),
 student_month AS (SELECT date_trunc('month',date)::date m,count(DISTINCT (student_id,date)) n FROM public.attendance_logs
   WHERE school_id=p_school_id AND date>=first_month AND status='hadir' AND coalesce(attendance_type,'datang')='datang' GROUP BY 1)
 SELECT jsonb_build_object('finance',jsonb_build_object(
   'totalTagihan',(SELECT coalesce(sum(total_amount),0) FROM invoices),
   'totalPembayaran',(SELECT coalesce(sum(CASE WHEN status='paid' THEN total_amount ELSE least(coalesce(installment_paid_amount,0),total_amount) END),0) FROM invoices),
   'tunggakan',(SELECT coalesce(sum(greatest(total_amount-coalesce(installment_paid_amount,0),0)),0) FROM invoices WHERE status IN ('pending','unpaid','partial') AND due_date<today),
   'saldoKas',(SELECT coalesce(sum(CASE WHEN direction='in' THEN amount ELSE -amount END),0) FROM cash),
   'danaPending',(SELECT greatest(0,net-CASE WHEN n>0 THEN coalesce((SELECT withdraw_fee_default FROM public.bendahara_settings WHERE school_id=p_school_id LIMIT 1),3000) ELSE 0 END) FROM legacy),
   'splitAllocated',(SELECT coalesce(sum(CASE WHEN status='paid' THEN total_amount ELSE coalesce(installment_paid_amount,0) END),0) FROM invoices WHERE doku_split=true)
 ),'monthly',(SELECT jsonb_agg(jsonb_build_object('key',m.m,'SPP',coalesce(i.total,0),'Pendapatan',coalesce(c.incoming,0),'Pengeluaran',coalesce(c.outgoing,0),'Guru',coalesce(t.n,0),'Siswa',coalesce(s.n,0)) ORDER BY m.m)
 FROM months m LEFT JOIN inv_month i USING(m) LEFT JOIN cash_month c USING(m) LEFT JOIN teacher_month t USING(m) LEFT JOIN student_month s USING(m)),
 'payments_today',(SELECT count(*) FROM invoices WHERE status='paid' AND (paid_at AT TIME ZONE tz)::date=today),
 'timezone',tz,'generated_at',now()) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.principal_finance_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.principal_finance_summary(uuid) TO authenticated;

-- Stable primary keys and FK dependencies for application-data exports and upserts.
CREATE OR REPLACE FUNCTION public.backup_table_manifest()
RETURNS TABLE(table_name text, key_columns text[], dependencies text[])
LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$
 SELECT c.relname::text,
   coalesce((SELECT array_agg(a.attname::text ORDER BY k.ord) FROM pg_catalog.pg_constraint pk
    CROSS JOIN LATERAL unnest(pk.conkey) WITH ORDINALITY k(attnum,ord)
    JOIN pg_catalog.pg_attribute a ON a.attrelid=c.oid AND a.attnum=k.attnum
    WHERE pk.conrelid=c.oid AND pk.contype='p'),ARRAY[]::text[]),
   coalesce((SELECT array_agg(DISTINCT parent.relname::text) FROM pg_catalog.pg_constraint fk
    JOIN pg_catalog.pg_class parent ON parent.oid=fk.confrelid
    JOIN pg_catalog.pg_namespace pn ON pn.oid=parent.relnamespace
    WHERE fk.conrelid=c.oid AND fk.contype='f' AND pn.nspname='public' AND parent.oid<>c.oid),ARRAY[]::text[])
 FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT c.relispartition
 AND c.relname NOT IN ('parent_otps','parent_sessions','password_reset_otps','bendahara_otps','otp_rate_limits')
 ORDER BY c.relname
$$;
REVOKE ALL ON FUNCTION public.backup_table_manifest() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.backup_table_manifest() TO service_role;

-- Privileged health data stays in a non-exposed schema, guarded by an actual role lookup.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
CREATE OR REPLACE FUNCTION private.operations_health()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(),'super_admin'::public.app_role) THEN
   RAISE EXCEPTION 'Super admin diperlukan' USING ERRCODE='42501';
 END IF;
 SELECT jsonb_build_object(
  'checked_at',now(),
  'reconciliation',jsonb_build_object(
   'active',coalesce((SELECT active FROM cron.job WHERE jobname='doku-payment-reconciliation' LIMIT 1),false),
   'last_run',(SELECT max(start_time) FROM cron.job_run_details WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname='doku-payment-reconciliation')),
   'failed_24h',(SELECT count(*) FROM cron.job_run_details WHERE status='failed' AND start_time>now()-interval '1 day' AND jobid IN (SELECT jobid FROM cron.job WHERE jobname='doku-payment-reconciliation')),
   'pending',(SELECT count(*) FROM public.doku_payment_attempts WHERE state='pending'),
   'overdue',(SELECT count(*) FROM public.doku_payment_attempts WHERE state='pending' AND next_check_at<now()-interval '15 minutes'),
   'review',(SELECT count(*) FROM public.doku_payment_attempts WHERE state='review')),
  'notifications',jsonb_build_object('failed_24h',(SELECT count(*) FROM public.wa_message_logs WHERE status='failed' AND created_at>now()-interval '1 day')),
  'backup',jsonb_build_object('last_export',(SELECT value FROM public.platform_settings WHERE key='last_backup_at'),
   'last_gdrive',(SELECT value FROM public.platform_settings WHERE key='last_gdrive_backup_at'))
 ) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION private.operations_health() FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.operations_health() TO authenticated;
CREATE OR REPLACE FUNCTION public.operations_health()
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path='' AS $$ SELECT private.operations_health() $$;
REVOKE ALL ON FUNCTION public.operations_health() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.operations_health() TO authenticated;
NOTIFY pgrst, 'reload schema';
