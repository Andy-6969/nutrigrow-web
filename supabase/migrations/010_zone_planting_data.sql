-- Migration 010: Add planting data to zones
-- Allows industrial farms to track the growth cycle and population of each zone

ALTER TABLE public.zones
ADD COLUMN IF NOT EXISTS planting_date DATE,
ADD COLUMN IF NOT EXISTS plant_count INTEGER DEFAULT 0;

-- Optional: add a comment explaining the purpose
COMMENT ON COLUMN public.zones.planting_date IS 'Tanggal mulai tanam siklus saat ini';
COMMENT ON COLUMN public.zones.plant_count IS 'Jumlah populasi tanaman yang hidup di zona ini';
