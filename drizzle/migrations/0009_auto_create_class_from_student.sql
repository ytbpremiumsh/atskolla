CREATE OR REPLACE FUNCTION public.students_ensure_class()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.school_id IS NOT NULL AND COALESCE(trim(NEW.class),'') <> ''
     AND NOT EXISTS (SELECT 1 FROM public.classes WHERE school_id = NEW.school_id AND name = trim(NEW.class)) THEN
    INSERT INTO public.classes (school_id, name) VALUES (NEW.school_id, trim(NEW.class));
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS students_ensure_class ON public.students;
CREATE TRIGGER students_ensure_class AFTER INSERT OR UPDATE OF class ON public.students
FOR EACH ROW EXECUTE FUNCTION public.students_ensure_class();

-- Backfill: buat kelas yang hilang dari data siswa
INSERT INTO public.classes (school_id, name)
SELECT DISTINCT s.school_id, trim(s.class) FROM public.students s
WHERE COALESCE(trim(s.class),'') <> ''
  AND NOT EXISTS (SELECT 1 FROM public.classes c WHERE c.school_id = s.school_id AND c.name = trim(s.class));