-- 012_nutrient_recipes.sql
-- Custom Nutrient Recipe Builder — NutriGrow Smart Fertigation

-- ── Tabel utama resep nutrisi ────────────────────────────────────────────────
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

-- ── Fase-fase dalam sebuah resep ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.recipe_phases (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id         UUID NOT NULL REFERENCES public.nutrient_recipes(id) ON DELETE CASCADE,
  phase_order       INTEGER NOT NULL,              -- urutan fase (1, 2, 3, ...)
  name              TEXT NOT NULL,                 -- "Perkecambahan", "Vegetatif", dll.
  emoji             TEXT DEFAULT '🌱',
  day_start         INTEGER NOT NULL,
  day_end           INTEGER NOT NULL,
  frequency_per_day INTEGER NOT NULL DEFAULT 2,
  irrigation_times  TEXT[] NOT NULL DEFAULT ARRAY['07:00', '17:00'],
  water_volume_liters NUMERIC(5,2) NOT NULL DEFAULT 0.5,
  ec_target_min     NUMERIC(4,2) NOT NULL DEFAULT 0,
  ec_target_max     NUMERIC(4,2) NOT NULL DEFAULT 0,
  ph_target_min     NUMERIC(3,1) NOT NULL DEFAULT 5.5,
  ph_target_max     NUMERIC(3,1) NOT NULL DEFAULT 7.0,
  notes             TEXT
);

-- ── Link resep ke zona ───────────────────────────────────────────────────────
ALTER TABLE public.zones
  ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES public.nutrient_recipes(id) ON DELETE SET NULL;

-- ── Index ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_recipes_farm_id ON public.nutrient_recipes(farm_id);
CREATE INDEX IF NOT EXISTS idx_recipe_phases_recipe_id ON public.recipe_phases(recipe_id);

-- ── Trigger updated_at ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_recipes_updated_at ON public.nutrient_recipes;
CREATE TRIGGER trg_recipes_updated_at
  BEFORE UPDATE ON public.nutrient_recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.nutrient_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_phases    ENABLE ROW LEVEL SECURITY;

-- Pemilik kebun & super admin boleh baca/tulis resep milik farm mereka
CREATE POLICY "recipes_farm_access" ON public.nutrient_recipes
  USING (
    farm_id IN (
      SELECT farm_id FROM public.user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "recipe_phases_access" ON public.recipe_phases
  USING (
    recipe_id IN (
      SELECT r.id FROM public.nutrient_recipes r
      JOIN public.user_profiles up ON r.farm_id = up.farm_id
      WHERE up.id = auth.uid()
    )
  );
