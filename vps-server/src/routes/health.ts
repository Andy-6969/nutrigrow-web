// vps-server/src/routes/health.ts
// Health check endpoint — digunakan monitoring uptime (e.g. UptimeRobot)

import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { mqttClient } from '../mqtt/client';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  // Ping Supabase
  let dbOk = false;
  try {
    const { error } = await supabase.from('zones').select('id').limit(1);
    dbOk = !error;
  } catch { dbOk = false; }

  const mqtt = mqttClient.getStatus();

  const status = dbOk && mqtt.connected ? 'ok' : 'degraded';

  return res.status(status === 'ok' ? 200 : 503).json({
    status,
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
    services: {
      database: dbOk ? 'ok' : 'error',
      mqtt:     mqtt.connected ? 'ok' : 'disconnected',
    },
    version: process.env.npm_package_version ?? '1.0.0',
  });
});
