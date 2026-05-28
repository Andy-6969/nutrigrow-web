-- Migration 011: Add scouting_logs table for field workers
-- Allows logging of pests, diseases, and other issues in the farm zones

CREATE TABLE IF NOT EXISTS public.scouting_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    issue_type VARCHAR(50) NOT NULL, -- 'hama', 'penyakit', 'infrastruktur', 'lainnya'
    severity VARCHAR(20) NOT NULL, -- 'rendah', 'sedang', 'tinggi'
    notes TEXT NOT NULL,
    photo_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'open', -- 'open', 'in_progress', 'resolved'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for fast querying by zone and status
CREATE INDEX IF NOT EXISTS idx_scouting_logs_zone_id ON public.scouting_logs(zone_id);
CREATE INDEX IF NOT EXISTS idx_scouting_logs_status ON public.scouting_logs(status);

-- Enable RLS
ALTER TABLE public.scouting_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone logged in can read scouting logs
CREATE POLICY "Enable read access for authenticated users on scouting_logs"
    ON public.scouting_logs FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy: Field workers and admins can insert logs
CREATE POLICY "Enable insert for authenticated users on scouting_logs"
    ON public.scouting_logs FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Policy: Admins or the creator can update logs (e.g. to mark resolved)
CREATE POLICY "Enable update for authenticated users on scouting_logs"
    ON public.scouting_logs FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Trigger to auto-update 'updated_at'
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

-- ── Setup Storage Bucket untuk Foto Scouting ─────────────────────────────────

-- 1. Buat bucket baru bernama 'scouting_images' dan set public = true
INSERT INTO storage.buckets (id, name, public)
VALUES ('scouting_images', 'scouting_images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Beri izin baca (SELECT) untuk publik (karena kita set public = true di atas)
DROP POLICY IF EXISTS "Public Access for scouting_images" ON storage.objects;
CREATE POLICY "Public Access for scouting_images"
    ON storage.objects FOR SELECT
    USING ( bucket_id = 'scouting_images' );

-- 3. Beri izin upload (INSERT) untuk user yang login (authenticated)
DROP POLICY IF EXISTS "Authenticated users can upload scouting_images" ON storage.objects;
CREATE POLICY "Authenticated users can upload scouting_images"
    ON storage.objects FOR INSERT
    WITH CHECK ( bucket_id = 'scouting_images' AND auth.role() = 'authenticated' );

-- 4. Beri izin hapus (DELETE) untuk user yang login (authenticated)
DROP POLICY IF EXISTS "Authenticated users can delete scouting_images" ON storage.objects;
CREATE POLICY "Authenticated users can delete scouting_images"
    ON storage.objects FOR DELETE
    USING ( bucket_id = 'scouting_images' AND auth.role() = 'authenticated' );
