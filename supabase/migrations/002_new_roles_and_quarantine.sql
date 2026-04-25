-- ============================================================
-- NutriGrow: Migration 002 — New Role System & Quarantine
-- Run AFTER 001_initial_schema.sql
--
-- Changes:
--   1. Update user_profiles.role CHECK to new three-role system
--   2. Add DB trigger to auto-assign 'guest' role on new signup
--   3. Tighten RLS: guest role cannot read operational tables
--   4. Add super_admin seed row for initial login
-- ============================================================


-- ─── 1. ALTER role CHECK constraint ──────────────────────────
-- Drop old constraint and replace with new valid roles
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('super_admin', 'pemilik_kebun', 'guest'));

-- Update any existing rows using old role names
UPDATE public.user_profiles SET role = 'super_admin'   WHERE role = 'admin';
UPDATE public.user_profiles SET role = 'pemilik_kebun' WHERE role IN ('manager', 'operator');
UPDATE public.user_profiles SET role = 'guest'         WHERE role = 'viewer';


-- ─── 2. Auto-create profile trigger (Quarantine on signup) ───
--
-- Every new auth.users row (email/password OR OAuth) automatically
-- gets a matching user_profiles row with role = 'guest'.
-- Super Admin must manually promote the user via the admin panel.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, farm_id, assigned_zones)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'guest',           -- ← Quarantine: all new users start as guest
    NULL,              -- farm_id assigned by admin after approval
    '{}'::text[]
  )
  ON CONFLICT (id) DO NOTHING; -- Idempotent: skip if profile already exists
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users (fires on every new signup)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


-- ─── 3. RLS — Tighten policies for guest role ─────────────────
--
-- Current policies allow ALL authenticated users to read operational data.
-- We replace them with role-aware policies so guests see nothing.
--
-- Helper function: returns the current user's role from user_profiles
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$;

-- ── Zones ──
DROP POLICY IF EXISTS "Authenticated users can read zones" ON public.zones;
CREATE POLICY "Active users can read zones"
  ON public.zones FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('super_admin', 'pemilik_kebun'));

-- ── Sensor Data ──
DROP POLICY IF EXISTS "Authenticated users can read sensor data" ON public.sensor_data;
CREATE POLICY "Active users can read sensor data"
  ON public.sensor_data FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('super_admin', 'pemilik_kebun'));

-- ── Devices ──
DROP POLICY IF EXISTS "Authenticated users can read devices" ON public.devices;
CREATE POLICY "Active users can read devices"
  ON public.devices FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('super_admin', 'pemilik_kebun'));

-- ── Override Logs ──
DROP POLICY IF EXISTS "Authenticated users can read override logs"    ON public.override_logs;
DROP POLICY IF EXISTS "Authenticated users can insert override logs"  ON public.override_logs;
DROP POLICY IF EXISTS "Authenticated users can update override logs"  ON public.override_logs;

CREATE POLICY "Active users can read override logs"
  ON public.override_logs FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('super_admin', 'pemilik_kebun'));

CREATE POLICY "Active users can insert override logs"
  ON public.override_logs FOR INSERT TO authenticated
  WITH CHECK (public.current_user_role() IN ('super_admin', 'pemilik_kebun'));

CREATE POLICY "Active users can update override logs"
  ON public.override_logs FOR UPDATE TO authenticated
  USING (public.current_user_role() IN ('super_admin', 'pemilik_kebun'));

-- ── Irrigation Logs ──
DROP POLICY IF EXISTS "Authenticated users can read irrigation logs" ON public.irrigation_logs;
CREATE POLICY "Active users can read irrigation logs"
  ON public.irrigation_logs FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('super_admin', 'pemilik_kebun'));

-- ── Farms (read) ──
DROP POLICY IF EXISTS "Authenticated users can read farms" ON public.farms;
CREATE POLICY "Active users can read farms"
  ON public.farms FOR SELECT TO authenticated
  USING (public.current_user_role() IN ('super_admin', 'pemilik_kebun'));

-- ── Notifications ──
-- Guests can still read their OWN notifications (for the quarantine message)
-- No change needed — existing policy is already scoped to user_id = auth.uid()


-- ─── 4. Super Admin write policies (admin-only mutations) ─────
-- Only super_admin can update zones (e.g. toggle irrigation status)
CREATE POLICY "Super admin can update zones"
  ON public.zones FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'super_admin');

-- Only super_admin can update user profiles (role promotion)
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    AND public.current_user_role() != 'guest' -- guests cannot edit even their own profile
  );

CREATE POLICY "Super admin can update any profile"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (public.current_user_role() = 'super_admin');


-- ─── 5. Seed: Promote the demo admin account ──────────────────
-- After running this migration, manually update your super admin's
-- user_profile row. Replace the UUID below with the actual auth.users.id
-- of your admin account (find it in Supabase Auth dashboard).
--
-- UPDATE public.user_profiles
-- SET role = 'super_admin',
--     full_name = 'Super Admin NutriGrow',
--     farm_id = '00000000-0000-0000-0000-000000000001'
-- WHERE email = 'admin@nutrigrow.id';
--
-- Or use this helper to promote by email (run once):
-- DO $$
-- DECLARE v_id UUID;
-- BEGIN
--   SELECT id INTO v_id FROM auth.users WHERE email = 'admin@nutrigrow.id';
--   IF v_id IS NOT NULL THEN
--     UPDATE public.user_profiles
--     SET role = 'super_admin',
--         farm_id = '00000000-0000-0000-0000-000000000001'
--     WHERE id = v_id;
--   END IF;
-- END $$;
