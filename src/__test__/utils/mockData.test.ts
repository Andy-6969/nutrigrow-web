/**
 * Unit Tests for: src/shared/lib/mockData.ts
 * 
 * Tests for mock data integrity:
 * - mockZones
 * - mockSensorData
 * - mockSensorHistory
 * - mockDevices
 * - mockEcoSavings
 * - mockWeather
 * - mockNotifications
 * - mockOverrideLogs
 * - mockIrrigationLogs
 */

import {
  mockZones,
  mockSensorData,
  mockSensorHistory,
  mockDevices,
  mockEcoSavings,
  mockEcoSavingsHistory,
  mockWeather,
  mockNotifications,
  mockOverrideLogs,
  mockIrrigationLogs,
} from '@/shared/lib/mockData';

// ════════════════════════════════════════════
// mockZones
// ════════════════════════════════════════════
describe('mockZones - Zone Data', () => {
  describe('Positive Cases', () => {
    it('should have 5 zones', () => {
      expect(mockZones).toHaveLength(5);
    });

    it('each zone should have required properties', () => {
      mockZones.forEach(zone => {
        expect(zone).toHaveProperty('id');
        expect(zone).toHaveProperty('farm_id');
        expect(zone).toHaveProperty('name');
        expect(zone).toHaveProperty('area_ha');
        expect(zone).toHaveProperty('crop_type');
        expect(zone).toHaveProperty('status');
      });
    });

    it('each zone should have a valid status', () => {
      const validStatuses = ['irrigating', 'idle', 'delayed', 'error'];
      mockZones.forEach(zone => {
        expect(validStatuses).toContain(zone.status);
      });
    });

    it('each zone should have positive area', () => {
      mockZones.forEach(zone => {
        expect(zone.area_ha).toBeGreaterThan(0);
      });
    });

    it('zone IDs should be unique', () => {
      const ids = mockZones.map(z => z.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('should contain at least one zone with each status', () => {
      const statuses = mockZones.map(z => z.status);
      expect(statuses).toContain('irrigating');
      expect(statuses).toContain('idle');
      expect(statuses).toContain('delayed');
      expect(statuses).toContain('error');
    });
  });

  describe('Negative Cases', () => {
    it('no zone should have empty name', () => {
      mockZones.forEach(zone => {
        expect(zone.name).not.toBe('');
      });
    });

    it('no zone should have empty crop_type', () => {
      mockZones.forEach(zone => {
        expect(zone.crop_type).not.toBe('');
      });
    });

    it('no zone should have zero or negative area', () => {
      mockZones.forEach(zone => {
        expect(zone.area_ha).toBeGreaterThan(0);
      });
    });
  });
});

// ════════════════════════════════════════════
// mockSensorData
// ════════════════════════════════════════════
describe('mockSensorData - Sensor Readings', () => {
  describe('Positive Cases', () => {
    it('should have sensor data for each zone', () => {
      mockZones.forEach(zone => {
        expect(mockSensorData).toHaveProperty(zone.id);
      });
    });

    it('each sensor reading should have all required fields', () => {
      Object.values(mockSensorData).forEach(sensor => {
        expect(sensor).toHaveProperty('soil_moisture');
        expect(sensor).toHaveProperty('temperature');
        expect(sensor).toHaveProperty('humidity');
        expect(sensor).toHaveProperty('ph');
        expect(sensor).toHaveProperty('recorded_at');
      });
    });

    it('soil moisture should be between 0 and 100', () => {
      Object.values(mockSensorData).forEach(sensor => {
        expect(sensor.soil_moisture).toBeGreaterThanOrEqual(0);
        expect(sensor.soil_moisture).toBeLessThanOrEqual(100);
      });
    });

    it('temperature should be in reasonable range (0-50°C)', () => {
      Object.values(mockSensorData).forEach(sensor => {
        expect(sensor.temperature).toBeGreaterThan(0);
        expect(sensor.temperature).toBeLessThan(50);
      });
    });

    it('humidity should be between 0 and 100', () => {
      Object.values(mockSensorData).forEach(sensor => {
        expect(sensor.humidity).toBeGreaterThanOrEqual(0);
        expect(sensor.humidity).toBeLessThanOrEqual(100);
      });
    });

    it('pH should be between 0 and 14', () => {
      Object.values(mockSensorData).forEach(sensor => {
        expect(sensor.ph).toBeGreaterThanOrEqual(0);
        expect(sensor.ph).toBeLessThanOrEqual(14);
      });
    });

    it('recorded_at should be valid ISO date string', () => {
      Object.values(mockSensorData).forEach(sensor => {
        expect(() => new Date(sensor.recorded_at)).not.toThrow();
        expect(new Date(sensor.recorded_at).toISOString()).toBeTruthy();
      });
    });
  });

  describe('Negative Cases', () => {
    it('should not have sensor data for non-existent zones', () => {
      expect(mockSensorData).not.toHaveProperty('z999');
      expect(mockSensorData).not.toHaveProperty('nonexistent');
    });

    it('battery level should not exceed 100', () => {
      Object.values(mockSensorData).forEach(sensor => {
        if (sensor.battery !== undefined) {
          expect(sensor.battery).toBeLessThanOrEqual(100);
        }
      });
    });

    it('RSSI should be negative (standard WiFi/LoRa)', () => {
      Object.values(mockSensorData).forEach(sensor => {
        if (sensor.rssi !== undefined) {
          expect(sensor.rssi).toBeLessThan(0);
        }
      });
    });
  });
});

// ════════════════════════════════════════════
// mockSensorHistory
// ════════════════════════════════════════════
describe('mockSensorHistory - 24h Sensor History', () => {
  describe('Positive Cases', () => {
    it('should have 48 data points (every 30 minutes for 24 hours)', () => {
      expect(mockSensorHistory).toHaveLength(48);
    });

    it('each data point should have time and all sensor fields', () => {
      mockSensorHistory.forEach(point => {
        expect(point).toHaveProperty('time');
        expect(point).toHaveProperty('soil_moisture');
        expect(point).toHaveProperty('temperature');
        expect(point).toHaveProperty('humidity');
        expect(point).toHaveProperty('ph');
      });
    });

    it('time format should be HH:MM', () => {
      mockSensorHistory.forEach(point => {
        expect(point.time).toMatch(/^\d{2}:\d{2}$/);
      });
    });

    it('first entry should start at 00:00', () => {
      expect(mockSensorHistory[0].time).toBe('00:00');
    });

    it('last entry should be 23:30', () => {
      expect(mockSensorHistory[47].time).toBe('23:30');
    });
  });

  describe('Negative Cases', () => {
    it('sensor values should be numeric', () => {
      mockSensorHistory.forEach(point => {
        expect(typeof point.soil_moisture).toBe('number');
        expect(typeof point.temperature).toBe('number');
        expect(typeof point.humidity).toBe('number');
        expect(typeof point.ph).toBe('number');
      });
    });

    it('soil moisture values should be positive', () => {
      mockSensorHistory.forEach(point => {
        expect(point.soil_moisture).toBeGreaterThan(0);
      });
    });
  });
});

// ════════════════════════════════════════════
// mockDevices
// ════════════════════════════════════════════
describe('mockDevices - Device Data', () => {
  describe('Positive Cases', () => {
    it('should have 8 devices', () => {
      expect(mockDevices).toHaveLength(8);
    });

    it('each device should have required properties', () => {
      mockDevices.forEach(device => {
        expect(device).toHaveProperty('id');
        expect(device).toHaveProperty('device_type');
        expect(device).toHaveProperty('firmware_version');
        expect(device).toHaveProperty('battery_level');
        expect(device).toHaveProperty('rssi');
        expect(device).toHaveProperty('last_heartbeat');
        expect(device).toHaveProperty('is_online');
      });
    });

    it('device types should be valid', () => {
      const validTypes = ['sensor', 'actuator', 'gateway'];
      mockDevices.forEach(device => {
        expect(validTypes).toContain(device.device_type);
      });
    });

    it('should have at least one gateway device', () => {
      const gateways = mockDevices.filter(d => d.device_type === 'gateway');
      expect(gateways.length).toBeGreaterThanOrEqual(1);
    });

    it('should have mix of online and offline devices', () => {
      const online = mockDevices.filter(d => d.is_online);
      const offline = mockDevices.filter(d => !d.is_online);
      expect(online.length).toBeGreaterThan(0);
      expect(offline.length).toBeGreaterThan(0);
    });

    it('device IDs should be unique', () => {
      const ids = mockDevices.map(d => d.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('firmware versions should follow semver pattern', () => {
      mockDevices.forEach(device => {
        expect(device.firmware_version).toMatch(/^\d+\.\d+\.\d+$/);
      });
    });
  });

  describe('Negative Cases', () => {
    it('battery level should be between 0 and 100', () => {
      mockDevices.forEach(device => {
        expect(device.battery_level).toBeGreaterThanOrEqual(0);
        expect(device.battery_level).toBeLessThanOrEqual(100);
      });
    });

    it('offline devices should have lower battery or poor signal', () => {
      const offlineDevices = mockDevices.filter(d => !d.is_online);
      offlineDevices.forEach(device => {
        // Offline devices typically have poor signal or low battery
        expect(device.rssi).toBeLessThan(-80);
      });
    });

    it('RSSI should be within valid range (-100 to 0)', () => {
      mockDevices.forEach(device => {
        expect(device.rssi).toBeGreaterThanOrEqual(-100);
        expect(device.rssi).toBeLessThanOrEqual(0);
      });
    });
  });
});

// ════════════════════════════════════════════
// mockEcoSavings
// ════════════════════════════════════════════
describe('mockEcoSavings - Eco Savings Data', () => {
  describe('Positive Cases', () => {
    it('should have all savings fields', () => {
      expect(mockEcoSavings).toHaveProperty('water_saved_liters');
      expect(mockEcoSavings).toHaveProperty('fertilizer_saved_kg');
      expect(mockEcoSavings).toHaveProperty('cost_saved_rupiah');
      expect(mockEcoSavings).toHaveProperty('energy_saved_kwh');
    });

    it('should have all trend fields', () => {
      expect(mockEcoSavings).toHaveProperty('water_trend');
      expect(mockEcoSavings).toHaveProperty('fertilizer_trend');
      expect(mockEcoSavings).toHaveProperty('cost_trend');
      expect(mockEcoSavings).toHaveProperty('energy_trend');
    });

    it('all savings values should be positive', () => {
      expect(mockEcoSavings.water_saved_liters).toBeGreaterThan(0);
      expect(mockEcoSavings.fertilizer_saved_kg).toBeGreaterThan(0);
      expect(mockEcoSavings.cost_saved_rupiah).toBeGreaterThan(0);
      expect(mockEcoSavings.energy_saved_kwh).toBeGreaterThan(0);
    });

    it('trends should be numeric', () => {
      expect(typeof mockEcoSavings.water_trend).toBe('number');
      expect(typeof mockEcoSavings.fertilizer_trend).toBe('number');
      expect(typeof mockEcoSavings.cost_trend).toBe('number');
      expect(typeof mockEcoSavings.energy_trend).toBe('number');
    });
  });

  describe('Negative Cases', () => {
    it('savings values should not be zero', () => {
      expect(mockEcoSavings.water_saved_liters).not.toBe(0);
      expect(mockEcoSavings.cost_saved_rupiah).not.toBe(0);
    });
  });
});

// ════════════════════════════════════════════
// mockEcoSavingsHistory
// ════════════════════════════════════════════
describe('mockEcoSavingsHistory - Weekly Savings History', () => {
  describe('Positive Cases', () => {
    it('should have 7 days of data', () => {
      expect(mockEcoSavingsHistory).toHaveLength(7);
    });

    it('each entry should have all required fields', () => {
      mockEcoSavingsHistory.forEach(entry => {
        expect(entry).toHaveProperty('period');
        expect(entry).toHaveProperty('water');
        expect(entry).toHaveProperty('fertilizer');
        expect(entry).toHaveProperty('cost');
        expect(entry).toHaveProperty('energy');
      });
    });

    it('all values should be positive', () => {
      mockEcoSavingsHistory.forEach(entry => {
        expect(entry.water).toBeGreaterThan(0);
        expect(entry.fertilizer).toBeGreaterThan(0);
        expect(entry.cost).toBeGreaterThan(0);
        expect(entry.energy).toBeGreaterThan(0);
      });
    });
  });

  describe('Negative Cases', () => {
    it('period labels should not be empty', () => {
      mockEcoSavingsHistory.forEach(entry => {
        expect(entry.period).not.toBe('');
      });
    });
  });
});

// ════════════════════════════════════════════
// mockWeather
// ════════════════════════════════════════════
describe('mockWeather - Weather Data', () => {
  describe('Positive Cases', () => {
    it('should have all required weather fields', () => {
      expect(mockWeather).toHaveProperty('temperature');
      expect(mockWeather).toHaveProperty('humidity');
      expect(mockWeather).toHaveProperty('description');
      expect(mockWeather).toHaveProperty('icon');
      expect(mockWeather).toHaveProperty('pop');
      expect(mockWeather).toHaveProperty('wind_speed');
      expect(mockWeather).toHaveProperty('forecast');
    });

    it('temperature should be in reasonable range', () => {
      expect(mockWeather.temperature).toBeGreaterThan(0);
      expect(mockWeather.temperature).toBeLessThan(50);
    });

    it('humidity should be between 0 and 100', () => {
      expect(mockWeather.humidity).toBeGreaterThanOrEqual(0);
      expect(mockWeather.humidity).toBeLessThanOrEqual(100);
    });

    it('pop (precipitation probability) should be between 0 and 100', () => {
      expect(mockWeather.pop).toBeGreaterThanOrEqual(0);
      expect(mockWeather.pop).toBeLessThanOrEqual(100);
    });

    it('forecast should have multiple entries', () => {
      expect(mockWeather.forecast.length).toBeGreaterThan(0);
    });

    it('each forecast entry should have required fields', () => {
      mockWeather.forecast.forEach(entry => {
        expect(entry).toHaveProperty('dt');
        expect(entry).toHaveProperty('temp');
        expect(entry).toHaveProperty('humidity');
        expect(entry).toHaveProperty('pop');
        expect(entry).toHaveProperty('description');
        expect(entry).toHaveProperty('icon');
      });
    });
  });

  describe('Negative Cases', () => {
    it('wind speed should be non-negative', () => {
      expect(mockWeather.wind_speed).toBeGreaterThanOrEqual(0);
    });

    it('description should not be empty', () => {
      expect(mockWeather.description).not.toBe('');
    });

    it('forecast pop values should be between 0 and 100', () => {
      mockWeather.forecast.forEach(entry => {
        expect(entry.pop).toBeGreaterThanOrEqual(0);
        expect(entry.pop).toBeLessThanOrEqual(100);
      });
    });
  });
});

// ════════════════════════════════════════════
// mockNotifications
// ════════════════════════════════════════════
describe('mockNotifications - Notification Data', () => {
  describe('Positive Cases', () => {
    it('should have multiple notifications', () => {
      expect(mockNotifications.length).toBeGreaterThan(0);
    });

    it('each notification should have required fields', () => {
      mockNotifications.forEach(n => {
        expect(n).toHaveProperty('id');
        expect(n).toHaveProperty('title');
        expect(n).toHaveProperty('body');
        expect(n).toHaveProperty('type');
        expect(n).toHaveProperty('is_read');
        expect(n).toHaveProperty('created_at');
      });
    });

    it('notification types should be valid', () => {
      const validTypes = ['smart_delay', 'cycle_complete', 'device_alert', 'override'];
      mockNotifications.forEach(n => {
        expect(validTypes).toContain(n.type);
      });
    });

    it('should have mix of read and unread notifications', () => {
      const read = mockNotifications.filter(n => n.is_read);
      const unread = mockNotifications.filter(n => !n.is_read);
      expect(read.length).toBeGreaterThan(0);
      expect(unread.length).toBeGreaterThan(0);
    });

    it('notification IDs should be unique', () => {
      const ids = mockNotifications.map(n => n.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('Negative Cases', () => {
    it('no notification should have empty title', () => {
      mockNotifications.forEach(n => {
        expect(n.title).not.toBe('');
      });
    });

    it('no notification should have empty body', () => {
      mockNotifications.forEach(n => {
        expect(n.body).not.toBe('');
      });
    });

    it('created_at should be valid ISO date', () => {
      mockNotifications.forEach(n => {
        expect(() => new Date(n.created_at)).not.toThrow();
      });
    });
  });
});

// ════════════════════════════════════════════
// mockOverrideLogs
// ════════════════════════════════════════════
describe('mockOverrideLogs - Override Log Data', () => {
  describe('Positive Cases', () => {
    it('should have multiple override logs', () => {
      expect(mockOverrideLogs.length).toBeGreaterThan(0);
    });

    it('each log should have required fields', () => {
      mockOverrideLogs.forEach(log => {
        expect(log).toHaveProperty('id');
        expect(log).toHaveProperty('zone_id');
        expect(log).toHaveProperty('zone_name');
        expect(log).toHaveProperty('user_name');
        expect(log).toHaveProperty('duration_minutes');
        expect(log).toHaveProperty('started_at');
        expect(log).toHaveProperty('status');
      });
    });

    it('status should be a valid override status', () => {
      const validStatuses = ['active', 'completed', 'cancelled'];
      mockOverrideLogs.forEach(log => {
        expect(validStatuses).toContain(log.status);
      });
    });

    it('duration should be positive', () => {
      mockOverrideLogs.forEach(log => {
        expect(log.duration_minutes).toBeGreaterThan(0);
      });
    });
  });

  describe('Negative Cases', () => {
    it('no log should have empty user_name', () => {
      mockOverrideLogs.forEach(log => {
        expect(log.user_name).not.toBe('');
      });
    });

    it('log IDs should be unique', () => {
      const ids = mockOverrideLogs.map(l => l.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });
});

// ════════════════════════════════════════════
// mockIrrigationLogs
// ════════════════════════════════════════════
describe('mockIrrigationLogs - Irrigation Log Data', () => {
  describe('Positive Cases', () => {
    it('should have multiple irrigation logs', () => {
      expect(mockIrrigationLogs.length).toBeGreaterThan(0);
    });

    it('each log should have required fields', () => {
      mockIrrigationLogs.forEach(log => {
        expect(log).toHaveProperty('id');
        expect(log).toHaveProperty('zone_id');
        expect(log).toHaveProperty('zone_name');
        expect(log).toHaveProperty('source');
        expect(log).toHaveProperty('duration_minutes');
        expect(log).toHaveProperty('water_volume_liters');
        expect(log).toHaveProperty('started_at');
        expect(log).toHaveProperty('status');
      });
    });

    it('source should be valid', () => {
      const validSources = ['auto', 'manual_override', 'schedule'];
      mockIrrigationLogs.forEach(log => {
        expect(validSources).toContain(log.source);
      });
    });

    it('status should be valid', () => {
      const validStatuses = ['running', 'completed', 'cancelled', 'error'];
      mockIrrigationLogs.forEach(log => {
        expect(validStatuses).toContain(log.status);
      });
    });

    it('water volume should be positive', () => {
      mockIrrigationLogs.forEach(log => {
        expect(log.water_volume_liters).toBeGreaterThan(0);
      });
    });

    it('should have at least one running log', () => {
      const running = mockIrrigationLogs.filter(l => l.status === 'running');
      expect(running.length).toBeGreaterThan(0);
    });

    it('completed logs should have ended_at', () => {
      mockIrrigationLogs.filter(l => l.status === 'completed').forEach(log => {
        expect(log.ended_at).toBeDefined();
      });
    });
  });

  describe('Negative Cases', () => {
    it('running logs should not have ended_at', () => {
      mockIrrigationLogs.filter(l => l.status === 'running').forEach(log => {
        expect(log.ended_at).toBeUndefined();
      });
    });

    it('log IDs should be unique', () => {
      const ids = mockIrrigationLogs.map(l => l.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('duration should not exceed 24 hours (1440 minutes)', () => {
      mockIrrigationLogs.forEach(log => {
        expect(log.duration_minutes).toBeLessThanOrEqual(1440);
      });
    });
  });
});
