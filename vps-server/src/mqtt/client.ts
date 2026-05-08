// vps-server/src/mqtt/client.ts
// MQTT client manager — subscribe ke topik sensor ESP32,
// publish command ke aktuator, dan simpan data ke Supabase

import mqtt, { MqttClient } from 'mqtt';
import { supabase } from '../lib/supabase';

// ─── Konstanta Topik MQTT ─────────────────────────────────────
// Sesuaikan dengan konfigurasi ESP32 di lapangan
const TOPICS = {
  SENSOR_DATA:     'nutrigrow/+/sensor',      // nutrigrow/{zone_id}/sensor
  ACTUATOR_STATUS: 'nutrigrow/+/status',      // nutrigrow/{zone_id}/status
  ACTUATOR_CMD:    'nutrigrow/{zoneId}/cmd',  // template — diisi saat publish
};

// ─── Interface payload dari ESP32 ────────────────────────────
interface SensorPayload {
  zone_id:       string;
  soil_moisture: number;
  temperature:   number;
  humidity:      number;
  ph:            number;
  tds?:          number;   // mS/cm — kolom baru setelah migration 007
  battery?:      number;
  rssi?:         number;
}

interface ActuatorStatusPayload {
  zone_id: string;
  target:  'pump' | 'solenoid';
  state:   'on' | 'off';
  mode?:   'water' | 'fertigation';
}

class NutriGrowMqttClient {
  private client: MqttClient | null = null;
  private isConnected = false;

  connect(): void {
    const brokerUrl = `mqtt://${process.env.MQTT_BROKER_HOST}:${process.env.MQTT_BROKER_PORT}`;
    console.log(`[MQTT] Connecting to ${brokerUrl}...`);

    this.client = mqtt.connect(brokerUrl, {
      clientId:   `nutrigrow-vps-${Date.now()}`,
      username:   process.env.MQTT_USERNAME,
      password:   process.env.MQTT_PASSWORD,
      keepalive:  60,
      reconnectPeriod: 5000,
      connectTimeout:  10000,
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      console.log('[MQTT] ✅ Connected to broker');

      // Subscribe ke semua topik sensor dan status aktuator
      this.client!.subscribe([TOPICS.SENSOR_DATA, TOPICS.ACTUATOR_STATUS], (err) => {
        if (err) console.error('[MQTT] Subscribe error:', err.message);
        else console.log('[MQTT] Subscribed to sensor & status topics');
      });
    });

    this.client.on('message', async (topic, message) => {
      try {
        const payload = JSON.parse(message.toString());
        await this.handleMessage(topic, payload);
      } catch (err) {
        console.error(`[MQTT] Failed to parse message on topic ${topic}:`, err);
      }
    });

    this.client.on('error',      (err) => console.error('[MQTT] Error:', err.message));
    this.client.on('offline',    ()    => { this.isConnected = false; console.warn('[MQTT] Offline'); });
    this.client.on('reconnect',  ()    => console.log('[MQTT] Reconnecting...'));
  }

  // ─── Handle pesan masuk dari ESP32 ─────────────────────────
  private async handleMessage(topic: string, payload: unknown): Promise<void> {
    // nutrigrow/{zone_id}/sensor
    if (topic.endsWith('/sensor')) {
      await this.saveSensorData(payload as SensorPayload);
    }
    // nutrigrow/{zone_id}/status (status aktuator berubah)
    else if (topic.endsWith('/status')) {
      await this.updateActuatorStatus(payload as ActuatorStatusPayload);
    }
  }

  // ─── Simpan data sensor ke Supabase ────────────────────────
  private async saveSensorData(data: SensorPayload): Promise<void> {
    if (!data.zone_id) return;

    const { error } = await supabase.from('sensor_data').insert({
      zone_id:       data.zone_id,
      soil_moisture: data.soil_moisture ?? 0,
      temperature:   data.temperature   ?? 0,
      humidity:      data.humidity      ?? 0,
      ph:            data.ph            ?? 7.0,
      tds:           data.tds           ?? null,  // ← kolom TDS baru (migration 007)
      battery:       data.battery       ?? null,
      rssi:          data.rssi          ?? null,
      recorded_at:   new Date().toISOString(),
    });

    if (error) {
      console.error(`[MQTT] Failed to save sensor data for zone ${data.zone_id}:`, error.message);
    } else {
      console.log(`[MQTT] 📡 Saved sensor data — Zone: ${data.zone_id}, TDS: ${data.tds ?? 'N/A'} mS/cm`);
    }
  }

  // ─── Update status zona saat aktuator berubah ──────────────
  private async updateActuatorStatus(data: ActuatorStatusPayload): Promise<void> {
    if (!data.zone_id) return;

    const newStatus = data.state === 'on'
      ? (data.mode === 'fertigation' ? 'fertigating' : 'irrigating')
      : 'idle';

    const { error } = await supabase
      .from('zones')
      .update({ status: newStatus })
      .eq('id', data.zone_id);

    if (error) {
      console.error(`[MQTT] Failed to update zone status:`, error.message);
    } else {
      console.log(`[MQTT] 🔄 Zone ${data.zone_id} status → ${newStatus}`);
    }
  }

  // ─── Publish command ke aktuator ESP32 ─────────────────────
  publish(zoneId: string, command: Record<string, unknown>): void {
    if (!this.client || !this.isConnected) {
      console.error('[MQTT] Cannot publish — not connected');
      return;
    }
    const topic = TOPICS.ACTUATOR_CMD.replace('{zoneId}', zoneId);
    this.client.publish(topic, JSON.stringify(command), { qos: 1, retain: false });
    console.log(`[MQTT] 📤 Published to ${topic}:`, command);
  }

  disconnect(): void {
    this.client?.end(true);
    this.isConnected = false;
    console.log('[MQTT] Disconnected');
  }

  getStatus(): { connected: boolean } {
    return { connected: this.isConnected };
  }
}

// Singleton
export const mqttClient = new NutriGrowMqttClient();
