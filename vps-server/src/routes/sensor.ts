// vps-server/src/routes/sensor.ts
// Endpoint untuk menerima data sensor via HTTP (alternatif MQTT)
// Berguna untuk testing atau jika ESP32 menggunakan HTTP instead of MQTT

import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { evaluateFuzzyAuto } from '../lib/fuzzyAutoExecutor';

export const sensorRouter = Router();

// ─── Validasi payload sensor ──────────────────────────────────
const SensorPayloadSchema = z.object({
  zone_id:       z.string().uuid(),
  soil_moisture: z.number().min(0).max(100),
  temperature:   z.number().min(-10).max(60),
  humidity:      z.number().min(0).max(100),
  ph:            z.number().min(0).max(14),
  tds:           z.number().min(0).max(10).optional(),  // mS/cm
  battery:       z.number().min(0).max(100).optional(),
  rssi:          z.number().min(-120).max(0).optional(),
});

// ─── POST /sensor/data ────────────────────────────────────────
// Alternatif HTTP push dari ESP32 (selain MQTT)
sensorRouter.post('/data', async (req, res) => {
  const parsed = SensorPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid sensor payload',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const data = parsed.data;

  // Verifikasi zona ada
  const { data: zone, error: zoneError } = await supabase
    .from('zones')
    .select('id, name')
    .eq('id', data.zone_id)
    .single();

  if (zoneError || !zone) {
    return res.status(404).json({ error: `Zone ${data.zone_id} not found` });
  }

  // Simpan ke sensor_data
  const { error } = await supabase.from('sensor_data').insert({
    zone_id:       data.zone_id,
    soil_moisture: data.soil_moisture,
    temperature:   data.temperature,
    humidity:      data.humidity,
    ph:            data.ph,
    tds:           data.tds ?? null,
    battery:       data.battery ?? null,
    rssi:          data.rssi ?? null,
    recorded_at:   new Date().toISOString(),
  });

  if (error) {
    console.error('[sensor/data] Insert error:', error.message);
    return res.status(500).json({ error: 'Failed to save sensor data' });
  }

  // Trigger automatic fuzzy logic evaluation
  evaluateFuzzyAuto(data).catch((err) => {
    console.error('[sensor/data] evaluateFuzzyAuto async error:', err);
  });

  // Cek alert TDS
  let tdsAlert: string | null = null;
  if (data.tds != null) {
    if (data.tds < 1.5) tdsAlert = 'RENDAH';
    else if (data.tds > 2.5) tdsAlert = 'TINGGI';
  }

  return res.json({
    success:   true,
    zone_name: zone.name,
    tds_status: tdsAlert ?? 'NORMAL',
    recorded_at: new Date().toISOString(),
  });
});

// ─── GET /sensor/latest/:zoneId ───────────────────────────────
sensorRouter.get('/latest/:zoneId', async (req, res) => {
  const { zoneId } = req.params;

  const { data, error } = await supabase
    .from('sensor_data')
    .select('*')
    .eq('zone_id', zoneId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single();

  if (error) return res.status(404).json({ error: 'No sensor data found' });

  return res.json(data);
});

// ─── POST /sensor/batch ───────────────────────────────────────
// Untuk LoRa gateway yang batch-send beberapa zona sekaligus
sensorRouter.post('/batch', async (req, res) => {
  const { readings } = req.body as { readings: unknown[] };
  if (!Array.isArray(readings) || readings.length === 0) {
    return res.status(400).json({ error: 'readings must be a non-empty array' });
  }

  const rows: Record<string, unknown>[] = [];
  const errors: string[] = [];

  for (const reading of readings) {
    const parsed = SensorPayloadSchema.safeParse(reading);
    if (!parsed.success) {
      errors.push(`Invalid reading: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`);
      continue;
    }
    const d = parsed.data;
    rows.push({
      zone_id:       d.zone_id,
      soil_moisture: d.soil_moisture,
      temperature:   d.temperature,
      humidity:      d.humidity,
      ph:            d.ph,
      tds:           d.tds ?? null,
      battery:       d.battery ?? null,
      rssi:          d.rssi ?? null,
      recorded_at:   new Date().toISOString(),
    });
  }

  if (rows.length > 0) {
    const { error } = await supabase.from('sensor_data').insert(rows);
    if (error) {
      return res.status(500).json({ error: 'Failed to save batch', detail: error.message });
    }

    // Trigger auto fuzzy evaluation for each valid reading in the batch
    for (const reading of readings) {
      const parsed = SensorPayloadSchema.safeParse(reading);
      if (parsed.success) {
        evaluateFuzzyAuto(parsed.data).catch((err) => {
          console.error('[sensor/batch] evaluateFuzzyAuto batch async error:', err);
        });
      }
    }
  }

  return res.json({
    success:   true,
    saved:     rows.length,
    skipped:   errors.length,
    errors,
  });
});
