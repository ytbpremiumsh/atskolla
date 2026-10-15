-- Idempotent production fix for root shortlinks such as https://atskolla.com/beasiswa.
-- Run through the connected Lovable/Supabase database migration workflow.
CREATE OR REPLACE FUNCTION public.resolve_shortlink(_code text)
RETURNS TABLE (link_id uuid, target_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $function$
  SELECT sl.id, sl.target_url
  FROM public.short_links AS sl
  WHERE lower(btrim(sl.code)) = lower(btrim(_code))
    AND sl.is_active IS TRUE
  ORDER BY sl.created_at DESC NULLS LAST
  LIMIT 1;
$function$;

REVOKE ALL ON FUNCTION public.resolve_shortlink(text) FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_shortlink(text) TO anon, authenticated;

-- Keep destinations private from broad table reads; the RPC only returns the
-- destination for the single requested active code.
DROP POLICY IF EXISTS "Public can read active shortlinks" ON public.short_links;
DROP POLICY IF EXISTS "Public can record shortlink clicks" ON public.short_link_clicks;
