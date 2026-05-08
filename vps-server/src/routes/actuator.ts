// vps-server/src/routes/actuator.ts
// Endpoint kontrol aktuator (pompa & solenoid)
// Dipanggil oleh Next.js frontend melalui vpsApi

import { Router } from 'express';
import { z } from 'zod';
import { mqttClient } from '../mqtt/client';
import { supabase } from '../lib/supabase';

export const actuatorRouter = Router();

// ─── Validasi body request ────────────────────────────────────
const ToggleSchema = z.object({
  zone_id:  z.string().uuid('zone_id harus UUID valid'),
  action:   z.enum(['on', 'off']),
  mode:     z.enum(['water', 'fertigation']).optional().default('water'),
  duration: z.number().int().min(1).max(120).optional(), // menit, max 2 jam
  target:   z.enum(['pump', 'solenoid']).optional(),
});

// ─── POST /actuator/toggle ────────────────────────────────────
// Dipanggil dari: overrideService.ts → vpsApi.post('/actuator/toggle', ...)
actuatorRouter.post('/toggle', async (req, res) => {
  const parsed = ToggleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error:   'Invalid request body',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { zone_id, action, mode, duration, target } = parsed.data;

  // ─── Verifikasi zona ada di Supabase ─────────────────────
  const { data: zone, error: zoneError } = await supabase
    .from('zones')
    .select('id, name, status, farm_id')
    .eq('id', zone_id)
    .single();

  if (zoneError || !zone) {
    return res.status(404).json({ error: 'Zone not found' });
  }

  // ─── Cek conflict — jika sudah irrigating, tolak ──────────
  if (action === 'on' && (zone.status === 'irrigating' || zone.status === 'fertigating')) {
    return res.status(409).json({
      error: `Zone ${zone.name} sedang aktif. Stop dulu sebelum memulai ulang.`,
    });
  }

  // ─── Kirim command via MQTT ke ESP32 ─────────────────────
  const command: Record<string, unknown> = {
    action,
    mode:      mode ?? 'water',
    target:    target ?? 'pump',
    timestamp: Date.now(),
  };

  if (action === 'on' && duration) {
    command['duration_seconds'] = duration * 60;
    command['auto_stop']        = true; // ESP32 akan berhenti otomatis
  }

  mqttClient.publish(zone_id, command);

  // ─── Update status zona di Supabase ──────────────────────
  const newStatus = action === 'on'
    ? (mode === 'fertigation' ? 'fertigating' : 'irrigating')
    : 'idle';

  await supabase
    .from('zones')
    .update({ status: newStatus })
    .eq('id', zone_id);

  // ─── Jika ON, catat ke irrigation_logs ───────────────────
  let irrigLogId: string | null = null;
  if (action === 'on') {
    const { data: irrigLog } = await supabase
      .from('irrigation_logs')
      .insert({
        zone_id,
        zone_name:          zone.name,
        source:             'manual_override',
        duration_minutes:   duration ?? 0,
        water_volume_liters: 0,  // akan diupdate saat selesai
        status:             'running',
        started_at:         new Date().toISOString(),
      })
      .select('id')
      .single();
    irrigLogId = irrigLog?.id ?? null;
  }

  return res.json({
    success:      true,
    message:      `Actuator ${action === 'on' ? 'started' : 'stopped'}`,
    zone_id,
    zone_name:    zone.name,
    new_status:   newStatus,
    irrig_log_id: irrigLogId,
  });
});

// ─── POST /actuator/stop-all ──────────────────────────────────
// Emergency stop semua zona
actuatorRouter.post('/stop-all', async (req, res) => {
  // Ambil semua zona yang sedang aktif
  const { data: activeZones } = await supabase
    .from('zones')
    .select('id, name')
    .in('status', ['irrigating', 'fertigating']);

  if (!activeZones || activeZones.length === 0) {
    return res.json({ success: true, message: 'No active zones to stop', stopped: 0 });
  }

  for (const zone of activeZones) {
    mqttClient.publish(zone.id, { action: 'off', timestamp: Date.now() });
  }

  // Update semua zona ke idle
  await supabase
    .from('zones')
    .update({ status: 'idle' })
    .in('status', ['irrigating', 'fertigating']);

  return res.json({
    success: true,
    message: `Emergency stopped ${activeZones.length} zone(s)`,
    stopped: activeZones.length,
    zones:   activeZones.map(z => z.name),
  });
});

// ─── GET /actuator/status/:zoneId ────────────────────────────
actuatorRouter.get('/status/:zoneId', async (req, res) => {
  const { zoneId } = req.params;

  const { data: zone } = await supabase
    .from('zones')
    .select('id, name, status')
    .eq('id', zoneId)
    .single();

  if (!zone) return res.status(404).json({ error: 'Zone not found' });

  return res.json({
    zone_id:   zone.id,
    zone_name: zone.name,
    status:    zone.status,
    is_active: zone.status === 'irrigating' || zone.status === 'fertigating',
    mqtt:      mqttClient.getStatus(),
  });
});
