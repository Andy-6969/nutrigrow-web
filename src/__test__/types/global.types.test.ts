/**
 * Unit Tests for: src/shared/types/global.types.ts
 * 
 * Type validation tests — ensuring mock data conforms to TypeScript interfaces.
 * Since TypeScript types are erased at runtime, we verify data shape compliance.
 */

import type {
  Zone,
  ZoneStatus,
  SensorData,
  Device,
  Farm,
  User,
  Notification,
  EcoSavingsData,
  WeatherData,
  WeatherForecast,
  OverrideLog,
  IrrigationLog,
} from '@/shared/types/global.types';
import {
  mockZones,
  mockSensorData,
  mockDevices,
  mockEcoSavings,
  mockWeather,
  mockNotifications,
  mockOverrideLogs,
  mockIrrigationLogs,
} from '@/shared/lib/mockData';

// ════════════════════════════════════════════
// ZoneStatus Type Validation
// ════════════════════════════════════════════
describe('ZoneStatus Type Validation', () => {
  describe('Positive Cases', () => {
    it('should accept valid zone statuses', () => {
      const validStatuses: ZoneStatus[] = ['idle', 'irrigating', 'delayed', 'error'];
      validStatuses.forEach(status => {
        expect(['idle', 'irrigating', 'delayed', 'error']).toContain(status);
      });
    });
  });

  describe('Negative Cases', () => {
    it('mock zones should not contain invalid statuses', () => {
      const invalidStatuses = ['running', 'paused', 'stopped', 'unknown'];
      mockZones.forEach(zone => {
        expect(invalidStatuses).not.toContain(zone.status);
      });
    });
  });
});

// ════════════════════════════════════════════
// Zone Interface Shape Validation
// ════════════════════════════════════════════
describe('Zone Interface Shape', () => {
  describe('Positive Cases', () => {
    it('mockZones should have correct Zone shape', () => {
      mockZones.forEach(zone => {
        expect(typeof zone.id).toBe('string');
        expect(typeof zone.farm_id).toBe('string');
        expect(typeof zone.name).toBe('string');
        expect(typeof zone.area_ha).toBe('number');
        expect(typeof zone.crop_type).toBe('string');
        expect(typeof zone.status).toBe('string');
      });
    });

    it('optional layout_json should be object or undefined', () => {
      mockZones.forEach(zone => {
        if (zone.layout_json !== undefined) {
          expect(typeof zone.layout_json).toBe('object');
        }
      });
    });
  });

  describe('Negative Cases', () => {
    it('id should not be a number', () => {
      mockZones.forEach(zone => {
        expect(typeof zone.id).not.toBe('number');
      });
    });

    it('area_ha should not be a string', () => {
      mockZones.forEach(zone => {
        expect(typeof zone.area_ha).not.toBe('string');
      });
    });
  });
});

// ════════════════════════════════════════════
// SensorData Interface Shape Validation
// ════════════════════════════════════════════
describe('SensorData Interface Shape', () => {
  describe('Positive Cases', () => {
    it('mockSensorData values should have correct shape', () => {
      Object.values(mockSensorData).forEach(sensor => {
        expect(typeof sensor.soil_moisture).toBe('number');
        expect(typeof sensor.temperature).toBe('number');
        expect(typeof sensor.humidity).toBe('number');
        expect(typeof sensor.ph).toBe('number');
        expect(typeof sensor.recorded_at).toBe('string');
      });
    });

    it('optional battery and rssi should be number if present', () => {
      Object.values(mockSensorData).forEach(sensor => {
        if (sensor.battery !== undefined) {
          expect(typeof sensor.battery).toBe('number');
        }
        if (sensor.rssi !== undefined) {
          expect(typeof sensor.rssi).toBe('number');
        }
      });
    });
  });
});

// ════════════════════════════════════════════
// Device Interface Shape Validation
// ════════════════════════════════════════════
describe('Device Interface Shape', () => {
  describe('Positive Cases', () => {
    it('mockDevices should have correct Device shape', () => {
      mockDevices.forEach(device => {
        expect(typeof device.id).toBe('string');
        expect(typeof device.zone_id).toBe('string');
        expect(['sensor', 'actuator', 'gateway']).toContain(device.device_type);
        expect(typeof device.firmware_version).toBe('string');
        expect(typeof device.battery_level).toBe('number');
        expect(typeof device.rssi).toBe('number');
        expect(typeof device.last_heartbeat).toBe('string');
        expect(typeof device.is_online).toBe('boolean');
      });
    });
  });

  describe('Negative Cases', () => {
    it('is_online should not be a string', () => {
      mockDevices.forEach(device => {
        expect(typeof device.is_online).not.toBe('string');
      });
    });

    it('battery_level should not be boolean', () => {
      mockDevices.forEach(device => {
        expect(typeof device.battery_level).not.toBe('boolean');
      });
    });
  });
});

