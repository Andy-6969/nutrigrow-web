// src/shared/lib/mockData.ts

import type {
  Zone,
  SensorData,
  Device,
  EcoSavingsData,
  WeatherData,
  Notification,
  OverrideLog,
  IrrigationLog,
} from '@/shared/types/global.types';

// ─── Zones ───────────────────────────
export const mockZones: Zone[] = [
  { id: 'z1', farm_id: 'f1', name: 'Zona 1 - Sawah Utara', area_ha: 2.5, crop_type: 'Padi', status: 'irrigating', latitude: -6.8150, longitude: 107.6150 },
  { id: 'z2', farm_id: 'f1', name: 'Zona 2 - Kebun Timur', area_ha: 1.8, crop_type: 'Jagung', status: 'idle', latitude: -6.8160, longitude: 107.6180 },
  { id: 'z3', farm_id: 'f1', name: 'Zona 3 - Ladang Selatan', area_ha: 3.2, crop_type: 'Cabai', status: 'delayed', latitude: -6.8180, longitude: 107.6160 },
  { id: 'z4', farm_id: 'f1', name: 'Zona 4 - Persemaian', area_ha: 0.8, crop_type: 'Tomat', status: 'error', latitude: -6.8170, longitude: 107.6140 },
  { id: 'z5', farm_id: 'f1', name: 'Zona 5 - Kebun Barat', area_ha: 2.0, crop_type: 'Mentimun', status: 'fertigating', latitude: -6.8155, longitude: 107.6130 },
];

// ─── Current Sensor Readings ─────────
export const mockSensorData: Record<string, SensorData> = {
  z1: { soil_moisture: 62.5, temperature: 31.2, humidity: 68.0, ph: 6.8, battery: 85, rssi: -72, recorded_at: '2026-04-18T09:30:00Z' },
  z2: { soil_moisture: 45.3, temperature: 29.8, humidity: 72.5, ph: 7.1, battery: 92, rssi: -65, recorded_at: '2026-04-18T09:30:00Z' },
  z3: { soil_moisture: 55.8, temperature: 32.5, humidity: 58.3, ph: 6.5, battery: 78, rssi: -80, recorded_at: '2026-04-18T09:30:00Z' },
  z4: { soil_moisture: 28.1, temperature: 33.8, humidity: 45.2, ph: 5.9, battery: 15, rssi: -95, recorded_at: '2026-04-18T08:15:00Z' },
  z5: { soil_moisture: 70.2, temperature: 30.1, humidity: 75.8, ph: 7.0, battery: 88, rssi: -68, recorded_at: '2026-04-18T09:30:00Z' },
};

// ─── Sensor History (24h) ────────────
export const mockSensorHistory = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = (i % 2) * 30;
  return {
    time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    soil_moisture: 45 + Math.sin(i * 0.3) * 15 + Math.random() * 5,
    temperature: 26 + Math.sin(i * 0.15) * 6 + Math.random() * 2,
    humidity: 60 + Math.cos(i * 0.2) * 15 + Math.random() * 3,
    ph: 6.5 + Math.sin(i * 0.1) * 0.8 + Math.random() * 0.2,
  };
});

// ─── Devices ─────────────────────────
export const mockDevices: Device[] = [
  { id: 'd1', zone_id: 'z1', zone_name: 'Zona 1', device_type: 'sensor', firmware_version: '3.2.1', battery_level: 85, rssi: -72, last_heartbeat: '2026-04-18T09:28:00Z', is_online: true },
  { id: 'd2', zone_id: 'z1', zone_name: 'Zona 1', device_type: 'actuator', firmware_version: '3.2.1', battery_level: 90, rssi: -68, last_heartbeat: '2026-04-18T09:29:00Z', is_online: true },
  { id: 'd3', zone_id: 'z2', zone_name: 'Zona 2', device_type: 'sensor', firmware_version: '3.2.0', battery_level: 92, rssi: -65, last_heartbeat: '2026-04-18T09:30:00Z', is_online: true },
  { id: 'd4', zone_id: 'z3', zone_name: 'Zona 3', device_type: 'sensor', firmware_version: '3.1.5', battery_level: 78, rssi: -80, last_heartbeat: '2026-04-18T09:25:00Z', is_online: true },
  { id: 'd5', zone_id: 'z4', zone_name: 'Zona 4', device_type: 'sensor', firmware_version: '3.0.2', battery_level: 15, rssi: -95, last_heartbeat: '2026-04-18T08:15:00Z', is_online: false },
  { id: 'd6', zone_id: 'z4', zone_name: 'Zona 4', device_type: 'actuator', firmware_version: '3.0.2', battery_level: 22, rssi: -92, last_heartbeat: '2026-04-18T08:10:00Z', is_online: false },
  { id: 'd7', zone_id: 'z5', zone_name: 'Zona 5', device_type: 'sensor', firmware_version: '3.2.1', battery_level: 88, rssi: -68, last_heartbeat: '2026-04-18T09:30:00Z', is_online: true },
  { id: 'gw1', zone_id: '', zone_name: 'Gateway', device_type: 'gateway', firmware_version: '2.1.0', battery_level: 100, rssi: -45, last_heartbeat: '2026-04-18T09:30:00Z', is_online: true },
];

