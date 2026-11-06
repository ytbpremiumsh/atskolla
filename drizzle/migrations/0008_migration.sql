CREATE OR REPLACE FUNCTION public.profiles_guard_sensitive_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Proses sistem (service role / trigger internal) tidak punya auth.uid(): izinkan
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.current_points := 0;
    NEW.lifetime_points := 0;
    NEW.rfid_uid := NULL;
    NEW.qr_code := NULL;
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Tidak diizinkan mengubah user_id profil';
  END IF;

  IF NEW.school_id IS DISTINCT FROM OLD.school_id THEN
    RAISE EXCEPTION 'Perpindahan sekolah harus dilakukan oleh admin sekolah/super admin';
  END IF;

  IF NEW.current_points IS DISTINCT FROM OLD.current_points
     OR NEW.lifetime_points IS DISTINCT FROM OLD.lifetime_points THEN
    RAISE EXCEPTION 'Poin reward tidak dapat diubah manual oleh pengguna';
  END IF;

  IF NEW.rfid_uid IS DISTINCT FROM OLD.rfid_uid
     OR NEW.qr_code IS DISTINCT FROM OLD.qr_code THEN
    -- admin sekolah boleh set QR/RFID untuk anggota sekolahnya
    IF NOT (public.has_role(auth.uid(), 'school_admin'::app_role)
            AND NEW.school_id = public.get_user_school_id(auth.uid())) THEN
      RAISE EXCEPTION 'Identifier RFID/QR hanya dapat diubah oleh admin sekolah';
    END IF;
  END IF;

  IF NEW.referral_code IS DISTINCT FROM OLD.referral_code
     OR NEW.referred_by IS DISTINCT FROM OLD.referred_by THEN
    RAISE EXCEPTION 'Kode referral tidak dapat diubah setelah dibuat';
  END IF;

  RETURN NEW;
END;
$$;

-- Perbaiki akun Rizky Arif Fauzi (rizkyarif94@gmail.com) -> SMK Nusantara Indonesia
UPDATE public.profiles SET school_id = '01519e77-62af-4c3f-885d-a48d76ed4aeb', qr_code = COALESCE(qr_code, user_id::text)
WHERE user_id = '8eea7011-ea8c-4562-82a3-976c438cee77' AND school_id IS NULL;