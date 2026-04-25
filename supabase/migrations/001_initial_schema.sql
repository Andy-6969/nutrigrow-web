-- ============================================================
-- NutriGrow: Initial Database Schema
-- Run this in: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- ─── 1. FARMS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.farms (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  location_lat  DOUBLE PRECISION NOT NULL DEFAULT 0,
  location_lng  DOUBLE PRECISION NOT NULL DEFAULT 0,
  total_area_ha DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. ZONES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.zones (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id     UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  area_ha     DOUBLE PRECISION NOT NULL DEFAULT 0,
  crop_type   TEXT NOT NULL DEFAULT 'Sayuran',
  status      TEXT NOT NULL DEFAULT 'idle' CHECK (status IN ('idle', 'irrigating', 'delayed', 'error')),
  layout_json JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 3. USER PROFILES ────────────────────────────────────────
-- Extends Supabase auth.users with app-specific fields
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email          TEXT,
  full_name      TEXT,
  role           TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'manager', 'operator', 'viewer')),
  farm_id        UUID REFERENCES public.farms(id),
  assigned_zones UUID[] DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 4. SENSOR DATA ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sensor_data (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id       UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  soil_moisture DOUBLE PRECISION NOT NULL DEFAULT 0,
  temperature   DOUBLE PRECISION NOT NULL DEFAULT 0,
  humidity      DOUBLE PRECISION NOT NULL DEFAULT 0,
  ph            DOUBLE PRECISION NOT NULL DEFAULT 7.0,
  battery       DOUBLE PRECISION,
  rssi          INTEGER,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sensor_data_zone_recorded ON public.sensor_data(zone_id, recorded_at DESC);

-- ─── 5. DEVICES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.devices (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id          UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  zone_name        TEXT,
  device_type      TEXT NOT NULL CHECK (device_type IN ('sensor', 'actuator', 'gateway')),
  firmware_version TEXT NOT NULL DEFAULT '1.0.0',
  battery_level    DOUBLE PRECISION NOT NULL DEFAULT 100,
  rssi             INTEGER NOT NULL DEFAULT -60,
  last_heartbeat   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_online        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 6. OVERRIDE LOGS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.override_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id          UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  zone_name        TEXT NOT NULL,
  user_name        TEXT NOT NULL DEFAULT 'System',
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  reason           TEXT,
  started_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at         TIMESTAMPTZ,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled'))
);
CREATE INDEX IF NOT EXISTS idx_override_logs_status ON public.override_logs(status);

-- ─── 7. IRRIGATION LOGS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.irrigation_logs (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id             UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  zone_name           TEXT NOT NULL,
  source              TEXT NOT NULL DEFAULT 'auto' CHECK (source IN ('auto', 'manual_override', 'schedule')),
  duration_minutes    INTEGER NOT NULL DEFAULT 0,
  water_volume_liters DOUBLE PRECISION NOT NULL DEFAULT 0,
  started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at            TIMESTAMPTZ,
  status              TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'cancelled', 'error'))
);
CREATE INDEX IF NOT EXISTS idx_irrigation_logs_status ON public.irrigation_logs(status);

-- ─── 8. NOTIFICATIONS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('smart_delay', 'cycle_complete', 'device_alert', 'override')),
  zone_name  TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ENABLE REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_data;
ALTER PUBLICATION supabase_realtime ADD TABLE public.override_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.irrigation_logs;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.farms            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.zones            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_data      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.override_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irrigation_logs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles    ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all farm data
CREATE POLICY "Authenticated users can read farms"
  ON public.farms FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can read zones"
  ON public.zones FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can read sensor data"
  ON public.sensor_data FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can read devices"
  ON public.devices FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can read override logs"
  ON public.override_logs FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can insert override logs"
  ON public.override_logs FOR INSERT TO authenticated WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update override logs"
  ON public.override_logs FOR UPDATE TO authenticated USING (TRUE);

CREATE POLICY "Authenticated users can read irrigation logs"
  ON public.irrigation_logs FOR SELECT TO authenticated USING (TRUE);

