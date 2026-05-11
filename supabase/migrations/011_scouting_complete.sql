-- ============================================================
-- 011_scouting_complete.sql
-- Gabungan: Tabel scouting_logs + Storage Bucket scouting_images
-- Jalankan di Supabase SQL Editor → New Query → Run
-- ============================================================

-- ── BAGIAN A: Tabel scouting_logs ─────────────────────────────

CREATE TABLE IF NOT EXISTS public.scouting_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    issue_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    notes TEXT NOT NULL,
    photo_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scouting_logs_zone_id ON public.scouting_logs(zone_id);
CREATE INDEX IF NOT EXISTS idx_scouting_logs_status ON public.scouting_logs(status);

ALTER TABLE public.scouting_logs ENABLE ROW LEVEL SECURITY;

-- Hapus policy lama jika ada
DROP POLICY IF EXISTS "Enable read access for authenticated users on scouting_logs" ON public.scouting_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users on scouting_logs" ON public.scouting_logs;
DROP POLICY IF EXISTS "Enable update for authenticated users on scouting_logs" ON public.scouting_logs;
DROP POLICY IF EXISTS "Enable delete for authenticated users on scouting_logs" ON public.scouting_logs;

CREATE POLICY "Enable read access for authenticated users on scouting_logs"
    ON public.scouting_logs FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users on scouting_logs"
    ON public.scouting_logs FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users on scouting_logs"
    ON public.scouting_logs FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete for authenticated users on scouting_logs"
    ON public.scouting_logs FOR DELETE
    USING (auth.role() = 'authenticated');

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_scouting_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_scouting_logs_updated_at ON public.scouting_logs;
CREATE TRIGGER trg_scouting_logs_updated_at
    BEFORE UPDATE ON public.scouting_logs
    FOR EACH ROW
    EXECUTE PROCEDURE update_scouting_logs_updated_at();


-- ── BAGIAN B: Storage Bucket scouting_images ──────────────────

-- 1. Buat bucket (public = true agar foto bisa diload tanpa signed URL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('scouting_images', 'scouting_images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Public read
DROP POLICY IF EXISTS "Public Access for scouting_images" ON storage.objects;
CREATE POLICY "Public Access for scouting_images"
    ON storage.objects FOR SELECT
    USING ( bucket_id = 'scouting_images' );

-- 3. Authenticated upload
DROP POLICY IF EXISTS "Authenticated users can upload scouting_images" ON storage.objects;
CREATE POLICY "Authenticated users can upload scouting_images"
    ON storage.objects FOR INSERT
    WITH CHECK ( bucket_id = 'scouting_images' AND auth.role() = 'authenticated' );

-- 4. Authenticated delete
DROP POLICY IF EXISTS "Authenticated users can delete scouting_images" ON storage.objects;
CREATE POLICY "Authenticated users can delete scouting_images"
    ON storage.objects FOR DELETE
    USING ( bucket_id = 'scouting_images' AND auth.role() = 'authenticated' );
