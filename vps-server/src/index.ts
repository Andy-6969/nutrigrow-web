// vps-server/src/index.ts
// NutriGrow VPS Server — Entry Point
// Express API + MQTT Bridge untuk kontrol aktuator IoT

import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { mqttClient } from './mqtt/client';
import { actuatorRouter } from './routes/actuator';
import { sensorRouter } from './routes/sensor';
import { healthRouter } from './routes/health';
import { startScheduler } from './cron/irrigationScheduler';

const app  = express();
const PORT = Number(process.env.PORT ?? 3001);

// ─── Middleware ───────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: [
    'https://nutrigrow.my.id',
    'http://localhost:3000',
    process.env.FRONTEND_URL ?? '',
  ].filter(Boolean),
}));
app.use(express.json());
app.use(morgan('combined'));

// ─── Routes ──────────────────────────────────────────────────
app.use('/health',    healthRouter);
app.use('/actuator',  actuatorRouter);
app.use('/sensor',    sensorRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🌱 NutriGrow VPS Server running on port ${PORT}`);
  console.log(`   MQTT Broker: ${process.env.MQTT_BROKER_HOST}:${process.env.MQTT_BROKER_PORT}`);
  console.log(`   Supabase: ${process.env.SUPABASE_URL?.slice(0, 40)}...\n`);
});

// Sambungkan MQTT setelah server start
mqttClient.connect();

// Jalankan Scheduler
startScheduler();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received — shutting down gracefully...');
  mqttClient.disconnect();
  process.exit(0);
});
