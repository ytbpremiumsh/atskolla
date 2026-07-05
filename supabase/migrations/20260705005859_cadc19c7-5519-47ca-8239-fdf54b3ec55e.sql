
-- =========================================================================
-- 1) schools: restrict anon SELECT to safe columns only (tenant resolution)
-- =========================================================================
DROP POLICY IF EXISTS "Public can view schools for tenant resolution" ON public.schools;

-- Re-create policy scoped to anon only. Authenticated users continue to use
-- "Users view own school" / "Super admins manage all schools" for full access.
CREATE POLICY "Anon tenant lookup"
ON public.schools
FOR SELECT
TO anon
USING (true);

-- Column-level privileges: anon may only read the 4 tenant-resolution columns.
REVOKE SELECT ON public.schools FROM anon;
GRANT SELECT (id, name, slug, logo) ON public.schools TO anon;

-- =========================================================================
-- 2) storage: ticket-attachments read scoped to owning school / super admin
-- =========================================================================
DROP POLICY IF EXISTS "Anyone can view ticket attachments" ON storage.objects;

CREATE POLICY "School members view own ticket attachments"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ticket-attachments'
  AND (
    public.has_role(auth.uid(), 'super_admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id::text = split_part(storage.objects.name, '/', 1)
        AND t.school_id = public.get_user_school_id(auth.uid())
    )
  )
);

-- =========================================================================
-- 3) user_roles: allow-list of grantable roles for school admins
-- =========================================================================
DROP POLICY IF EXISTS "School admins insert school user roles" ON public.user_roles;
DROP POLICY IF EXISTS "School admins delete school user roles" ON public.user_roles;

CREATE POLICY "School admins insert school user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'school_admin'::public.app_role)
  AND user_id IN (
    SELECT p.user_id FROM public.profiles p
    WHERE p.school_id = public.get_user_school_id(auth.uid())
  )
  AND role = ANY (ARRAY['staff'::public.app_role, 'teacher'::public.app_role, 'bendahara'::public.app_role])
);

CREATE POLICY "School admins delete school user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'school_admin'::public.app_role)
  AND user_id IN (
    SELECT p.user_id FROM public.profiles p
    WHERE p.school_id = public.get_user_school_id(auth.uid())
  )
  AND role = ANY (ARRAY['staff'::public.app_role, 'teacher'::public.app_role, 'bendahara'::public.app_role])
);
