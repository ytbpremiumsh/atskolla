ALTER TABLE public.class_teachers
  ADD CONSTRAINT class_teachers_school_class_unique UNIQUE (school_id, class_name);