// ─── Eco-Savings ─────────────────────
export const mockEcoSavings: EcoSavingsData = {
  water_saved_liters: 12450,
  fertilizer_saved_kg: 34.5,
  cost_saved_rupiah: 2100000,
  energy_saved_kwh: 156,
  water_trend: 23,
  fertilizer_trend: 15,
  cost_trend: 28,
  energy_trend: 19,
};

export const mockEcoSavingsHistory = [
  { period: 'Sen', water: 1800, fertilizer: 5.2, cost: 310000, energy: 22 },
  { period: 'Sel', water: 1650, fertilizer: 4.8, cost: 285000, energy: 20 },
  { period: 'Rab', water: 1920, fertilizer: 5.5, cost: 325000, energy: 24 },
  { period: 'Kam', water: 1780, fertilizer: 4.9, cost: 298000, energy: 21 },
  { period: 'Jum', water: 2050, fertilizer: 5.8, cost: 340000, energy: 26 },
  { period: 'Sab', water: 1560, fertilizer: 4.2, cost: 262000, energy: 18 },
  { period: 'Min', water: 1690, fertilizer: 4.1, cost: 280000, energy: 25 },
];

// ─── Weather ─────────────────────────
export const mockWeather: WeatherData = {
  temperature: 28,
  humidity: 72,
  description: 'Berawan sebagian',
  icon: '⛅',
  pop: 45,
  wind_speed: 12,
  akan_hujan: false,
  rekomendasi_siram: true,
  last_update: new Date().toISOString(),
  lokasi: 'Bojongkulur, Bojonggede',
  forecast: [
    { dt: Date.now() + 3600000 * 3, temp: 30, humidity: 68, pop: 35, description: 'Cerah', icon: '☀️' },
    { dt: Date.now() + 3600000 * 6, temp: 32, humidity: 60, pop: 20, description: 'Cerah', icon: '☀️' },
    { dt: Date.now() + 3600000 * 9, temp: 29, humidity: 75, pop: 55, description: 'Mendung', icon: '☁️' },
    { dt: Date.now() + 3600000 * 12, temp: 27, humidity: 82, pop: 72, description: 'Hujan ringan', icon: '🌧️' },
    { dt: Date.now() + 3600000 * 15, temp: 25, humidity: 88, pop: 85, description: 'Hujan', icon: '🌧️' },
  ],
  weekly_forecast: [
    { date: '2026-05-02', day_name: 'Sab', temp_max: 30, temp_min: 23, precipitation_probability: 20, precipitation_sum: 0.5, weather_code: 2, icon: '⛅', description: 'Berawan Sebagian' },
    { date: '2026-05-03', day_name: 'Min', temp_max: 29, temp_min: 22, precipitation_probability: 45, precipitation_sum: 2.1, weather_code: 3, icon: '☁️', description: 'Berawan' },
    { date: '2026-05-04', day_name: 'Sen', temp_max: 27, temp_min: 21, precipitation_probability: 80, precipitation_sum: 8.5, weather_code: 63, icon: '🌧️', description: 'Hujan' },
    { date: '2026-05-05', day_name: 'Sel', temp_max: 28, temp_min: 22, precipitation_probability: 55, precipitation_sum: 3.2, weather_code: 61, icon: '🌧️', description: 'Hujan' },
    { date: '2026-05-06', day_name: 'Rab', temp_max: 31, temp_min: 23, precipitation_probability: 15, precipitation_sum: 0.0, weather_code: 1, icon: '⛅', description: 'Berawan Sebagian' },
    { date: '2026-05-07', day_name: 'Kam', temp_max: 32, temp_min: 24, precipitation_probability: 10, precipitation_sum: 0.0, weather_code: 0, icon: '☀️', description: 'Cerah' },
    { date: '2026-05-08', day_name: 'Jum', temp_max: 28, temp_min: 22, precipitation_probability: 70, precipitation_sum: 6.8, weather_code: 95, icon: '⛈️', description: 'Hujan Petir' },
  ],
};

