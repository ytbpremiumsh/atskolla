-- One registry entry per bank/account, including formatting variants.
CREATE UNIQUE INDEX IF NOT EXISTS doku_registry_normalized_bank_account_uidx
ON public.doku_registered_accounts (
  upper(regexp_replace(bank_name, '\s', '', 'g')),
  regexp_replace(account_number, '\D', '', 'g')
);

-- Both writes succeed or roll back together. Existing RLS still applies.
CREATE OR REPLACE FUNCTION public.verify_and_register_bank_account(p_account_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  account public.bendahara_bank_accounts%ROWTYPE;
  registry public.doku_registered_accounts%ROWTYPE;
  digits text;
  bank_key text;
BEGIN
  IF auth.uid() IS NULL OR NOT COALESCE(public.has_role(auth.uid(), 'super_admin'), false) THEN
    RAISE EXCEPTION 'Hanya Super Admin yang dapat memverifikasi rekening' USING ERRCODE='42501';
  END IF;
  -- Serialize this operation before taking account locks. Registry triggers can
  -- touch other pending accounts, so parallel approvals must share this lock.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('atskolla:verify-bank-registry', 0));
  SELECT * INTO account FROM public.bendahara_bank_accounts WHERE id=p_account_id FOR UPDATE;
  IF NOT FOUND OR account.is_active IS FALSE THEN
    RAISE EXCEPTION 'Rekening tidak ditemukan atau sudah nonaktif';
  END IF;
  IF account.verification_status NOT IN ('pending','verified') OR account.verification_status IS NULL THEN
    RAISE EXCEPTION 'Status pengajuan sudah berubah. Muat ulang daftar rekening.';
  END IF;
  digits := regexp_replace(COALESCE(account.account_number,''), '\D', '', 'g');
  bank_key := upper(regexp_replace(COALESCE(account.bank_name,''), '\s', '', 'g'));
  IF bank_key='' OR digits !~ '^[0-9]{5,34}$' OR btrim(COALESCE(account.account_holder,''))='' THEN
    RAISE EXCEPTION 'Nama bank, nomor rekening, atau nama pemilik belum lengkap';
  END IF;
  IF account.verification_status='pending' THEN
    UPDATE public.bendahara_bank_accounts SET verification_status='verified',
      verified_at=now(), verified_by=auth.uid(), rejection_reason=NULL
    WHERE id=account.id;
  END IF;
  INSERT INTO public.doku_registered_accounts(bank_name,account_number,account_holder,settlement_id,created_by)
  VALUES (btrim(account.bank_name),digits,btrim(account.account_holder),
    NULLIF(btrim(account.doku_bank_account_settlement_id),''),auth.uid())
  ON CONFLICT (upper(regexp_replace(bank_name, '\s', '', 'g')), regexp_replace(account_number, '\D', '', 'g')) DO NOTHING;
  SELECT * INTO registry FROM public.doku_registered_accounts
    WHERE upper(regexp_replace(bank_name, '\s', '', 'g'))=bank_key
      AND regexp_replace(account_number, '\D', '', 'g')=digits;
  IF NOT FOUND THEN RAISE EXCEPTION 'Gagal menyimpan daftar rekening. Silakan coba lagi.'; END IF;
  -- Registration here is ATSkolla's internal list; it does not call DOKU or enable split.
  RETURN jsonb_build_object('account_id',account.id,'registry_id',registry.id,
    'verification_status','verified','settlement_id',registry.settlement_id);
END;
$$;
REVOKE ALL ON FUNCTION public.verify_and_register_bank_account(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.verify_and_register_bank_account(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