CREATE POLICY "Users can read their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can read their own profile"
  ON public.user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- ============================================================
-- SEED DATA (Sample Farm & Zones for development)
-- ============================================================

-- Insert a demo farm
INSERT INTO public.farms (id, name, location_lat, location_lng, total_area_ha)
VALUES ('00000000-0000-0000-0000-000000000001', 'Kebun Demo NutriGrow', -6.2088, 106.8456, 12.5)
ON CONFLICT (id) DO NOTHING;

-- Insert demo zones
INSERT INTO public.zones (id, farm_id, name, area_ha, crop_type, status) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Zona A - Kebun Barat',  2.5, 'Cabai Merah',  'idle'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Zona B - Kebun Timur',  3.0, 'Tomat Cherry', 'irrigating'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Zona C - Kebun Utara',  2.0, 'Selada Keriting','idle'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Zona D - Kebun Selatan',2.5, 'Bayam Hijau',  'delayed'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Zona E - Kebun Tengah', 2.5, 'Kangkung',     'idle')
ON CONFLICT (id) DO NOTHING;

-- Insert demo sensor readings
INSERT INTO public.sensor_data (zone_id, soil_moisture, temperature, humidity, ph, battery, rssi) VALUES
  ('10000000-0000-0000-0000-000000000001', 62.5, 28.3, 74.1, 6.8, 87.0, -55),
  ('10000000-0000-0000-0000-000000000002', 78.2, 27.9, 80.5, 6.5, 92.0, -48),
  ('10000000-0000-0000-0000-000000000003', 45.0, 29.1, 68.3, 7.1, 65.0, -62),
  ('10000000-0000-0000-0000-000000000004', 38.7, 30.4, 65.9, 6.9, 78.0, -70),
  ('10000000-0000-0000-0000-000000000005', 55.3, 28.7, 72.0, 7.0, 95.0, -45);

-- Insert demo devices
INSERT INTO public.devices (zone_id, zone_name, device_type, firmware_version, battery_level, rssi, is_online) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Zona A - Kebun Barat',   'sensor',   'v2.4.1', 87.0, -55, TRUE),
  ('10000000-0000-0000-0000-000000000001', 'Zona A - Kebun Barat',   'actuator', 'v1.9.3', 100,  -50, TRUE),
  ('10000000-0000-0000-0000-000000000002', 'Zona B - Kebun Timur',   'sensor',   'v2.4.1', 92.0, -48, TRUE),
  ('10000000-0000-0000-0000-000000000003', 'Zona C - Kebun Utara',   'sensor',   'v2.3.0', 65.0, -62, TRUE),
  ('10000000-0000-0000-0000-000000000004', 'Zona D - Kebun Selatan', 'sensor',   'v2.4.1', 78.0, -70, FALSE),
  ('10000000-0000-0000-0000-000000000005', 'Zona E - Kebun Tengah',  'gateway',  'v3.1.0', 95.0, -45, TRUE);

-- Insert demo irrigation history
INSERT INTO public.irrigation_logs (zone_id, zone_name, source, duration_minutes, water_volume_liters, status, started_at, ended_at) VALUES
  ('10000000-0000-0000-0000-000000000002', 'Zona B - Kebun Timur',   'auto',            20, 450.0, 'running',   NOW() - INTERVAL '15 minutes', NULL),
  ('10000000-0000-0000-0000-000000000001', 'Zona A - Kebun Barat',   'schedule',        30, 680.0, 'completed', NOW() - INTERVAL '2 hours',    NOW() - INTERVAL '90 minutes'),
  ('10000000-0000-0000-0000-000000000003', 'Zona C - Kebun Utara',   'manual_override', 15, 320.0, 'completed', NOW() - INTERVAL '5 hours',    NOW() - INTERVAL '4.75 hours'),
  ('10000000-0000-0000-0000-000000000005', 'Zona E - Kebun Tengah',  'auto',            25, 560.0, 'completed', NOW() - INTERVAL '8 hours',    NOW() - INTERVAL '7.58 hours');
