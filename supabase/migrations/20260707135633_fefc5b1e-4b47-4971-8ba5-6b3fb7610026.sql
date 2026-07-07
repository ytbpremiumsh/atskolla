
-- Revoke all column-level SELECT from anon, then re-grant only safe public tenant-lookup columns.
REVOKE SELECT ON public.schools FROM anon;
GRANT SELECT (id, slug, name, logo, npsn, city) ON public.schools TO anon;
