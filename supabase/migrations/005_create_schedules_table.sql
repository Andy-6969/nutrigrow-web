-- ============================================================
-- NutriGrow: Migration 005 — Create schedules table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.schedules (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id             UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  cron_expression     TEXT NOT NULL,
  duration_minutes    INTEGER NOT NULL DEFAULT 15,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  include_fertigation BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.schedules;

-- RLS
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedules_select_policy" 
  ON public.schedules FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
        AND user_profiles.is_active = true
    )
  );

CREATE POLICY "schedules_insert_update_delete_policy"
  ON public.schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
        AND up.is_active = true
        AND r.name IN ('super_admin', 'pemilik_kebun')
    )
  );
