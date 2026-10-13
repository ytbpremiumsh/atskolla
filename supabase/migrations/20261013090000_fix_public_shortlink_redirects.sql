-- Allow visitors to resolve active shortlinks without logging in.
-- The destination URL is intentionally public for redirect functionality.
ALTER TABLE public.short_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read active shortlinks" ON public.short_links;
CREATE POLICY "Public can read active shortlinks"
ON public.short_links
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Allow anonymous visitors to add click analytics without exposing link management.
ALTER TABLE public.short_link_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can record shortlink clicks" ON public.short_link_clicks;
CREATE POLICY "Public can record shortlink clicks"
ON public.short_link_clicks
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.short_links
    WHERE short_links.id = short_link_clicks.link_id
      AND short_links.is_active = true
  )
);
