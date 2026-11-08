-- Align the academic calendar with Operator schedule and holiday management.
DROP POLICY IF EXISTS "Operators manage own academic calendar" ON public.school_holidays;
CREATE POLICY "Operators manage own academic calendar" ON public.school_holidays
FOR ALL TO authenticated
USING (school_id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'staff'::public.app_role))
WITH CHECK (school_id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'staff'::public.app_role));
