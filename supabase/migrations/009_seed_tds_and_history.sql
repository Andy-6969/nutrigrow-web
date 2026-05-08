-- ============================================================
-- NutriGrow: Migration 009 — Seed Data Sensor TDS untuk Testing
-- Jalankan SETELAH migration 007 dan 008 berhasil
-- ============================================================

-- ─── Tambahkan TDS ke data sensor yang sudah ada ─────────────
-- Update seed data dengan nilai TDS realistis untuk demo
UPDATE public.sensor_data
SET tds = CASE
  WHEN zone_id = '10000000-0000-0000-0000-000000000001' THEN 1.85  -- Cabai Merah  → Normal
  WHEN zone_id = '10000000-0000-0000-0000-000000000002' THEN 2.40  -- Tomat Cherry → Normal (mendekati tinggi)
  WHEN zone_id = '10000000-0000-0000-0000-000000000003' THEN 1.20  -- Selada       → Rendah
  WHEN zone_id = '10000000-0000-0000-0000-000000000004' THEN 3.10  -- Bayam        → Tinggi
  WHEN zone_id = '10000000-0000-0000-0000-000000000005' THEN 1.95  -- Kangkung     → Normal
  ELSE NULL
END
WHERE zone_id IN (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000005'
);

-- ─── Seed Growth Stage ke zona demo ──────────────────────────
UPDATE public.zones SET
  planting_date = CURRENT_DATE - INTERVAL '35 days',
  plant_type    = 'tomato',
  plant_count   = 150
WHERE id = '10000000-0000-0000-0000-000000000002'; -- Zona B Tomat Cherry → Fase Vegetatif (hari 35)

UPDATE public.zones SET
  planting_date = CURRENT_DATE - INTERVAL '8 days',
  plant_type    = 'cabai',
  plant_count   = 200
WHERE id = '10000000-0000-0000-0000-000000000001'; -- Zona A Cabai → Fase Bibit

UPDATE public.zones SET
  planting_date = CURRENT_DATE - INTERVAL '20 days',
  plant_type    = 'lettuce',
  plant_count   = 500
WHERE id = '10000000-0000-0000-0000-000000000003'; -- Zona C Selada → Fase Pertumbuhan Daun

-- ─── Generate data historis sensor 24 jam untuk testing ───────
-- Buat 48 data poin (setiap 30 menit) untuk Zona A dan Zona B
DO $$
DECLARE
  i INTEGER;
  v_time TIMESTAMPTZ;
BEGIN
  FOR i IN 0..47 LOOP
    v_time := NOW() - ((47 - i) * INTERVAL '30 minutes');

    -- Zona A: Cabai (TDS rendah, fase bibit)
    INSERT INTO public.sensor_data (zone_id, soil_moisture, temperature, humidity, ph, tds, battery, rssi, recorded_at)
    VALUES (
      '10000000-0000-0000-0000-000000000001',
      45 + (sin(i * 0.3) * 12) + (random() * 5 - 2.5),      -- 33–62%
      27 + (sin(i * 0.15) * 4) + (random() * 1.5 - 0.75),   -- 22–32°C
      65 + (cos(i * 0.2) * 10) + (random() * 3 - 1.5),      -- 54–78%
      6.5 + (sin(i * 0.1) * 0.4) + (random() * 0.2 - 0.1),  -- 5.9–7.1
      0.9 + (sin(i * 0.05) * 0.2) + (random() * 0.1 - 0.05),-- 0.65–1.25 mS/cm (fase bibit)
      87 - (i * 0.05),
      -55 + (random() * 10 - 5)::INTEGER,
      v_time
    );

    -- Zona B: Tomat (TDS normal-tinggi, fase vegetatif)
    INSERT INTO public.sensor_data (zone_id, soil_moisture, temperature, humidity, ph, tds, battery, rssi, recorded_at)
    VALUES (
      '10000000-0000-0000-0000-000000000002',
      60 + (sin(i * 0.25) * 15) + (random() * 5 - 2.5),     -- 42–80%
      26.5 + (sin(i * 0.12) * 5) + (random() * 1.5 - 0.75), -- 20–33°C
      75 + (cos(i * 0.18) * 8) + (random() * 3 - 1.5),      -- 64–86%
      6.4 + (sin(i * 0.08) * 0.5) + (random() * 0.2 - 0.1), -- 5.7–7.1
      1.7 + (sin(i * 0.06) * 0.4) + (random() * 0.15),      -- 1.3–2.25 mS/cm (fase vegetatif)
      92 - (i * 0.04),
      -48 + (random() * 8 - 4)::INTEGER,
      v_time
    );
  END LOOP;
END;
$$;

-- ─── Tambah override_logs mode column jika belum ada ──────────
ALTER TABLE public.override_logs
  ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'water'
    CHECK (mode IN ('water', 'fertigation', 'fertilizer', 'pump', 'solenoid'));

-- ─── Insert sample override log untuk testing ─────────────────
INSERT INTO public.override_logs (zone_id, zone_name, user_name, mode, duration_minutes, reason, status, started_at, ended_at)
VALUES
  (
    '10000000-0000-0000-0000-000000000002',
    'Zona B - Kebun Timur',
    'Maulana Daviq',
    'fertigation',
    20,
    'EC drop di bawah 1.5, perlu penambahan nutrisi manual',
    'completed',
    NOW() - INTERVAL '3 hours',
    NOW() - INTERVAL '2 hours 40 minutes'
  ),
  (
    '10000000-0000-0000-0000-000000000001',
    'Zona A - Kebun Barat',
    'Admin NutriGrow',
    'water',
    15,
    'Test override penyiraman manual',
    'completed',
    NOW() - INTERVAL '6 hours',
    NOW() - INTERVAL '5 hours 45 minutes'
  )
ON CONFLICT DO NOTHING;

-- ─── Verifikasi ───────────────────────────────────────────────
-- Cek apakah TDS sudah terisi
SELECT zone_id, COUNT(*) as total_readings, 
       ROUND(AVG(tds)::NUMERIC, 3) as avg_tds,
       MIN(recorded_at) as oldest,
       MAX(recorded_at) as newest
FROM public.sensor_data
WHERE tds IS NOT NULL
GROUP BY zone_id
ORDER BY zone_id;
