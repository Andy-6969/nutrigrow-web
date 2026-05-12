-- ============================================================
-- NutriGrow: Migration 013 — Add mode to schedules
-- ============================================================

ALTER TABLE public.schedules
  ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'water' CHECK (mode IN ('water', 'fertilizer', 'solenoid'));

-- Update existing schedules based on include_fertigation
UPDATE public.schedules
SET mode = 'fertilizer'
WHERE include_fertigation = true;
