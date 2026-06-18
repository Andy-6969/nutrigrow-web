// vps-server/src/routes/fuzzy.ts
// Endpoint approve/reject rekomendasi fuzzy logic
// Dipanggil oleh Next.js frontend melalui vpsApi

import { Router } from 'express';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { mqttClient } from '../mqtt/client';

export const fuzzyRouter = Router();

// ─── Schema validasi ────────────────────────────────────────────
const ApproveSchema = z.object({
  recommendation_id: z.number().int().positive(),
  zone_id: z.string().uuid(),
});

const RejectSchema = z.object({
  recommendation_id: z.number().int().positive(),
  zone_id: z.string().uuid(),
});

// ─── POST /fuzzy/approve ────────────────────────────────────────
fuzzyRouter.post('/approve', async (req, res) => {
  const parsed = ApproveSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { recommendation_id, zone_id } = parsed.data;

  // Ambil rekomendasi dari DB
  const { data: rec, error: recError } = await supabase
    .from('fuzzy_recommendations')
    .select('*')
    .eq('id', recommendation_id)
    .single();

  if (recError || !rec) {
    return res.status(404).json({ error: 'Recommendation not found' });
  }

  if (rec.status !== 'pending') {
    return res.status(409).json({
      error: `Rekomendasi sudah berstatus '${rec.status}', tidak bisa disetujui lagi`,
    });
  }

  // Update status ke 'approved'
  const { error: updateError } = await supabase
    .from('fuzzy_recommendations')
    .update({
      status: 'approved',
      executed_at: new Date().toISOString(),
    })
    .eq('id', recommendation_id);

  if (updateError) {
    console.error('[fuzzy/approve] Update error:', updateError.message);
    return res.status(500).json({ error: 'Gagal mengupdate rekomendasi' });
  }

  // Kirim command MQTT ke ESP32 jika irrigation diperlukan
  if (rec.irrigation_decision === 'irigasi' || rec.irrigation_decision === 'lembab') {
    const durationMinutes = rec.irrigation_duration ?? 5;
    const command = {
      action: 'on',
      mode: 'water',
      target: 'pump',
      duration_seconds: durationMinutes * 60,
      auto_stop: true,
      source: 'fuzzy_approved',
      timestamp: Date.now(),
    };
    mqttClient.publish(zone_id, command);

    // Update zone status
    await supabase
      .from('zones')
      .update({ status: 'irrigating' })
      .eq('id', zone_id);

    // Catat ke irrigation_logs
    await supabase.from('irrigation_logs').insert({
      zone_id,
      zone_name: rec.zone_name ?? '',
      source: 'fuzzy_approved',
      duration_minutes: durationMinutes,
      water_volume_liters: 0,
      status: 'running',
      started_at: new Date().toISOString(),
    });
  }

  return res.json({
    success: true,
    message: 'Rekomendasi disetujui dan perintah dikirim ke perangkat',
    recommendation_id,
    zone_id,
  });
});

// ─── POST /fuzzy/reject ─────────────────────────────────────────
fuzzyRouter.post('/reject', async (req, res) => {
  const parsed = RejectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid request body',
      details: parsed.error.flatten().fieldErrors,
    });
  }

  const { recommendation_id } = parsed.data;

  const { data: rec } = await supabase
    .from('fuzzy_recommendations')
    .select('status')
    .eq('id', recommendation_id)
    .single();

  if (!rec) {
    return res.status(404).json({ error: 'Recommendation not found' });
  }

  if (rec.status !== 'pending') {
    return res.status(409).json({
      error: `Rekomendasi sudah berstatus '${rec.status}', tidak bisa ditolak lagi`,
    });
  }

  const { error: updateError } = await supabase
    .from('fuzzy_recommendations')
    .update({
      status: 'rejected',
      executed_at: new Date().toISOString(),
    })
    .eq('id', recommendation_id);

  if (updateError) {
    console.error('[fuzzy/reject] Update error:', updateError.message);
    return res.status(500).json({ error: 'Gagal mengupdate rekomendasi' });
  }

  return res.json({
    success: true,
    message: 'Rekomendasi ditolak',
    recommendation_id,
  });
});
