-- Resolve active shortlinks for anonymous visitors without requiring table SELECT permissions.
-- The function intentionally returns only the destination for one active shortlink.
CREATE OR REPLACE FUNCTION public.resolve_shortlink(_code text)
RETURNS TABLE (link_id uuid, target_url text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT sl.id, sl.target_url
  FROM public.short_links AS sl
  WHERE lower(sl.code) = lower(btrim(_code))
    AND sl.is_active = true
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.resolve_shortlink(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_shortlink(text) TO anon, authenticated;