// ─── Notifications ───────────────────
export const mockNotifications: Notification[] = [
  { id: 'n1', title: '⏸️ Smart Delay Aktif', body: 'Penyiraman Zona 3 ditunda — probabilitas hujan 78%', type: 'smart_delay', zone_name: 'Zona 3', is_read: false, created_at: '2026-04-18T09:15:00Z' },
  { id: 'n2', title: '✅ Siklus Selesai', body: 'Penyiraman otomatis Zona 1 selesai — 15 menit, 450L air', type: 'cycle_complete', zone_name: 'Zona 1', is_read: false, created_at: '2026-04-18T08:45:00Z' },
  { id: 'n3', title: '🔴 Perangkat Offline', body: 'Sensor Zona 4 offline selama >5 menit — cek perangkat', type: 'device_alert', zone_name: 'Zona 4', is_read: false, created_at: '2026-04-18T08:20:00Z' },
  { id: 'n4', title: '🔧 Override Aktif', body: 'Mas Eko mengaktifkan override Zona 2 — 30 menit', type: 'override', zone_name: 'Zona 2', is_read: true, created_at: '2026-04-18T07:30:00Z' },
  { id: 'n5', title: '✅ Siklus Selesai', body: 'Penyiraman otomatis Zona 5 selesai — 20 menit, 600L air', type: 'cycle_complete', zone_name: 'Zona 5', is_read: true, created_at: '2026-04-18T06:00:00Z' },
  { id: 'n6', title: '⏸️ Smart Delay Aktif', body: 'Penyiraman Zona 2 ditunda — probabilitas hujan 82%', type: 'smart_delay', zone_name: 'Zona 2', is_read: true, created_at: '2026-04-17T15:00:00Z' },
];

// ─── Override Logs ───────────────────
export const mockOverrideLogs: OverrideLog[] = [
  { id: 'ol1', zone_id: 'z1', zone_name: 'Zona 1', user_name: 'Mas Eko', mode: 'water', duration_minutes: 15, reason: 'Tanah terlalu kering', started_at: '2026-04-18T09:30:00Z', ended_at: '2026-04-18T09:45:00Z', status: 'completed' },
  { id: 'ol2', zone_id: 'z3', zone_name: 'Zona 3', user_name: 'Mas Eko', mode: 'fertigation', duration_minutes: 30, reason: 'Cabai butuh air tambahan', started_at: '2026-04-18T08:15:00Z', ended_at: '2026-04-18T08:45:00Z', status: 'completed' },
  { id: 'ol3', zone_id: 'z2', zone_name: 'Zona 2', user_name: 'Pak Budi', mode: 'water', duration_minutes: 10, reason: '', started_at: '2026-04-18T07:00:00Z', ended_at: '2026-04-18T07:10:00Z', status: 'completed' },
];

// ─── Irrigation Logs ─────────────────
export const mockIrrigationLogs: IrrigationLog[] = [
  { id: 'il1', zone_id: 'z1', zone_name: 'Zona 1', source: 'auto', mode: 'water', duration_minutes: 15, water_volume_liters: 450, started_at: '2026-04-18T08:30:00Z', ended_at: '2026-04-18T08:45:00Z', status: 'completed' },
  { id: 'il2', zone_id: 'z5', zone_name: 'Zona 5', source: 'schedule', mode: 'fertigation', duration_minutes: 20, water_volume_liters: 600, started_at: '2026-04-18T05:40:00Z', ended_at: '2026-04-18T06:00:00Z', status: 'completed' },
  { id: 'il3', zone_id: 'z2', zone_name: 'Zona 2', source: 'manual_override', mode: 'water', duration_minutes: 10, water_volume_liters: 300, started_at: '2026-04-18T07:00:00Z', ended_at: '2026-04-18T07:10:00Z', status: 'completed' },
  { id: 'il4', zone_id: 'z1', zone_name: 'Zona 1', source: 'auto', mode: 'water', duration_minutes: 25, water_volume_liters: 750, started_at: '2026-04-18T09:25:00Z', status: 'running' },
];
