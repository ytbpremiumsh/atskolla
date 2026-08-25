DROP POLICY IF EXISTS "Anon read public platform settings" ON public.platform_settings;
CREATE POLICY "Anon read public platform settings"
ON public.platform_settings FOR SELECT
TO anon
USING (key IN (
  'login_logo_url','header_logo_url','favicon_url','hero_shadow_shapes_enabled',
  'landing_theme','meta_pixel_enabled','meta_pixel_id','ga_measurement_id',
  'addon_custom_domain_enabled','addon_idcard_enabled','addon_wa_credit_enabled',
  'wa_credit_price','wa_credit_per_pack','google_client_id','landing_popup'
));