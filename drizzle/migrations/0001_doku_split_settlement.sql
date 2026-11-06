ALTER TABLE public.schools ADD COLUMN IF NOT EXISTS doku_settlement_bank_id text;
ALTER TABLE public.spp_invoices ADD COLUMN IF NOT EXISTS doku_split boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.spp_invoices.doku_split IS 'True when the DOKU payment link routed the SPP amount directly to the school bank via DOKU Split Settlement; excluded from manual bendahara payouts.';

CREATE OR REPLACE FUNCTION public.schools_guard_billing_fields()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;
  IF public.has_role(auth.uid(), 'super_admin'::app_role) THEN RETURN NEW; END IF;
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF NEW.is_suspended IS DISTINCT FROM OLD.is_suspended
     OR NEW.suspended_at IS DISTINCT FROM OLD.suspended_at
     OR NEW.suspended_reason IS DISTINCT FROM OLD.suspended_reason
     OR NEW.package_type IS DISTINCT FROM OLD.package_type
     OR NEW.package_status IS DISTINCT FROM OLD.package_status
     OR NEW.package_status_changed_at IS DISTINCT FROM OLD.package_status_changed_at
     OR NEW.mandiri_monthly_rate IS DISTINCT FROM OLD.mandiri_monthly_rate
     OR NEW.last_payment_activity_at IS DISTINCT FROM OLD.last_payment_activity_at
     OR NEW.group_id IS DISTINCT FROM OLD.group_id
     OR NEW.doku_settlement_bank_id IS DISTINCT FROM OLD.doku_settlement_bank_id THEN
    RAISE EXCEPTION 'Kolom penagihan/status paket hanya dapat diubah oleh Super Admin';
  END IF;
  RETURN NEW;
END;
$function$;