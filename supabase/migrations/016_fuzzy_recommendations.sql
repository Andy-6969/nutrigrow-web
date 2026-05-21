-- ═══════════════════════════════════════════════════════════
-- Migration: Create fuzzy_recommendations table
-- Menyimpan hasil evaluasi fuzzy logic per zona
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS fuzzy_recommendations (
  id BIGSERIAL PRIMARY KEY,
  zone_id UUID REFERENCES zones(id),
  zone_name TEXT,
  -- Input sensor
  soil_moisture FLOAT,
  temperature FLOAT,
  humidity FLOAT,
  ph FLOAT,
  ec FLOAT,                          -- EC dalam mS/cm (bukan PPM!)
  will_rain BOOLEAN DEFAULT FALSE,
  -- Output irigasi
  irrigation_decision TEXT,          -- SIRAM_SEGERA, SIRAM, SIRAM_SEDIKIT, TIDAK_PERLU
  irrigation_score FLOAT,
  irrigation_duration INTEGER DEFAULT 0,
  -- Output pupuk
  fertilizer_decision TEXT,
  fertilizer_confidence FLOAT,
  fertilizer_action TEXT,
  nutrisi_ml FLOAT DEFAULT 0,
  ph_adjustment TEXT,                -- 'up', 'down', atau null
  -- Status
  status TEXT DEFAULT 'pending',     -- pending, approved, rejected, auto_executed
  auto_execute_at TIMESTAMPTZ,
  executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk query cepat
CREATE INDEX IF NOT EXISTS idx_fuzzy_zone ON fuzzy_recommendations(zone_id);
CREATE INDEX IF NOT EXISTS idx_fuzzy_status ON fuzzy_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_fuzzy_created ON fuzzy_recommendations(created_at DESC);

-- RLS Policy: service_role bisa semua, authenticated bisa baca
ALTER TABLE fuzzy_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON fuzzy_recommendations
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read" ON fuzzy_recommendations
  FOR SELECT TO authenticated USING (true);
