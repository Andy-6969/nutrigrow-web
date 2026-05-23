-- ═══════════════════════════════════════════════════════════
-- Migration 017: Eco-Savings — Log penghematan air & pengaturan sistem
-- ═══════════════════════════════════════════════════════════

-- Log setiap kali fuzzy logic mengurangi/membatalkan penyiraman
CREATE TABLE IF NOT EXISTS eco_savings_log (
  id BIGSERIAL PRIMARY KEY,
  zone_id UUID REFERENCES zones(id),
  zone_name TEXT,
  normal_duration INTEGER DEFAULT 0,       -- durasi tanpa eco (menit)
  eco_duration INTEGER DEFAULT 0,          -- durasi dengan eco (menit)
  water_saved_liters FLOAT DEFAULT 0,      -- liter air yang dihemat
  reason TEXT,                             -- 'humidity_reduction', 'rain_block', 'eco_mode', 'combined'
  eco_mode_active BOOLEAN DEFAULT FALSE,
  humidity_at_time FLOAT,
  will_rain_at_time BOOLEAN DEFAULT FALSE,
  recommendation_id BIGINT REFERENCES fuzzy_recommendations(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pengaturan sistem global (eco mode on/off, tarif, dll)
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID
);

-- Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_eco_savings_zone ON eco_savings_log(zone_id);
CREATE INDEX IF NOT EXISTS idx_eco_savings_created ON eco_savings_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eco_savings_reason ON eco_savings_log(reason);

-- RLS Policies
ALTER TABLE eco_savings_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on eco_savings_log" ON eco_savings_log
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read eco_savings_log" ON eco_savings_log
  FOR SELECT TO authenticated USING (true);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on system_settings" ON system_settings
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read system_settings" ON system_settings
  FOR SELECT TO authenticated USING (true);

-- Seed default eco mode (off) dan tarif
INSERT INTO system_settings (key, value) VALUES
  ('eco_mode', '{"enabled": false}'),
  ('eco_tariff', '{"water_per_m3": 5000, "energy_per_kwh": 1500, "pump_watt": 75}')
ON CONFLICT (key) DO NOTHING;
