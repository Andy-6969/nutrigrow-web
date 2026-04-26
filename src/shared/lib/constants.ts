// src/shared/lib/constants.ts

export const APP_NAME = 'NutriGrow';
export const APP_TAGLINE = 'Smart Fertigation System';
export const APP_VERSION = '2.0.0';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3002';

// Zone status colors
export const ZONE_STATUS = {
  irrigating:  { label: 'Air Biasa', color: '#3B82F6', bg: 'bg-primary-500', icon: '💧' },
  fertigating: { label: 'Air + Nutrisi', color: '#8B5CF6', bg: 'bg-purple-500', icon: '🧪' },
  idle:        { label: 'Idle', color: '#9CA3AF', bg: 'bg-secondary-500', icon: '💤' },
  delayed:     { label: 'Ditunda (Hujan)', color: '#F59E0B', bg: 'bg-accent-500', icon: '🟡' },
  error:       { label: 'Offline / Error', color: '#EF4444', bg: 'bg-danger-500', icon: '🔴' },
} as const;

// Sensor thresholds
export const SENSOR_THRESHOLDS = {
  soilMoisture: { low: 30, high: 75, unit: '%', label: 'Kelembaban Tanah' },
  temperature:  { low: 20, high: 35, unit: '°C', label: 'Suhu Udara' },
  humidity:     { low: 40, high: 80, unit: '%', label: 'Kelembaban Udara' },
  ph:           { low: 5.5, high: 7.5, unit: '', label: 'pH Tanah' },
} as const;

// Navigation items
export const NAV_ITEMS = [
  { id: 'overview',      label: 'Dashboard',        icon: 'LayoutDashboard', href: '/overview' },
  { id: 'agri-twin',     label: 'Agri-Twin',        icon: 'Map',             href: '/agri-twin' },
  { id: 'monitoring',    label: 'Monitoring',        icon: 'Activity',        href: '/monitoring' },
  { id: 'eco-savings',   label: 'Eco-Savings',       icon: 'Leaf',            href: '/eco-savings' },
  { id: 'schedules',     label: 'Jadwal',            icon: 'Calendar',        href: '/schedules' },
  { id: 'override',      label: 'Manual Override',   icon: 'Wrench',          href: '/override' },
  { id: 'devices',       label: 'Perangkat',         icon: 'Cpu',             href: '/devices' },
  { id: 'notifications', label: 'Notifikasi',        icon: 'Bell',            href: '/notifications' },
  { id: 'settings',      label: 'Pengaturan',        icon: 'Settings',        href: '/settings' },
] as const;
