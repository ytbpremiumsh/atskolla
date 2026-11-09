-- Enforce the same rule for single, bulk, custom, imported and direct API invoices.
-- SECURITY INVOKER preserves existing school isolation and account RLS policies.
CREATE OR REPLACE FUNCTION public.require_verified_bank_for_invoice_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.school_id IS NOT DISTINCT FROM OLD.school_id THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.bendahara_bank_accounts AS bank
    WHERE bank.school_id = NEW.school_id
      AND bank.is_active IS TRUE
      AND bank.verification_status = 'verified'
      AND bank.requires_review IS NOT TRUE
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = 'Tagihan belum dapat dibuat. Rekening pencairan sekolah harus terverifikasi terlebih dahulu.',
      DETAIL = 'BANK_VERIFICATION_REQUIRED';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.require_verified_bank_for_invoice_creation() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS require_verified_bank_before_invoice ON public.spp_invoices;
CREATE TRIGGER require_verified_bank_before_invoice
BEFORE INSERT OR UPDATE OF school_id ON public.spp_invoices
FOR EACH ROW EXECUTE FUNCTION public.require_verified_bank_for_invoice_creation();
