-- ============================================================
-- NutriGrow: Migration 014 — Fix Scouting & Storage
-- Jalankan di: Supabase Dashboard > SQL Editor > New Query > Run
-- ============================================================

-- ── BAGIAN 1: Pastikan tabel scouting_logs ada & lengkap ─────

CREATE TABLE IF NOT EXISTS public.scouting_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id     UUID NOT NULL REFERENCES public.zones(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    issue_type  VARCHAR(50)  NOT NULL DEFAULT 'lainnya',
    severity    VARCHAR(20)  NOT NULL DEFAULT 'rendah',
    notes       TEXT         NOT NULL DEFAULT '',
    photo_url   TEXT,
    status      VARCHAR(20)  NOT NULL DEFAULT 'open',
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scouting_logs_zone_id  ON public.scouting_logs(zone_id);
CREATE INDEX IF NOT EXISTS idx_scouting_logs_status   ON public.scouting_logs(status);
CREATE INDEX IF NOT EXISTS idx_scouting_logs_created  ON public.scouting_logs(created_at DESC);

-- ── BAGIAN 2: Reset & Perbaiki RLS ───────────────────────────

ALTER TABLE public.scouting_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users on scouting_logs"   ON public.scouting_logs;
DROP POLICY IF EXISTS "Enable insert for authenticated users on scouting_logs"         ON public.scouting_logs;
DROP POLICY IF EXISTS "Enable update for authenticated users on scouting_logs"         ON public.scouting_logs;
DROP POLICY IF EXISTS "Enable delete for authenticated users on scouting_logs"         ON public.scouting_logs;
DROP POLICY IF EXISTS "scouting_logs_select"  ON public.scouting_logs;
DROP POLICY IF EXISTS "scouting_logs_insert"  ON public.scouting_logs;
DROP POLICY IF EXISTS "scouting_logs_update"  ON public.scouting_logs;
DROP POLICY IF EXISTS "scouting_logs_delete"  ON public.scouting_logs;

-- READ: semua user yang login bisa baca
CREATE POLICY "scouting_logs_select"
    ON public.scouting_logs FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- INSERT: semua user yang login bisa buat laporan
CREATE POLICY "scouting_logs_insert"
    ON public.scouting_logs FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: semua user yang login bisa update (untuk tandai resolved)
CREATE POLICY "scouting_logs_update"
    ON public.scouting_logs FOR UPDATE
    USING (auth.uid() IS NOT NULL);

-- DELETE: hanya creator atau admin (via tabel roles)
CREATE POLICY "scouting_logs_delete"
    ON public.scouting_logs FOR DELETE
    USING (
        auth.uid() = user_id
        OR EXISTS (
            SELECT 1
            FROM public.user_profiles up
            JOIN public.roles r ON r.id = up.role_id
            WHERE up.id = auth.uid()
              AND r.name IN ('super_admin', 'pemilik_kebun')
        )
    );

-- ── BAGIAN 3: Trigger updated_at ─────────────────────────────

CREATE OR REPLACE FUNCTION update_scouting_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scouting_logs_updated_at ON public.scouting_logs;
CREATE TRIGGER trg_scouting_logs_updated_at
    BEFORE UPDATE ON public.scouting_logs
    FOR EACH ROW
    EXECUTE PROCEDURE update_scouting_logs_updated_at();

-- ── BAGIAN 4: Storage Bucket scouting_images ──────────────────

-- Buat bucket (public = true agar foto bisa ditampilkan tanpa login)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'scouting_images',
    'scouting_images',
    true,
    10485760,   -- 10 MB max per file
    ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/heic','image/heif'];

-- Drop semua policy storage lama
DROP POLICY IF EXISTS "Public Access for scouting_images"               ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload scouting_images"  ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete scouting_images"  ON storage.objects;

-- Public read (semua orang bisa lihat foto)
CREATE POLICY "Public Access for scouting_images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'scouting_images');

-- Upload: hanya user yang login
CREATE POLICY "Authenticated users can upload scouting_images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'scouting_images' AND auth.uid() IS NOT NULL);

-- Delete: hanya user yang login
CREATE POLICY "Authenticated users can delete scouting_images"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'scouting_images' AND auth.uid() IS NOT NULL);

-- ── BAGIAN 5: Fix constraint mode di schedules ────────────────
-- Hapus check lama yang masih include 'solenoid' (tidak lagi dipakai)
ALTER TABLE public.schedules
    DROP CONSTRAINT IF EXISTS schedules_mode_check;

ALTER TABLE public.schedules
    ADD CONSTRAINT schedules_mode_check
    CHECK (mode IN ('water', 'fertilizer', 'solenoid'));
-- Note: 'solenoid' tetap ada di constraint untuk backward-compatibility
-- data lama, tapi UI tidak lagi menampilkan opsi ini.

-- Update data lama: jadwal solenoid diubah ke water
UPDATE public.schedules SET mode = 'water' WHERE mode = 'solenoid';

-- ── BAGIAN 6: Verifikasi ──────────────────────────────────────
-- Query ini akan menampilkan jumlah laporan yang ada (harusnya >= 0)
SELECT COUNT(*) AS total_scouting_logs FROM public.scouting_logs;
SELECT id, name, public FROM storage.buckets WHERE id = 'scouting_images';
