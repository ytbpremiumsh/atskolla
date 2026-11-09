-- Keep each school's custom message; replace only the obsolete standard footer.
DO $migration$
DECLARE c record; new_default text;
BEGIN
  FOR c IN SELECT column_name,column_default FROM information_schema.columns
    WHERE table_schema='public' AND table_name='school_integrations'
      AND column_name IN ('attendance_arrive_template','attendance_depart_template','attendance_group_template')
  LOOP
    new_default := replace(c.column_default, '_Pesan otomatis dari Smart School Attendance System_', 'Pesan otomatis dari sistem atskolla');
    IF new_default IS DISTINCT FROM c.column_default THEN
      EXECUTE format('ALTER TABLE public.school_integrations ALTER COLUMN %I SET DEFAULT %s',c.column_name,new_default);
    END IF;
    EXECUTE format('UPDATE public.school_integrations SET %1$I = replace(%1$I, %2$L, %3$L) WHERE %1$I LIKE %4$L',
      c.column_name, '_Pesan otomatis dari Smart School Attendance System_', 'Pesan otomatis dari sistem atskolla', '%%_Pesan otomatis dari Smart School Attendance System_%%');
  END LOOP;
END $migration$;
