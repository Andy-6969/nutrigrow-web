-- ============================================================
-- NutriGrow: Migration 008 — Supabase RPC Functions
-- Jalankan di: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ─── DROP jika sudah ada (safe re-run) ────────────────────────
DROP FUNCTION IF EXISTS get_sensor_history_24h(UUID);
DROP FUNCTION IF EXISTS get_eco_savings(UUID);
DROP FUNCTION IF EXISTS insert_growth_stage_notification(UUID, TEXT, TEXT, INTEGER);

-- ============================================================
-- RPC 1: get_sensor_history_24h
-- Mengembalikan agregasi data sensor per 30 menit selama 24 jam
-- Dipanggil dari: sensorService.getSensorHistory(zoneId)
-- ============================================================
CREATE OR REPLACE FUNCTION get_sensor_history_24h(p_zone_id UUID)
RETURNS TABLE (
  time_label    TEXT,
  soil_moisture NUMERIC,
  temperature   NUMERIC,
  humidity      NUMERIC,
  ph            NUMERIC,
  tds           NUMERIC
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    -- Bucket per 30 menit, format HH:MM
    TO_CHAR(
      DATE_TRUNC('hour', recorded_at) +
        (FLOOR(EXTRACT(MINUTE FROM recorded_at) / 30) * 30 ||' minutes')::INTERVAL,
      'HH24:MI'
    )                                          AS time_label,
    ROUND(AVG(soil_moisture)::NUMERIC, 1)     AS soil_moisture,
    ROUND(AVG(temperature)::NUMERIC, 1)       AS temperature,
    ROUND(AVG(humidity)::NUMERIC, 1)          AS humidity,
    ROUND(AVG(ph)::NUMERIC, 2)               AS ph,
    ROUND(AVG(tds)::NUMERIC, 3)              AS tds
  FROM public.sensor_data
  WHERE
    zone_id     = p_zone_id
    AND recorded_at >= (NOW() AT TIME ZONE 'Asia/Jakarta') - INTERVAL '24 hours'
  GROUP BY
    DATE_TRUNC('hour', recorded_at) +
    (FLOOR(EXTRACT(MINUTE FROM recorded_at) / 30) * 30 ||' minutes')::INTERVAL
  ORDER BY 1 ASC;
$$;

-- Berikan izin ke user yang sudah login
GRANT EXECUTE ON FUNCTION get_sensor_history_24h(UUID) TO authenticated;


-- ============================================================
-- RPC 2: get_eco_savings
-- Menghitung penghematan air/pupuk/energi/biaya dari log irigasi
-- Dipanggil dari: sensorService.getEcoSavings()
-- Parameter: p_farm_id UUID (opsional - jika NULL ambil semua)
-- ============================================================
CREATE OR REPLACE FUNCTION get_eco_savings(p_farm_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  -- ── Konstanta kalkulasi baseline konvensional ──────────────
  -- Baseline: irigasi manual tanpa sistem cerdas
  BASELINE_LITER_PER_MIN  CONSTANT NUMERIC := 5.0;   -- L/menit penyiraman konvensional
  WATER_PRICE_PER_LITER   CONSTANT NUMERIC := 0.5;   -- Rp per liter
  FERTILIZER_KG_PER_LITER CONSTANT NUMERIC := 0.012; -- kg pupuk per liter (konvensional)
  ENERGY_KWH_PER_LITER    CONSTANT NUMERIC := 0.002; -- kWh per liter pompa

  -- ── Hasil bulan ini ────────────────────────────────────────
  v_water_saved_this    NUMERIC := 0;
  v_water_saved_prev    NUMERIC := 0;

  -- ── Output ────────────────────────────────────────────────
  v_result JSON;
BEGIN
  -- Bulan ini
  SELECT COALESCE(SUM(
    GREATEST(0,
      (il.duration_minutes * BASELINE_LITER_PER_MIN) - COALESCE(il.water_volume_liters, 0)
    )
  ), 0)
  INTO v_water_saved_this
  FROM public.irrigation_logs il
  JOIN public.zones z ON il.zone_id = z.id
  WHERE
    il.status = 'completed'
    AND il.started_at >= DATE_TRUNC('month', NOW())
    AND (p_farm_id IS NULL OR z.farm_id = p_farm_id);

  -- Bulan lalu (untuk kalkulasi trend %)
  SELECT COALESCE(SUM(
    GREATEST(0,
      (il.duration_minutes * BASELINE_LITER_PER_MIN) - COALESCE(il.water_volume_liters, 0)
    )
  ), 1) -- default 1 agar tidak divide-by-zero
  INTO v_water_saved_prev
  FROM public.irrigation_logs il
  JOIN public.zones z ON il.zone_id = z.id
  WHERE
    il.status = 'completed'
    AND il.started_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
    AND il.started_at <  DATE_TRUNC('month', NOW())
    AND (p_farm_id IS NULL OR z.farm_id = p_farm_id);

  -- Build JSON result
  v_result := json_build_object(
    'water_saved_liters',
      ROUND(v_water_saved_this, 0),

    'fertilizer_saved_kg',
      ROUND((v_water_saved_this * FERTILIZER_KG_PER_LITER)::NUMERIC, 2),

    'energy_saved_kwh',
      ROUND((v_water_saved_this * ENERGY_KWH_PER_LITER)::NUMERIC, 2),

    'cost_saved_rupiah',
      ROUND((v_water_saved_this * WATER_PRICE_PER_LITER)::NUMERIC, 0),

    -- Trend: persen perubahan vs bulan lalu (positif = lebih hemat)
    'water_trend',
      CASE
        WHEN v_water_saved_prev = 0 THEN 0
        ELSE ROUND(((v_water_saved_this - v_water_saved_prev) / v_water_saved_prev * 100)::NUMERIC, 1)
      END,

    'fertilizer_trend',
      CASE
        WHEN v_water_saved_prev = 0 THEN 0
        ELSE ROUND(((v_water_saved_this - v_water_saved_prev) / v_water_saved_prev * 100)::NUMERIC, 1)
      END,

    'cost_trend',
      CASE
        WHEN v_water_saved_prev = 0 THEN 0
        ELSE ROUND(((v_water_saved_this - v_water_saved_prev) / v_water_saved_prev * 100)::NUMERIC, 1)
      END,

    'energy_trend',
      CASE
        WHEN v_water_saved_prev = 0 THEN 0
        ELSE ROUND(((v_water_saved_this - v_water_saved_prev) / v_water_saved_prev * 100)::NUMERIC, 1)
      END
  );

  RETURN v_result;
END;
$$;

-- Berikan izin ke user yang sudah login
GRANT EXECUTE ON FUNCTION get_eco_savings(UUID) TO authenticated;


-- ============================================================
-- RPC 3: insert_growth_stage_notification
-- Dipanggil dari Edge Function cron untuk notifikasi pergantian fase
-- ============================================================
CREATE OR REPLACE FUNCTION insert_growth_stage_notification(
  p_zone_id    UUID,
  p_phase_name TEXT,
  p_emoji      TEXT,
  p_day        INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_zone_name  TEXT;
  v_farm_id    UUID;
  v_user_id    UUID;
BEGIN
  -- Ambil nama zona dan farm
  SELECT name, farm_id INTO v_zone_name, v_farm_id
  FROM public.zones WHERE id = p_zone_id;

  -- Kirim notifikasi ke semua user yang memiliki farm_id ini
  FOR v_user_id IN
    SELECT up.id FROM public.user_profiles up
    WHERE up.farm_id = v_farm_id AND up.is_active = true
  LOOP
    INSERT INTO public.notifications (user_id, title, body, type, zone_name)
    VALUES (
      v_user_id,
      p_emoji || ' Fase Baru: ' || p_phase_name,
      'Zona ' || v_zone_name || ' memasuki fase ' || p_phase_name ||
      ' (Hari ke-' || p_day || '). Jadwal irigasi perlu disesuaikan.',
      'smart_delay',
      v_zone_name
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION insert_growth_stage_notification(UUID, TEXT, TEXT, INTEGER) TO service_role;


-- ============================================================
-- HELPER VIEW: v_zone_sensor_latest
-- View untuk mempercepat query sensor terbaru per zona
-- ============================================================
CREATE OR REPLACE VIEW public.v_zone_sensor_latest AS
SELECT DISTINCT ON (sd.zone_id)
  sd.zone_id,
  z.name         AS zone_name,
  z.farm_id,
  z.status       AS zone_status,
  z.crop_type,
  sd.soil_moisture,
  sd.temperature,
  sd.humidity,
  sd.ph,
  sd.tds,
  sd.battery,
  sd.rssi,
  sd.recorded_at
FROM public.sensor_data sd
JOIN public.zones z ON sd.zone_id = z.id
ORDER BY sd.zone_id, sd.recorded_at DESC;

GRANT SELECT ON public.v_zone_sensor_latest TO authenticated;
