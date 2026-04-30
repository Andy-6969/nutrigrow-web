-- ============================================================
-- NutriGrow — SQL Migration: Tabel farms
-- Jalankan di: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Buat tabel farms
CREATE TABLE IF NOT EXISTS public.farms (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  description     TEXT,
  location_address TEXT,
  location_lat    DOUBLE PRECISION,
  location_lng    DOUBLE PRECISION,
  total_area_ha   NUMERIC(8, 2) NOT NULL DEFAULT 0,
  owner_name      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- 2. Tambah foreign key dari zones ke farms (jika belum ada)
ALTER TABLE public.zones
  ADD COLUMN IF NOT EXISTS farm_id UUID REFERENCES public.farms(id) ON DELETE CASCADE;

-- 3. Seed data awal (lahan pertama)
INSERT INTO public.farms (id, name, description, location_address, location_lat, location_lng, total_area_ha, owner_name)
VALUES (
  'f1000000-0000-0000-0000-000000000001',
  'Lahan Pertanian Bitanic',
  'Lahan utama untuk produksi sayuran dan padi organik dengan sistem fertigasi otomatis.',
  'Desa Sukamaju, Cirebon, Jawa Barat',
  -6.8150,
  107.6150,
  5.30,
  'Bitanic Agritech'
)
ON CONFLICT (id) DO NOTHING;

-- 4. RLS Policies — baca untuk semua user login, write hanya super_admin
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

-- Baca: semua authenticated user
CREATE POLICY "farms_select" ON public.farms
  FOR SELECT TO authenticated USING (true);

-- Insert/Update/Delete: hanya super_admin (via user_profiles.role_id join)
CREATE POLICY "farms_insert" ON public.farms
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'super_admin'
    )
  );

CREATE POLICY "farms_update" ON public.farms
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'super_admin'
    )
  );

CREATE POLICY "farms_delete" ON public.farms
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.roles r ON r.id = up.role_id
      WHERE up.id = auth.uid() AND r.name = 'super_admin'
    )
  );
