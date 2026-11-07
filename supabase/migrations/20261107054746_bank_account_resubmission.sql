ALTER TABLE public.bendahara_bank_accounts ADD COLUMN IF NOT EXISTS requires_review boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.bank_accounts_guard_verification()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE
  _is_sa boolean := COALESCE(public.has_role(auth.uid(),'super_admin'),false) OR auth.uid() IS NULL;
  _resubmit boolean;
BEGIN
  IF TG_OP='INSERT' THEN
    IF NOT _is_sa THEN NEW.verification_status:='pending';NEW.verified_at:=NULL;NEW.verified_by:=NULL;NEW.rejection_reason:=NULL;END IF;
    RETURN NEW;
  END IF;
  IF _is_sa THEN
    IF NEW.verification_status='verified' THEN NEW.requires_review:=false;END IF;
    RETURN NEW;
  END IF;
  _resubmit := OLD.verification_status='rejected' AND NEW.verification_status='pending'
    AND NEW.school_id=OLD.school_id AND NEW.school_id=public.get_user_school_id(auth.uid())
    AND (public.has_role(auth.uid(),'bendahara') OR public.has_role(auth.uid(),'school_admin'));
  NEW.verification_status:=OLD.verification_status;NEW.verified_at:=OLD.verified_at;
  NEW.verified_by:=OLD.verified_by;NEW.rejection_reason:=OLD.rejection_reason;NEW.requires_review:=OLD.requires_review;
  IF _resubmit THEN
    IF btrim(COALESCE(NEW.bank_branch,''))='' OR NULLIF(NEW.bank_book_path,'') IS NULL THEN
      RAISE EXCEPTION 'Lengkapi cabang dan foto buku tabungan sebelum mengajukan ulang';
    END IF;
    NEW.verification_status:='pending';NEW.verified_at:=NULL;NEW.verified_by:=NULL;NEW.rejection_reason:=NULL;NEW.requires_review:=true;
  ELSIF NEW.account_number IS DISTINCT FROM OLD.account_number OR NEW.bank_name IS DISTINCT FROM OLD.bank_name OR NEW.account_holder IS DISTINCT FROM OLD.account_holder THEN
    NEW.verification_status:='pending';NEW.verified_at:=NULL;NEW.verified_by:=NULL;NEW.rejection_reason:=NULL;
    IF OLD.verification_status='rejected' THEN NEW.requires_review:=true;END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.bank_accounts_auto_verify()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r public.doku_registered_accounts%ROWTYPE;
BEGIN
  IF NEW.verification_status<>'pending' OR NEW.requires_review THEN RETURN NEW;END IF;
  SELECT * INTO r FROM public.doku_registered_accounts
   WHERE regexp_replace(account_number,'\D','','g')=regexp_replace(COALESCE(NEW.account_number,''),'\D','','g')
     AND upper(regexp_replace(bank_name,'\s','','g'))=upper(regexp_replace(COALESCE(NEW.bank_name,''),'\s','','g')) LIMIT 1;
  IF FOUND THEN NEW.verification_status:='verified';NEW.verified_at:=now();NEW.rejection_reason:=NULL;
    IF r.settlement_id IS NOT NULL AND NEW.doku_bank_account_settlement_id IS NULL THEN NEW.doku_bank_account_settlement_id:=r.settlement_id;END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.resubmit_bank_account(p_account_id uuid,p_bank_name text,p_bank_branch text,p_account_number text,p_account_holder text,p_responsible_user_id uuid,p_bank_book_path text,p_notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE account public.bendahara_bank_accounts%ROWTYPE; _school uuid; _digits text;
BEGIN
  _school:=public.get_user_school_id(auth.uid());
  IF auth.uid() IS NULL OR _school IS NULL OR NOT (public.has_role(auth.uid(),'bendahara') OR public.has_role(auth.uid(),'school_admin')) THEN
    RAISE EXCEPTION 'Hanya bendahara atau admin sekolah yang dapat mengajukan ulang rekening' USING ERRCODE='42501';
  END IF;
  SELECT * INTO account FROM public.bendahara_bank_accounts WHERE id=p_account_id AND school_id=_school FOR UPDATE;
  IF NOT FOUND OR account.is_active IS FALSE THEN RAISE EXCEPTION 'Rekening tidak ditemukan atau sudah nonaktif';END IF;
  IF account.verification_status IS DISTINCT FROM 'rejected' THEN RAISE EXCEPTION 'Hanya rekening ditolak yang bisa diajukan ulang. Muat ulang data.';END IF;
  _digits:=regexp_replace(COALESCE(p_account_number,''),'\s','','g');
  IF _digits !~ '^[0-9]{5,34}$' OR length(btrim(COALESCE(p_bank_name,''))) NOT BETWEEN 1 AND 100
    OR length(btrim(COALESCE(p_account_holder,''))) NOT BETWEEN 1 AND 180 OR length(btrim(COALESCE(p_bank_branch,''))) NOT BETWEEN 1 AND 120 THEN
    RAISE EXCEPTION 'Nama bank, cabang, nomor rekening, dan nama pemilik wajib diisi dengan benar';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=p_responsible_user_id AND school_id=_school) THEN RAISE EXCEPTION 'Penanggung jawab harus berasal dari sekolah yang sama';END IF;
  IF split_part(COALESCE(p_bank_book_path,''),'/',1)<>_school::text OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='bank-account-documents' AND name=p_bank_book_path) THEN
    RAISE EXCEPTION 'Lampiran buku tabungan belum tersedia atau bukan milik sekolah';
  END IF;
  UPDATE public.bendahara_bank_accounts SET bank_name=btrim(p_bank_name),bank_branch=btrim(p_bank_branch),account_number=_digits,
    account_holder=btrim(p_account_holder),responsible_user_id=p_responsible_user_id,bank_book_path=p_bank_book_path,notes=left(p_notes,500),
    verification_status='pending',requires_review=true,verified_at=NULL,verified_by=NULL,rejection_reason=NULL WHERE id=account.id;
  RETURN jsonb_build_object('id',account.id,'verification_status','pending');
END;
$$;
REVOKE ALL ON FUNCTION public.resubmit_bank_account(uuid,text,text,text,text,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.resubmit_bank_account(uuid,text,text,text,text,uuid,text,text) TO authenticated;
NOTIFY pgrst,'reload schema';
