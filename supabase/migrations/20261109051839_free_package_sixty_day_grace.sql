BEGIN;
ALTER TABLE public.package_settings ALTER COLUMN grace_period_days SET DEFAULT 60;
INSERT INTO public.package_settings (id,grace_period_days) VALUES (1,60)
ON CONFLICT (id) DO UPDATE SET grace_period_days=60,updated_at=now();

-- Retire the paid alternative without restarting any school's activity clock.
WITH moved AS (
  UPDATE public.schools SET package_type='payment' WHERE package_type='mandiri'
  RETURNING id
)
INSERT INTO public.package_audit_log(school_id,action,old_value,new_value,reason)
SELECT id,'package_changed','{"package_type":"mandiri"}'::jsonb,
  '{"package_type":"payment"}'::jsonb,
  'Paket Gratis menjadi satu-satunya layanan; waktu aktivitas pembayaran tetap dipertahankan'
FROM moved;
ALTER TABLE public.schools ADD CONSTRAINT schools_free_package_only CHECK (package_type='payment');

CREATE OR REPLACE FUNCTION public.check_package_status()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _grace int; r RECORD;
BEGIN
  SELECT grace_period_days INTO _grace FROM public.package_settings WHERE id=1;
  IF _grace IS NULL THEN _grace := 60; END IF;
  FOR r IN SELECT id,last_payment_activity_at FROM public.schools
    WHERE package_type='payment' AND package_status='active'
      AND (last_payment_activity_at IS NULL OR last_payment_activity_at < now()-(_grace || ' days')::interval)
  LOOP
    UPDATE public.schools SET package_status='pending_activation',package_status_changed_at=now() WHERE id=r.id;
    INSERT INTO public.package_audit_log(school_id,action,old_value,new_value,reason)
    VALUES(r.id,'suspended',jsonb_build_object('package_status','active'),
      jsonb_build_object('package_status','pending_activation'),
      'Auto: tidak ada aktivitas pembayaran ' || _grace || ' hari');
  END LOOP;
END;
$function$;
COMMIT;
