-- Operator/staff can manage academic schedules within their own school.
DROP POLICY IF EXISTS "Operators manage own school schedules" ON public.teaching_schedules;
CREATE POLICY "Operators manage own school schedules" ON public.teaching_schedules
FOR ALL TO authenticated
USING (school_id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'staff'::public.app_role))
WITH CHECK (school_id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'staff'::public.app_role));

DROP POLICY IF EXISTS "Operators manage own school subjects" ON public.subjects;
CREATE POLICY "Operators manage own school subjects" ON public.subjects
FOR ALL TO authenticated
USING (school_id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'staff'::public.app_role))
WITH CHECK (school_id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'staff'::public.app_role));

-- RLS limits rows; this invoker trigger additionally limits which school fields
-- an operator may change. Keep existing admin and system-trigger behavior intact.
CREATE OR REPLACE FUNCTION public.schools_guard_operator_holiday_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND public.has_role(auth.uid(), 'staff'::public.app_role)
     AND NOT public.has_role(auth.uid(), 'school_admin'::public.app_role)
     AND NOT public.has_role(auth.uid(), 'super_admin'::public.app_role)
     AND pg_trigger_depth() = 1
     AND (to_jsonb(NEW) - ARRAY['holiday_mode','holiday_mode_label','holiday_days'])
         IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['holiday_mode','holiday_mode_label','holiday_days']) THEN
    RAISE EXCEPTION 'Operator hanya dapat mengubah pengaturan hari libur sekolah' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.schools_guard_operator_holiday_fields() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_schools_guard_operator_holiday_fields ON public.schools;
CREATE TRIGGER trg_schools_guard_operator_holiday_fields
BEFORE UPDATE ON public.schools FOR EACH ROW
EXECUTE FUNCTION public.schools_guard_operator_holiday_fields();

DROP POLICY IF EXISTS "Operators update own school holiday settings" ON public.schools;
CREATE POLICY "Operators update own school holiday settings" ON public.schools
FOR UPDATE TO authenticated
USING (id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'staff'::public.app_role))
WITH CHECK (id = public.get_user_school_id(auth.uid()) AND public.has_role(auth.uid(), 'staff'::public.app_role));
