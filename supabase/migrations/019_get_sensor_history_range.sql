-- ============================================================
-- NutriGrow: Migration 019 — get_sensor_history with range support
-- ============================================================

DROP FUNCTION IF EXISTS get_sensor_history(UUID, TEXT);

CREATE OR REPLACE FUNCTION get_sensor_history(p_zone_id UUID, p_range TEXT DEFAULT '24h')
RETURNS TABLE (
  time_label    TEXT,
  soil_moisture NUMERIC,
  temperature   NUMERIC,
  humidity      NUMERIC,
  ph            NUMERIC,
  tds           NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_interval INTERVAL;
BEGIN
  IF p_range = '7d' THEN
    v_interval := INTERVAL '7 days';
    RETURN QUERY
    SELECT
      TO_CHAR(
        (DATE_TRUNC('hour', recorded_at) - (EXTRACT(HOUR FROM recorded_at)::INTEGER % 6) * INTERVAL '1 hour') AT TIME ZONE 'Asia/Jakarta',
        'DD/MM HH24:MI'
      ) AS time_label,
      ROUND(AVG(soil_moisture)::NUMERIC, 1)     AS soil_moisture,
      ROUND(AVG(temperature)::NUMERIC, 1)       AS temperature,
      ROUND(AVG(humidity)::NUMERIC, 1)          AS humidity,
      ROUND(AVG(ph)::NUMERIC, 2)               AS ph,
      ROUND(AVG(tds)::NUMERIC, 3)              AS tds
    FROM public.sensor_data
    WHERE
      zone_id = p_zone_id
      AND recorded_at >= NOW() - v_interval
    GROUP BY
      DATE_TRUNC('hour', recorded_at) - (EXTRACT(HOUR FROM recorded_at)::INTEGER % 6) * INTERVAL '1 hour'
    ORDER BY 
      DATE_TRUNC('hour', recorded_at) - (EXTRACT(HOUR FROM recorded_at)::INTEGER % 6) * INTERVAL '1 hour' ASC;

  ELSIF p_range = '30d' THEN
    v_interval := INTERVAL '30 days';
    RETURN QUERY
    SELECT
      TO_CHAR(recorded_at AT TIME ZONE 'Asia/Jakarta', 'DD/MM') AS time_label,
      ROUND(AVG(soil_moisture)::NUMERIC, 1)     AS soil_moisture,
      ROUND(AVG(temperature)::NUMERIC, 1)       AS temperature,
      ROUND(AVG(humidity)::NUMERIC, 1)          AS humidity,
      ROUND(AVG(ph)::NUMERIC, 2)               AS ph,
      ROUND(AVG(tds)::NUMERIC, 3)              AS tds
    FROM public.sensor_data
    WHERE
      zone_id = p_zone_id
      AND recorded_at >= NOW() - v_interval
    GROUP BY
      DATE_TRUNC('day', recorded_at)
    ORDER BY
      DATE_TRUNC('day', recorded_at) ASC;

  ELSE -- Default to '24h'
    v_interval := INTERVAL '24 hours';
    RETURN QUERY
    SELECT
      TO_CHAR(
        (DATE_TRUNC('hour', recorded_at) + (FLOOR(EXTRACT(MINUTE FROM recorded_at) / 30) * 30 ||' minutes')::INTERVAL) AT TIME ZONE 'Asia/Jakarta',
        'HH24:MI'
      ) AS time_label,
      ROUND(AVG(soil_moisture)::NUMERIC, 1)     AS soil_moisture,
      ROUND(AVG(temperature)::NUMERIC, 1)       AS temperature,
      ROUND(AVG(humidity)::NUMERIC, 1)          AS humidity,
      ROUND(AVG(ph)::NUMERIC, 2)               AS ph,
      ROUND(AVG(tds)::NUMERIC, 3)              AS tds
    FROM public.sensor_data
    WHERE
      zone_id = p_zone_id
      AND recorded_at >= NOW() - v_interval
    GROUP BY
      DATE_TRUNC('hour', recorded_at) + (FLOOR(EXTRACT(MINUTE FROM recorded_at) / 30) * 30 ||' minutes')::INTERVAL
    ORDER BY
      DATE_TRUNC('hour', recorded_at) + (FLOOR(EXTRACT(MINUTE FROM recorded_at) / 30) * 30 ||' minutes')::INTERVAL ASC;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_sensor_history(UUID, TEXT) TO authenticated;
