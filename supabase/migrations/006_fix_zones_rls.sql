-- ============================================================
-- NutriGrow: Migration 006 — Fix Zones RLS
-- ============================================================

-- Allow super_admin to insert zones
CREATE POLICY "Super admin can insert zones"
  ON public.zones FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() = 'super_admin');

-- Allow super_admin to delete zones
CREATE POLICY "Super admin can delete zones"
  ON public.zones FOR DELETE TO authenticated
  USING (public.current_user_role() = 'super_admin');

-- Note: In the future, if 'pemilik_kebun' needs to manage zones in their own farm,
-- the policy can be updated here. Currently, only super_admin manages farms/zones.
