// src/shared/lib/constants.ts

export const APP_NAME = 'Nutrigrow Web';
export const APP_TAGLINE = 'Smart Fertigation System';
export const APP_VERSION = '2.0.0';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3002';

// Zone status colors & translation keys
export const ZONE_STATUS = {
  irrigating:  { key: 'status_irrigating',  color: '#3B82F6', bg: 'bg-primary-500', icon: '💧' },
  fertigating: { key: 'status_fertigating', color: '#8B5CF6', bg: 'bg-purple-500', icon: '🧪' },
  idle:        { key: 'status_idle',        color: '#9CA3AF', bg: 'bg-secondary-500', icon: '💤' },
  delayed:     { key: 'status_delayed',     color: '#F59E0B', bg: 'bg-accent-500', icon: '🟡' },
  error:       { key: 'status_error',       color: '#EF4444', bg: 'bg-danger-500', icon: '🔴' },
} as const;

// Sensor thresholds
export const SENSOR_THRESHOLDS = {
  soilMoisture: { low: 30, high: 75, unit: '%', key: 'monitoring_soil_moisture' },
  temperature:  { low: 20, high: 35, unit: '°C', key: 'monitoring_temperature' },
  humidity:     { low: 40, high: 80, unit: '%', key: 'monitoring_humidity' },
  ph:           { low: 5.5, high: 7.5, unit: '', key: 'monitoring_ph' },
} as const;

// Navigation items
export const NAV_ITEMS = [
  { id: 'overview',      key: 'nav_dashboard',        icon: 'LayoutDashboard', href: '/overview' },
  { id: 'agri-twin',     key: 'nav_agri_twin',        icon: 'Map',             href: '/agri-twin' },
  { id: 'monitoring',    key: 'nav_monitoring',        icon: 'Activity',        href: '/monitoring' },
  { id: 'eco-savings',   key: 'nav_eco_savings',       icon: 'Leaf',            href: '/eco-savings' },
  { id: 'schedules',     key: 'nav_schedules',         icon: 'Calendar',        href: '/schedules' },
  { id: 'farms',         key: 'nav_farms',             icon: 'Sprout',          href: '/farms' },
  { id: 'devices',       key: 'nav_devices',           icon: 'Cpu',             href: '/devices' },
  { id: 'notifications', key: 'nav_notifications',    icon: 'Bell',            href: '/notifications' },
  { id: 'user-management',key: 'nav_user_management',  icon: 'Users',           href: '/user-management' },
  { id: 'settings',      key: 'nav_settings',         icon: 'Settings',        href: '/settings' },
] as const;
