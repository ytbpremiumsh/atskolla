CREATE OR REPLACE FUNCTION public.bank_accounts_reset_split()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _old_id text := NULLIF(trim(COALESCE(OLD.doku_bank_account_settlement_id,'')), '');
DECLARE _school text;
BEGIN
  IF _old_id IS NULL THEN RETURN NEW; END IF;
  IF (NEW.is_active IS FALSE AND OLD.is_active IS NOT FALSE)
     OR NEW.account_number IS DISTINCT FROM OLD.account_number
     OR NEW.bank_name IS DISTINCT FROM OLD.bank_name
     OR NEW.account_holder IS DISTINCT FROM OLD.account_holder
     OR (NEW.verification_status <> 'verified' AND OLD.verification_status = 'verified') THEN
    NEW.doku_bank_account_settlement_id := NULL;
    UPDATE public.schools SET doku_settlement_bank_id = NULL
      WHERE id = NEW.school_id AND doku_settlement_bank_id = _old_id;
    SELECT name INTO _school FROM public.schools WHERE id = NEW.school_id;
    INSERT INTO public.notifications (school_id, title, message, type)
    VALUES (NULL, 'Split Settlement Dimatikan',
      COALESCE(_school,'-') || ' mengubah/menonaktifkan rekening ' || COALESCE(OLD.bank_name,'-') || ' ' || COALESCE(OLD.account_number,'-') || '. Split dimatikan otomatis, atur ulang di menu Split Settlement.', 'warning');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS bank_accounts_reset_split ON public.bendahara_bank_accounts;
CREATE TRIGGER bank_accounts_reset_split BEFORE UPDATE ON public.bendahara_bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.bank_accounts_reset_split();

CREATE OR REPLACE FUNCTION public.bank_accounts_reset_split_on_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NULLIF(trim(COALESCE(OLD.doku_bank_account_settlement_id,'')), '') IS NOT NULL THEN
    UPDATE public.schools SET doku_settlement_bank_id = NULL
      WHERE id = OLD.school_id AND doku_settlement_bank_id = trim(OLD.doku_bank_account_settlement_id);
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS bank_accounts_reset_split_on_delete ON public.bendahara_bank_accounts;
CREATE TRIGGER bank_accounts_reset_split_on_delete AFTER DELETE ON public.bendahara_bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.bank_accounts_reset_split_on_delete();