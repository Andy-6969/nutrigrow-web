-- ═══════════════════════════════════════════════════════════
-- Migration 018: Eco-mode per zone
-- ═══════════════════════════════════════════════════════════

-- Tambah kolom eco_mode ke tabel zones
ALTER TABLE public.zones ADD COLUMN IF NOT EXISTS eco_mode BOOLEAN NOT NULL DEFAULT FALSE;

-- Buat index untuk optimasi pencarian zona yang mengaktifkan eco mode
CREATE INDEX IF NOT EXISTS idx_zones_eco_mode ON public.zones(eco_mode);
