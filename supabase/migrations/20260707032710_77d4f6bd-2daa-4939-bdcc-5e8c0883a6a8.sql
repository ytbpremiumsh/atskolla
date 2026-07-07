-- Allow school_admin to assign/remove 'principal' role in addition to staff/teacher/bendahara
DROP POLICY IF EXISTS "School admins insert school user roles" ON public.user_roles;
DROP POLICY IF EXISTS "School admins delete school user roles" ON public.user_roles;

CREATE POLICY "School admins insert school user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'school_admin'::app_role)
  AND user_id IN (SELECT p.user_id FROM profiles p WHERE p.school_id = get_user_school_id(auth.uid()))
  AND role = ANY (ARRAY['staff'::app_role, 'teacher'::app_role, 'bendahara'::app_role, 'principal'::app_role])
);

CREATE POLICY "School admins delete school user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'school_admin'::app_role)
  AND user_id IN (SELECT p.user_id FROM profiles p WHERE p.school_id = get_user_school_id(auth.uid()))
  AND role = ANY (ARRAY['staff'::app_role, 'teacher'::app_role, 'bendahara'::app_role, 'principal'::app_role])
);