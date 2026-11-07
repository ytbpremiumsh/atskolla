-- Keep older approved accounts working; new forms collect branch and evidence.
ALTER TABLE public.bendahara_bank_accounts
  ADD COLUMN IF NOT EXISTS bank_branch text,
  ADD COLUMN IF NOT EXISTS bank_book_path text;
ALTER TABLE public.bendahara_bank_accounts
  ADD CONSTRAINT bank_branch_length CHECK (bank_branch IS NULL OR length(btrim(bank_branch)) BETWEEN 1 AND 120),
  ADD CONSTRAINT bank_book_school_path CHECK (bank_book_path IS NULL OR (
    split_part(bank_book_path, '/', 1) = school_id::text
    AND bank_book_path ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
  ));

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('bank-account-documents','bank-account-documents',false,5242880,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT(id) DO UPDATE SET public=false,file_size_limit=5242880,allowed_mime_types=EXCLUDED.allowed_mime_types;

CREATE POLICY "Bank evidence read by own finance staff or super admin"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id='bank-account-documents' AND (
  public.has_role(auth.uid(),'super_admin') OR (
    (storage.foldername(name))[1]=public.get_user_school_id(auth.uid())::text
    AND (public.has_role(auth.uid(),'bendahara') OR public.has_role(auth.uid(),'school_admin'))
  )
));
CREATE POLICY "Bank evidence upload by own finance staff"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='bank-account-documents'
  AND (storage.foldername(name))[1]=public.get_user_school_id(auth.uid())::text
  AND (storage.foldername(name))[2]=auth.uid()::text
  AND (public.has_role(auth.uid(),'bendahara') OR public.has_role(auth.uid(),'school_admin'))
);
-- Only failed/unsubmitted uploads can be removed; linked verification evidence is retained.
CREATE POLICY "Finance staff remove own unsubmitted bank evidence"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='bank-account-documents'
  AND (storage.foldername(name))[1]=public.get_user_school_id(auth.uid())::text
  AND (storage.foldername(name))[2]=auth.uid()::text
  AND (public.has_role(auth.uid(),'bendahara') OR public.has_role(auth.uid(),'school_admin'))
  AND NOT EXISTS (SELECT 1 FROM public.bendahara_bank_accounts a WHERE a.bank_book_path=storage.objects.name)
);
NOTIFY pgrst, 'reload schema';
