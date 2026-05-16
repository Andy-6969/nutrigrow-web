-- ============================================================
-- NutriGrow: Migration 015 — Scouting Notifications
-- ============================================================

-- 1. Update notification type constraint
ALTER TABLE public.notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN ('smart_delay', 'cycle_complete', 'device_alert', 'override', 'scouting_alert'));

-- 2. Trigger function to notify admins/owners on new scouting log
CREATE OR REPLACE FUNCTION public.fn_notify_scouting_log()
RETURNS TRIGGER AS $$
DECLARE
    v_zone_name TEXT;
    v_farm_id   UUID;
    v_admin_id  UUID;
    v_emoji     TEXT;
BEGIN
    -- Ambil info zona & farm
    SELECT name, farm_id INTO v_zone_name, v_farm_id
    FROM public.zones WHERE id = NEW.zone_id;

    -- Tentukan emoji berdasarkan kategori
    v_emoji := CASE 
        WHEN NEW.issue_type = 'hama' THEN '🐛'
        WHEN NEW.issue_type = 'penyakit' THEN '🦠'
        WHEN NEW.issue_type = 'infrastruktur' THEN '🔧'
        ELSE 'ℹ️'
    END;

    -- Kirim notifikasi ke semua user di farm tersebut yang bukan guest
    FOR v_admin_id IN 
        SELECT up.id 
        FROM public.user_profiles up
        JOIN public.roles r ON r.id = up.role_id
        WHERE up.farm_id = v_farm_id 
          AND r.name IN ('super_admin', 'pemilik_kebun')
          AND up.id != NEW.user_id -- jangan notif diri sendiri
    LOOP
        INSERT INTO public.notifications (user_id, title, body, type, zone_name)
        VALUES (
            v_admin_id,
            v_emoji || ' Laporan Lapangan Baru: ' || INITCAP(NEW.issue_type),
            'Zona ' || v_zone_name || ': ' || LEFT(NEW.notes, 50) || (CASE WHEN LENGTH(NEW.notes) > 50 THEN '...' ELSE '' END),
            'scouting_alert',
            v_zone_name
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach trigger to scouting_logs
DROP TRIGGER IF EXISTS trg_scouting_log_notification ON public.scouting_logs;
CREATE TRIGGER trg_scouting_log_notification
    AFTER INSERT ON public.scouting_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.fn_notify_scouting_log();
