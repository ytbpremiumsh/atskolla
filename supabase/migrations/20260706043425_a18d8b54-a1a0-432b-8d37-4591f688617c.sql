
-- Extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ===== rfid_devices =====
CREATE TABLE IF NOT EXISTS public.rfid_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL UNIQUE,
  serial_number TEXT NOT NULL UNIQUE,
  mac_address TEXT UNIQUE,
  activation_code TEXT NOT NULL,
  secret_token_hash TEXT,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  location_label TEXT,
  status TEXT NOT NULL DEFAULT 'unassigned',
  firmware_version TEXT,
  notes TEXT,
  last_ip TEXT,
  last_heartbeat_at TIMESTAMPTZ,
  last_online_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfid_devices TO authenticated;
GRANT ALL ON public.rfid_devices TO service_role;
ALTER TABLE public.rfid_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rfid_devices super admin all"
  ON public.rfid_devices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "rfid_devices school read"
  ON public.rfid_devices FOR SELECT TO authenticated
  USING (school_id IS NOT NULL AND school_id = public.get_user_school_id(auth.uid()));

CREATE TRIGGER trg_rfid_devices_updated_at
  BEFORE UPDATE ON public.rfid_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_rfid_devices_school ON public.rfid_devices(school_id);
CREATE INDEX idx_rfid_devices_status ON public.rfid_devices(status);

-- ===== rfid_device_licenses =====
CREATE TABLE IF NOT EXISTS public.rfid_device_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL UNIQUE REFERENCES public.schools(id) ON DELETE CASCADE,
  license_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfid_device_licenses TO authenticated;
GRANT ALL ON public.rfid_device_licenses TO service_role;
ALTER TABLE public.rfid_device_licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rfid_licenses super admin all"
  ON public.rfid_device_licenses FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "rfid_licenses school read"
  ON public.rfid_device_licenses FOR SELECT TO authenticated
  USING (school_id = public.get_user_school_id(auth.uid()));

CREATE TRIGGER trg_rfid_device_licenses_updated_at
  BEFORE UPDATE ON public.rfid_device_licenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== rfid_device_logs =====
CREATE TABLE IF NOT EXISTS public.rfid_device_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_ref UUID REFERENCES public.rfid_devices(id) ON DELETE CASCADE,
  device_id TEXT,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rfid_device_logs TO authenticated;
GRANT ALL ON public.rfid_device_logs TO service_role;
ALTER TABLE public.rfid_device_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rfid_logs super admin all"
  ON public.rfid_device_logs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "rfid_logs school read"
  ON public.rfid_device_logs FOR SELECT TO authenticated
  USING (school_id IS NOT NULL AND school_id = public.get_user_school_id(auth.uid()));

CREATE INDEX idx_rfid_logs_device ON public.rfid_device_logs(device_ref, created_at DESC);
CREATE INDEX idx_rfid_logs_school ON public.rfid_device_logs(school_id, created_at DESC);

-- ===== rfid_size_tiers =====
CREATE TABLE IF NOT EXISTS public.rfid_size_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  min_students INTEGER NOT NULL,
  max_students INTEGER,
  min_devices INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.rfid_size_tiers TO authenticated;
GRANT ALL ON public.rfid_size_tiers TO service_role;
ALTER TABLE public.rfid_size_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rfid_size_tiers super admin write"
  ON public.rfid_size_tiers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "rfid_size_tiers auth read"
  ON public.rfid_size_tiers FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER trg_rfid_size_tiers_updated_at
  BEFORE UPDATE ON public.rfid_size_tiers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.rfid_size_tiers (min_students, max_students, min_devices) VALUES
  (0, 300, 1),
  (301, 700, 2),
  (701, 1200, 3),
  (1201, NULL, 4);

-- ===== helper: required min devices for a school =====
CREATE OR REPLACE FUNCTION public.rfid_required_min_devices(_school_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH s AS (
    SELECT COUNT(*)::int AS n FROM public.students WHERE school_id = _school_id
  )
  SELECT COALESCE((
    SELECT min_devices FROM public.rfid_size_tiers, s
    WHERE s.n >= min_students AND (max_students IS NULL OR s.n <= max_students)
    ORDER BY min_students DESC LIMIT 1
  ), 1)
$$;

-- ===== mark offline job =====
CREATE OR REPLACE FUNCTION public.mark_offline_rfid_devices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id, device_id, school_id
    FROM public.rfid_devices
    WHERE status = 'active'
      AND last_heartbeat_at IS NOT NULL
      AND last_heartbeat_at < now() - INTERVAL '3 minutes'
  LOOP
    UPDATE public.rfid_devices SET status = 'inactive' WHERE id = r.id;
    INSERT INTO public.rfid_device_logs (device_ref, device_id, school_id, event_type, payload)
    VALUES (r.id, r.device_id, r.school_id, 'offline', jsonb_build_object('reason','no_heartbeat'));
  END LOOP;
END;
$$;
