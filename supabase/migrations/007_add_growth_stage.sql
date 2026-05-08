-- Migration 007: Add growth stage support to zones table
-- Menambahkan kolom planting_date dan plant_type untuk fitur jadwal berbasis umur tanaman

ALTER TABLE public.zones
  ADD COLUMN IF NOT EXISTS planting_date    DATE,
  ADD COLUMN IF NOT EXISTS plant_type       TEXT DEFAULT 'tomato' CHECK (plant_type IN ('tomato', 'cabai', 'lettuce', 'custom')),
  ADD COLUMN IF NOT EXISTS plant_count      INTEGER DEFAULT 0;

-- Tambahkan kolom TDS ke tabel sensor_data jika belum ada
ALTER TABLE public.sensor_data
  ADD COLUMN IF NOT EXISTS tds  NUMERIC(6, 3);  -- mS/cm, contoh: 1.850

-- Index untuk query berdasarkan planting_date
CREATE INDEX IF NOT EXISTS idx_zones_planting_date ON public.zones (planting_date)
  WHERE planting_date IS NOT NULL;

-- Komentar kolom (opsional, untuk dokumentasi DB)
COMMENT ON COLUMN public.zones.planting_date IS 'Tanggal tanam aktual, digunakan untuk kalkulasi fase pertumbuhan';
COMMENT ON COLUMN public.zones.plant_type    IS 'Jenis tanaman: tomato | cabai | lettuce | custom';
COMMENT ON COLUMN public.zones.plant_count   IS 'Jumlah tanaman di zona ini';
COMMENT ON COLUMN public.sensor_data.tds     IS 'TDS / EC dalam mS/cm dari sensor analog ESP32';
