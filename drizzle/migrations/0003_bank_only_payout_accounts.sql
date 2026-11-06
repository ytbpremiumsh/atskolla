CREATE OR REPLACE FUNCTION public.bank_accounts_bank_only()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF COALESCE(NEW.account_type,'bank') <> 'bank' AND (TG_OP='INSERT' OR NEW.account_type IS DISTINCT FROM OLD.account_type) THEN
    RAISE EXCEPTION 'Pencairan hanya bisa ke rekening bank';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bank_accounts_bank_only ON public.bendahara_bank_accounts;
CREATE TRIGGER bank_accounts_bank_only BEFORE INSERT OR UPDATE ON public.bendahara_bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.bank_accounts_bank_only();