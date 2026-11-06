CREATE OR REPLACE FUNCTION public.bank_accounts_guard_primary()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _msg text := 'Rekening utama tidak bisa dihapus. Tambahkan rekening baru, tunggu terverifikasi, jadikan utama, baru hapus yang lama.';
DECLARE _sa boolean := COALESCE(public.has_role(auth.uid(), 'super_admin'), false) OR auth.uid() IS NULL;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF NOT _sa AND OLD.is_active IS NOT FALSE AND (OLD.is_default OR NOT EXISTS (
        SELECT 1 FROM public.bendahara_bank_accounts b WHERE b.school_id = OLD.school_id AND b.id <> OLD.id
          AND b.is_active IS NOT FALSE AND b.verification_status = 'verified')) THEN
      RAISE EXCEPTION '%', _msg;
    END IF;
    RETURN OLD;
  END IF;
  IF NOT _sa AND NEW.is_active IS FALSE AND OLD.is_active IS NOT FALSE AND (OLD.is_default OR NOT EXISTS (
      SELECT 1 FROM public.bendahara_bank_accounts b WHERE b.school_id = OLD.school_id AND b.id <> OLD.id
        AND b.is_active IS NOT FALSE AND b.verification_status = 'verified')) THEN
    RAISE EXCEPTION '%', _msg;
  END IF;
  IF NEW.is_default AND NOT COALESCE(OLD.is_default, false) AND NEW.verification_status <> 'verified' THEN
    RAISE EXCEPTION 'Hanya rekening yang sudah terverifikasi yang bisa dijadikan rekening utama';
  END IF;
  RETURN NEW;
END $$;