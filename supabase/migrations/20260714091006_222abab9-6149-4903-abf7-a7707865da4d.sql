
-- 1. Remove anon read from base schools table; keep schools_public view for public reads
DROP POLICY IF EXISTS "Anon read via schools_public view only" ON public.schools;
REVOKE SELECT ON public.schools FROM anon;

-- 2. Prevent affiliates from changing financial columns on their own row
CREATE OR REPLACE FUNCTION public.affiliates_guard_financial_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.commission_rate IS DISTINCT FROM OLD.commission_rate
     OR NEW.current_balance IS DISTINCT FROM OLD.current_balance
     OR NEW.total_earned IS DISTINCT FROM OLD.total_earned
     OR NEW.total_withdrawn IS DISTINCT FROM OLD.total_withdrawn
     OR NEW.status IS DISTINCT FROM OLD.status
     OR NEW.affiliate_code IS DISTINCT FROM OLD.affiliate_code
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
    RAISE EXCEPTION 'Tidak diizinkan mengubah kolom keuangan/akun affiliate';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_affiliates_guard_financial_fields ON public.affiliates;
CREATE TRIGGER trg_affiliates_guard_financial_fields
BEFORE UPDATE ON public.affiliates
FOR EACH ROW EXECUTE FUNCTION public.affiliates_guard_financial_fields();