// ════════════════════════════════════════════
// Notification Interface Shape Validation
// ════════════════════════════════════════════
describe('Notification Interface Shape', () => {
  describe('Positive Cases', () => {
    it('mockNotifications should have correct Notification shape', () => {
      mockNotifications.forEach(notification => {
        expect(typeof notification.id).toBe('string');
        expect(typeof notification.title).toBe('string');
        expect(typeof notification.body).toBe('string');
        expect(['smart_delay', 'cycle_complete', 'device_alert', 'override']).toContain(notification.type);
        expect(typeof notification.is_read).toBe('boolean');
        expect(typeof notification.created_at).toBe('string');
      });
    });

    it('optional zone_name should be string if present', () => {
      mockNotifications.forEach(n => {
        if (n.zone_name !== undefined) {
          expect(typeof n.zone_name).toBe('string');
        }
      });
    });
  });
});

// ════════════════════════════════════════════
// EcoSavingsData Interface Shape Validation
// ════════════════════════════════════════════
describe('EcoSavingsData Interface Shape', () => {
  describe('Positive Cases', () => {
    it('mockEcoSavings should have correct shape', () => {
      expect(typeof mockEcoSavings.water_saved_liters).toBe('number');
      expect(typeof mockEcoSavings.fertilizer_saved_kg).toBe('number');
      expect(typeof mockEcoSavings.cost_saved_rupiah).toBe('number');
      expect(typeof mockEcoSavings.energy_saved_kwh).toBe('number');
      expect(typeof mockEcoSavings.water_trend).toBe('number');
      expect(typeof mockEcoSavings.fertilizer_trend).toBe('number');
      expect(typeof mockEcoSavings.cost_trend).toBe('number');
      expect(typeof mockEcoSavings.energy_trend).toBe('number');
    });
  });
});

// ════════════════════════════════════════════
// WeatherData Interface Shape Validation
// ════════════════════════════════════════════
describe('WeatherData Interface Shape', () => {
  describe('Positive Cases', () => {
    it('mockWeather should have correct WeatherData shape', () => {
      expect(typeof mockWeather.temperature).toBe('number');
      expect(typeof mockWeather.humidity).toBe('number');
      expect(typeof mockWeather.description).toBe('string');
      expect(typeof mockWeather.icon).toBe('string');
      expect(typeof mockWeather.pop).toBe('number');
      expect(typeof mockWeather.wind_speed).toBe('number');
      expect(Array.isArray(mockWeather.forecast)).toBe(true);
    });

    it('forecast entries should have correct WeatherForecast shape', () => {
      mockWeather.forecast.forEach(f => {
        expect(typeof f.dt).toBe('number');
        expect(typeof f.temp).toBe('number');
        expect(typeof f.humidity).toBe('number');
        expect(typeof f.pop).toBe('number');
        expect(typeof f.description).toBe('string');
        expect(typeof f.icon).toBe('string');
      });
    });
  });
});

// ════════════════════════════════════════════
// OverrideLog Interface Shape Validation
// ════════════════════════════════════════════
describe('OverrideLog Interface Shape', () => {
  describe('Positive Cases', () => {
    it('mockOverrideLogs should have correct OverrideLog shape', () => {
      mockOverrideLogs.forEach(log => {
        expect(typeof log.id).toBe('string');
        expect(typeof log.zone_id).toBe('string');
        expect(typeof log.zone_name).toBe('string');
        expect(typeof log.user_name).toBe('string');
        expect(typeof log.duration_minutes).toBe('number');
        expect(typeof log.started_at).toBe('string');
        expect(['active', 'completed', 'cancelled']).toContain(log.status);
      });
    });

    it('optional fields should have correct types if present', () => {
      mockOverrideLogs.forEach(log => {
        if (log.reason !== undefined) expect(typeof log.reason).toBe('string');
        if (log.ended_at !== undefined) expect(typeof log.ended_at).toBe('string');
      });
    });
  });
});

// ════════════════════════════════════════════
// IrrigationLog Interface Shape Validation
// ════════════════════════════════════════════
describe('IrrigationLog Interface Shape', () => {
  describe('Positive Cases', () => {
    it('mockIrrigationLogs should have correct IrrigationLog shape', () => {
      mockIrrigationLogs.forEach(log => {
        expect(typeof log.id).toBe('string');
        expect(typeof log.zone_id).toBe('string');
        expect(typeof log.zone_name).toBe('string');
        expect(['auto', 'manual_override', 'schedule']).toContain(log.source);
        expect(typeof log.duration_minutes).toBe('number');
        expect(typeof log.water_volume_liters).toBe('number');
        expect(typeof log.started_at).toBe('string');
        expect(['running', 'completed', 'cancelled', 'error']).toContain(log.status);
      });
    });
  });
});
