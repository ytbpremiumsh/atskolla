CREATE TABLE public.doku_registered_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_holder text,
  settlement_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);
CREATE UNIQUE INDEX doku_registered_accounts_number_uq ON public.doku_registered_accounts (regexp_replace(account_number, '\D', '', 'g'));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doku_registered_accounts TO authenticated;
GRANT ALL ON public.doku_registered_accounts TO service_role;
ALTER TABLE public.doku_registered_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admin manages DOKU registry" ON public.doku_registered_accounts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Auto-verifikasi: rekening yang cocok dengan daftar rekening terdaftar di DOKU
CREATE OR REPLACE FUNCTION public.bank_accounts_auto_verify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.doku_registered_accounts%ROWTYPE;
BEGIN
  IF NEW.verification_status <> 'pending' THEN RETURN NEW; END IF;
  SELECT * INTO r FROM public.doku_registered_accounts
   WHERE regexp_replace(account_number, '\D', '', 'g') = regexp_replace(COALESCE(NEW.account_number,''), '\D', '', 'g')
     AND upper(regexp_replace(bank_name, '\s', '', 'g')) = upper(regexp_replace(COALESCE(NEW.bank_name,''), '\s', '', 'g'))
   LIMIT 1;
  IF FOUND THEN
    NEW.verification_status := 'verified';
    NEW.verified_at := now();
    NEW.rejection_reason := NULL;
    IF r.settlement_id IS NOT NULL AND NEW.doku_bank_account_settlement_id IS NULL THEN
      NEW.doku_bank_account_settlement_id := r.settlement_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;
-- nama "zz_" agar berjalan SETELAH guard verifikasi (trigger BEFORE berjalan urut abjad)
DROP TRIGGER IF EXISTS zz_bank_accounts_auto_verify ON public.bendahara_bank_accounts;
CREATE TRIGGER zz_bank_accounts_auto_verify BEFORE INSERT OR UPDATE ON public.bendahara_bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.bank_accounts_auto_verify();

-- Rekening utama tidak boleh dihapus/nonaktif; jadi utama hanya jika terverifikasi
CREATE OR REPLACE FUNCTION public.bank_accounts_guard_primary()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_default AND NOT COALESCE(public.has_role(auth.uid(), 'super_admin'), false) AND auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Rekening utama tidak bisa dihapus. Tambahkan rekening baru, tunggu terverifikasi, jadikan utama, baru hapus yang lama.';
    END IF;
    RETURN OLD;
  END IF;
  IF NEW.is_active IS FALSE AND OLD.is_active IS NOT FALSE AND OLD.is_default THEN
    RAISE EXCEPTION 'Rekening utama tidak bisa dihapus. Tambahkan rekening baru, tunggu terverifikasi, jadikan utama, baru hapus yang lama.';
  END IF;
  IF NEW.is_default AND NOT COALESCE(OLD.is_default, false) AND NEW.verification_status <> 'verified' THEN
    RAISE EXCEPTION 'Hanya rekening yang sudah terverifikasi yang bisa dijadikan rekening utama';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS zz_bank_accounts_guard_primary ON public.bendahara_bank_accounts;
CREATE TRIGGER zz_bank_accounts_guard_primary BEFORE UPDATE ON public.bendahara_bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.bank_accounts_guard_primary();
DROP TRIGGER IF EXISTS bank_accounts_guard_primary_del ON public.bendahara_bank_accounts;
CREATE TRIGGER bank_accounts_guard_primary_del BEFORE DELETE ON public.bendahara_bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.bank_accounts_guard_primary();

-- Saat Super Admin menambah rekening ke daftar DOKU, rekening sekolah yang cocok & masih menunggu ikut terverifikasi
CREATE OR REPLACE FUNCTION public.doku_registry_verify_pending()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.bendahara_bank_accounts SET updated_at = now()
   WHERE verification_status = 'pending'
     AND regexp_replace(COALESCE(account_number,''), '\D', '', 'g') = regexp_replace(NEW.account_number, '\D', '', 'g');
  RETURN NEW;
END $$;
CREATE TRIGGER doku_registry_verify_pending AFTER INSERT OR UPDATE ON public.doku_registered_accounts
FOR EACH ROW EXECUTE FUNCTION public.doku_registry_verify_pending();