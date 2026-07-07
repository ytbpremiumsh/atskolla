
REVOKE SELECT ON public.schools FROM anon;
GRANT SELECT (
  id, name, slug, logo, city, province, timezone,
  holiday_mode, holiday_mode_label, holiday_days,
  rfid_mode, group_id, slug_updated_at, created_at
) ON public.schools TO anon;
