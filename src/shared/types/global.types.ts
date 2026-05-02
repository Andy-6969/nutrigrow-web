// src/shared/types/global.types.ts

// ─── Auth & RBAC ──────────────────────────────────────────────
/** The three valid roles stored in user_profiles.role */
export type AppRole = 'super_admin' | 'pemilik_kebun' | 'guest';

/** Row shape from the public.roles table */
export interface RolesRow {
  name: AppRole;
}

/** Maps 1:1 with the public.user_profiles table.
 *  The `role` field is derived from the joined roles(name) relation,
 *  NOT stored directly as a column (new schema uses role_id FK). */
export interface UserProfile {
  id: string;              // UUID — matches auth.users.id
  email: string;
  full_name: string;       // Normalized from DB column 'nama' or 'full_name'
  role: AppRole;           // Resolved from roles.name via FK join
  role_id?: string | null; // FK to public.roles (UUID)
  is_active?: boolean;
  avatar_url?: string | null; // Google profile picture URL
  farm_id: string | null;
  assigned_zones: string[]; // UUID[]
  notification_preferences?: Record<string, boolean>; // JSONB
  created_at: string;
}

// ─── Domain ───────────────────────────────────────────────────
export type ZoneStatus = 'idle' | 'irrigating' | 'fertigating' | 'delayed' | 'error';

export interface Zone {
  id: string;
  farm_id: string;
  name: string;
  area_ha: number;
  crop_type: string;
  status: ZoneStatus;
  latitude?: number;
  longitude?: number;
  layout_json?: Record<string, unknown>;
}

export interface SensorData {
  id?: string;
  zone_id?: string;
  soil_moisture: number;
  temperature: number;
  humidity: number;
  ph: number;
  battery?: number;
  rssi?: number;
  recorded_at: string;
}

export interface Device {
  id: string;
  zone_id: string;
  zone_name?: string;
  device_type: 'sensor' | 'actuator' | 'gateway';
  firmware_version: string;
  battery_level: number;
  rssi: number;
  last_heartbeat: string;
  is_online: boolean;
}

export interface Farm {
  id: string;
  name: string;
  description?: string;
  location_address?: string;
  location_lat?: number;
  location_lng?: number;
  total_area_ha: number;
  owner_name?: string;
  created_at?: string;
}

/** @deprecated Use UserProfile from AuthContext instead */
export interface User {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
  farm_id: string | null;
  assigned_zones?: string[];
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  type: 'smart_delay' | 'cycle_complete' | 'device_alert' | 'override';
  zone_name?: string;
  is_read: boolean;
  created_at: string;
}

export interface EcoSavingsData {
  water_saved_liters: number;
  fertilizer_saved_kg: number;
  cost_saved_rupiah: number;
  energy_saved_kwh: number;
  water_trend: number;
  fertilizer_trend: number;
  cost_trend: number;
  energy_trend: number;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  description: string;
  icon: string;
  pop: number; // probability of precipitation
  wind_speed: number;
  forecast: WeatherForecast[];
}

export interface WeatherForecast {
  dt: number;
  temp: number;
  humidity: number;
  pop: number;
  description: string;
  icon: string;
}

export interface OverrideLog {
  id: string;
  zone_id: string;
  zone_name: string;
  user_name: string;
  mode: 'water' | 'fertigation';
  duration_minutes: number;
  reason?: string;
  started_at: string;
  ended_at?: string;
  status: 'active' | 'completed' | 'cancelled';
}

export interface IrrigationLog {
  id: string;
  zone_id: string;
  zone_name: string;
  mode: 'water' | 'fertigation';
  source: 'auto' | 'manual_override' | 'schedule';
  duration_minutes: number;
  water_volume_liters: number;
  started_at: string;
  ended_at?: string;
  status: 'running' | 'completed' | 'cancelled' | 'error';
}
