// src/shared/types/global.types.ts

// ─── Auth & RBAC ──────────────────────────────────────────────
/** The three valid roles stored in user_profiles.role */
export type AppRole = 'super_admin' | 'pemilik_kebun' | 'guest' | 'viewer';

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
  planting_date?: string;
  plant_count?: number;
  recipe_id?: string | null;
  eco_mode?: boolean;
}

export interface SensorData {
  id?: string;
  zone_id?: string;
  soil_moisture: number;
  temperature: number;
  humidity: number;
  ph: number;
  tds?: number;
  battery?: number;
  rssi?: number;
  recorded_at: string;
}

export interface Device {
  id: string;
  zone_id: string;
  zone_name?: string;
  device_name?: string;
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

export interface EcoSavingsLog {
  id: number;
  zone_id: string;
  zone_name: string;
  normal_duration: number;
  eco_duration: number;
  water_saved_liters: number;
  reason: 'humidity_reduction' | 'rain_block' | 'eco_mode' | 'combined';
  eco_mode_active: boolean;
  humidity_at_time: number;
  will_rain_at_time: boolean;
  recommendation_id: number | null;
  created_at: string;
}

export interface EcoStatus {
  eco_mode: boolean;
  active_zones_count?: number;
  total_zones_count?: number;
  savings: {
    water_saved_liters: number;
    cost_saved_rupiah: number;
    energy_saved_kwh: number;
    time_saved_minutes: number;
    total_evaluations: number;
  };
}

export interface EcoDailySummary {
  date: string;
  water_saved: number;
  count: number;
  reasons: Record<string, number>;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  description: string;
  icon: string;
  pop: number; // probability of precipitation
  wind_speed: number;        // km/jam (BMKG: ws)
  wind_direction: string;    // arah angin dari (BMKG: wd)
  forecast: WeatherForecast[];
  // BMKG-specific fields
  akan_hujan: boolean;
  rekomendasi_siram: boolean;
  last_update: string;       // ISO timestamp from created_at
  lokasi: string;            // "Desa, Kecamatan"
  // Open-Meteo 7-day forecast
  weekly_forecast: WeeklyForecastDay[];
}

export interface WeeklyForecastDay {
  date: string;                      // "2026-05-03"
  day_name: string;                  // "Sab"
  temp_max: number;
  temp_min: number;
  precipitation_probability: number; // 0-100
  precipitation_sum: number;         // mm
  weather_code: number;              // WMO code
  icon: string;                      // emoji
  description: string;               // "Hujan Ringan"
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
  mode: 'water' | 'fertigation' | 'pump' | 'solenoid' | 'pump_pupuk';
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
  mode: 'water' | 'fertigation' | 'fertilizer' | 'solenoid';
  source: 'auto' | 'manual_override' | 'schedule';
  duration_minutes: number;
  water_volume_liters: number;
  started_at: string;
  ended_at?: string;
  status: 'running' | 'completed' | 'cancelled' | 'error';
}

export interface Schedule {
  id: string;
  zone_id: string;
  name: string;
  cron_expression: string;
  duration_minutes: number;
  is_active: boolean;
  include_fertigation?: boolean;
  mode: 'water' | 'fertilizer';
  created_at?: string;
  updated_at?: string;
  
  // Joined relation from public.zones
  zone_name?: string; 
}

export type ScoutingIssueType = 'hama' | 'penyakit' | 'infrastruktur' | 'lainnya';
export type ScoutingSeverity = 'rendah' | 'sedang' | 'tinggi';
export type ScoutingStatus = 'open' | 'in_progress' | 'resolved';

export interface ScoutingLog {
  id: string;
  zone_id: string;
  user_id?: string;
  issue_type: ScoutingIssueType;
  severity: ScoutingSeverity;
  notes: string;
  photo_url?: string;
  status: ScoutingStatus;
  created_at: string;
  updated_at: string;
  
  // Joined relation fields
  zone_name?: string;
  user_name?: string;
}

export interface RecipePhase {
  id: string;
  recipe_id: string;
  phase_order: number;
  name: string;
  emoji: string;
  day_start: number;
  day_end: number;
  frequency_per_day: number;
  irrigation_times: string[];
  water_volume_liters: number;
  ec_target_min: number;
  ec_target_max: number;
  ph_target_min: number;
  ph_target_max: number;
  notes?: string;
}

export interface NutrientRecipe {
  id: string;
  farm_id: string;
  name: string;
  plant_type: string;
  description?: string;
  is_default: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;

  // Joined relations
  phases?: RecipePhase[];
}
