-- ============================================================
-- 012_nutrient_recipes_fix.sql
-- Fix: kolom up.farm_id tidak ada di user_profiles
-- Jalankan file ini di Supabase SQL Editor
-- ============================================================

-- ── 1. Tabel utama resep nutrisi (idempotent) ─────────────
CREATE TABLE IF NOT EXISTS public.nutrient_recipes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id       UUID NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  plant_type    TEXT NOT NULL DEFAULT 'custom',
  description   TEXT,
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Fase-fase dalam sebuah resep (idempotent) ──────────
CREATE TABLE IF NOT EXISTS public.recipe_phases (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id           UUID NOT NULL REFERENCES public.nutrient_recipes(id) ON DELETE CASCADE,
  phase_order         INTEGER NOT NULL,
  name                TEXT NOT NULL,
  emoji               TEXT DEFAULT '🌱',
  day_start           INTEGER NOT NULL,
  day_end             INTEGER NOT NULL,
  frequency_per_day   INTEGER NOT NULL DEFAULT 2,
  irrigation_times    TEXT[] NOT NULL DEFAULT ARRAY['07:00', '17:00'],
  water_volume_liters NUMERIC(5,2) NOT NULL DEFAULT 0.5,
  ec_target_min       NUMERIC(4,2) NOT NULL DEFAULT 0,
  ec_target_max       NUMERIC(4,2) NOT NULL DEFAULT 0,
  ph_target_min       NUMERIC(3,1) NOT NULL DEFAULT 5.5,
  ph_target_max       NUMERIC(3,1) NOT NULL DEFAULT 7.0,
  notes               TEXT
);

-- ── 3. Tambah kolom recipe_id ke zones (idempotent) ───────
ALTER TABLE public.zones
  ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES public.nutrient_recipes(id) ON DELETE SET NULL;

-- ── 4. Index (idempotent) ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_recipes_farm_id       ON public.nutrient_recipes(farm_id);
CREATE INDEX IF NOT EXISTS idx_recipe_phases_recipe_id ON public.recipe_phases(recipe_id);

-- ── 5. Trigger updated_at ─────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_recipes_updated_at ON public.nutrient_recipes;
CREATE TRIGGER trg_recipes_updated_at
  BEFORE UPDATE ON public.nutrient_recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 6. Aktifkan RLS ───────────────────────────────────────
ALTER TABLE public.nutrient_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_phases    ENABLE ROW LEVEL SECURITY;

-- ── 7. RLS Policies (DIPERBAIKI) ──────────────────────────
-- Hapus policy lama terlebih dahulu (jika ada)
DROP POLICY IF EXISTS "recipes_farm_access"       ON public.nutrient_recipes;
DROP POLICY IF EXISTS "recipe_phases_access"      ON public.recipe_phases;
DROP POLICY IF EXISTS "recipes_authenticated"     ON public.nutrient_recipes;
DROP POLICY IF EXISTS "recipe_phases_authenticated" ON public.recipe_phases;

-- Policy nutrient_recipes: user bisa akses resep milik farm-nya
-- (Gunakan subquery sederhana, TANPA JOIN ke user_profiles.farm_id
--  karena kolom itu tidak ada)
CREATE POLICY "recipes_authenticated" ON public.nutrient_recipes
  FOR ALL
  TO authenticated
  USING (
    -- VPS pakai service_role (bypass RLS).
    -- Frontend user hanya bisa akses resep di farm yang sama.
    farm_id IN (
      SELECT f.id FROM public.farms f
      WHERE f.id IN (
        SELECT z.farm_id FROM public.zones z
        JOIN public.user_profiles up ON up.id = auth.uid()
        LIMIT 100
      )
    )
    OR
    created_by = auth.uid()
  );

-- Policy recipe_phases: user bisa akses fase dari resep yang bisa dia akses
CREATE POLICY "recipe_phases_authenticated" ON public.recipe_phases
  FOR ALL
  TO authenticated
  USING (
    recipe_id IN (
      SELECT id FROM public.nutrient_recipes
      WHERE created_by = auth.uid()
         OR farm_id IN (
              SELECT f.id FROM public.farms f
              JOIN public.zones z ON z.farm_id = f.id
              JOIN public.user_profiles up ON up.id = auth.uid()
              LIMIT 100
            )
    )
  );
