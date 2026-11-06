ALTER TABLE public.bendahara_bank_accounts ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Rekening lama yang sudah dipakai dianggap terverifikasi agar pencairan tidak terganggu
UPDATE public.bendahara_bank_accounts SET verification_status='verified', verified_at=now() WHERE verification_status='pending' AND is_active IS NOT FALSE;

CREATE OR REPLACE FUNCTION public.bank_accounts_guard_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _is_sa boolean := COALESCE(public.has_role(auth.uid(), 'super_admin'), false) OR auth.uid() IS NULL;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT _is_sa THEN
      NEW.verification_status := 'pending'; NEW.verified_at := NULL; NEW.verified_by := NULL; NEW.rejection_reason := NULL;
    END IF;
    RETURN NEW;
  END IF;
  IF NOT _is_sa THEN
    NEW.verification_status := OLD.verification_status; NEW.verified_at := OLD.verified_at;
    NEW.verified_by := OLD.verified_by; NEW.rejection_reason := OLD.rejection_reason;
    IF NEW.account_number IS DISTINCT FROM OLD.account_number OR NEW.bank_name IS DISTINCT FROM OLD.bank_name OR NEW.account_holder IS DISTINCT FROM OLD.account_holder THEN
      NEW.verification_status := 'pending'; NEW.verified_at := NULL; NEW.verified_by := NULL; NEW.rejection_reason := NULL;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS bank_accounts_guard_verification ON public.bendahara_bank_accounts;
CREATE TRIGGER bank_accounts_guard_verification BEFORE INSERT OR UPDATE ON public.bendahara_bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.bank_accounts_guard_verification();

CREATE OR REPLACE FUNCTION public.trg_notify_admin_bank_account()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _school text;
BEGIN
  IF NEW.verification_status <> 'pending' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.verification_status = 'pending' THEN RETURN NEW; END IF;
  SELECT name INTO _school FROM public.schools WHERE id = NEW.school_id;
  PERFORM public.notify_admin_wa('bank_account_request', jsonb_build_object(
    'school', COALESCE(_school,'-'), 'bank', COALESCE(NEW.bank_name,'-'),
    'account_number', COALESCE(NEW.account_number,'-'), 'account_holder', COALESCE(NEW.account_holder,'-')));
  INSERT INTO public.notifications (school_id, title, message, type)
  VALUES (NULL, 'Pengajuan Rekening Baru', COALESCE(_school,'-') || ' — ' || COALESCE(NEW.bank_name,'-') || ' ' || COALESCE(NEW.account_number,'-') || ' a.n. ' || COALESCE(NEW.account_holder,'-') || '. Perlu verifikasi.', 'info');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS notify_admin_bank_account ON public.bendahara_bank_accounts;
CREATE TRIGGER notify_admin_bank_account AFTER INSERT OR UPDATE ON public.bendahara_bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_admin_bank_account();