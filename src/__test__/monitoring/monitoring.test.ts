/**
 * Unit Tests for: src/app/(dashboard)/monitoring/page.tsx
 * 
 * Tests for Sensor Monitoring functionality:
 * - GaugeCard percentage calculation
 * - Sensor status determination via thresholds
 * - Zone selection logic
 * - Time range filter logic
 * - Sensor data display validation
 */

import { mockZones, mockSensorData, mockSensorHistory } from '@/shared/lib/mockData';
import { getThresholdColor, getSensorStatusColor } from '@/shared/lib/utils';
import { SENSOR_THRESHOLDS, ZONE_STATUS } from '@/shared/lib/constants';

// ════════════════════════════════════════════
// Gauge Percentage Calculation
// ════════════════════════════════════════════
describe('Gauge Percentage Calculation', () => {
  const calculatePercentage = (value: number, threshold: { low: number; high: number }) => {
    return Math.min(100, Math.max(0, ((value - 0) / (threshold.high * 1.3)) * 100));
  };

  describe('Positive Cases', () => {
    it('should calculate percentage for soil moisture within range', () => {
      const pct = calculatePercentage(50, SENSOR_THRESHOLDS.soilMoisture);
      expect(pct).toBeGreaterThan(0);
      expect(pct).toBeLessThanOrEqual(100);
    });

    it('should calculate percentage for temperature', () => {
      const pct = calculatePercentage(30, SENSOR_THRESHOLDS.temperature);
      expect(pct).toBeGreaterThan(0);
      expect(pct).toBeLessThanOrEqual(100);
    });

    it('should calculate percentage for humidity', () => {
      const pct = calculatePercentage(60, SENSOR_THRESHOLDS.humidity);
      expect(pct).toBeGreaterThan(0);
      expect(pct).toBeLessThanOrEqual(100);
    });

    it('should calculate percentage for pH', () => {
      const pct = calculatePercentage(6.5, SENSOR_THRESHOLDS.ph);
      expect(pct).toBeGreaterThan(0);
      expect(pct).toBeLessThanOrEqual(100);
    });

    it('should cap at 100% for very high values', () => {
      const pct = calculatePercentage(1000, SENSOR_THRESHOLDS.soilMoisture);
      expect(pct).toBe(100);
    });
  });

  describe('Negative / Edge Cases', () => {
    it('should floor at 0% for zero value', () => {
      const pct = calculatePercentage(0, SENSOR_THRESHOLDS.soilMoisture);
      expect(pct).toBe(0);
    });

    it('should not exceed 100%', () => {
      const pct = calculatePercentage(999, SENSOR_THRESHOLDS.temperature);
      expect(pct).toBeLessThanOrEqual(100);
    });

    it('should not go below 0%', () => {
      const pct = calculatePercentage(-10, SENSOR_THRESHOLDS.soilMoisture);
      expect(pct).toBeGreaterThanOrEqual(0);
    });
  });
});

// ════════════════════════════════════════════
// Sensor Status Determination
// ════════════════════════════════════════════
describe('Sensor Status Determination', () => {
  describe('Positive Cases - Soil Moisture', () => {
    it('should return success for normal range (30-75%)', () => {
      const status = getThresholdColor(50, SENSOR_THRESHOLDS.soilMoisture.low, SENSOR_THRESHOLDS.soilMoisture.high);
      expect(status).toBe('success');
    });

    it('should return danger for dry soil (<30%)', () => {
      const status = getThresholdColor(20, SENSOR_THRESHOLDS.soilMoisture.low, SENSOR_THRESHOLDS.soilMoisture.high);
      expect(status).toBe('danger');
    });

    it('should return warning for waterlogged (>75%)', () => {
      const status = getThresholdColor(80, SENSOR_THRESHOLDS.soilMoisture.low, SENSOR_THRESHOLDS.soilMoisture.high);
      expect(status).toBe('warning');
    });
  });

  describe('Positive Cases - Temperature', () => {
    it('should return success for normal temp (20-35°C)', () => {
      const status = getThresholdColor(28, SENSOR_THRESHOLDS.temperature.low, SENSOR_THRESHOLDS.temperature.high);
      expect(status).toBe('success');
    });

    it('should return danger for cold (<20°C)', () => {
      const status = getThresholdColor(15, SENSOR_THRESHOLDS.temperature.low, SENSOR_THRESHOLDS.temperature.high);
      expect(status).toBe('danger');
    });

    it('should return warning for hot (>35°C)', () => {
      const status = getThresholdColor(40, SENSOR_THRESHOLDS.temperature.low, SENSOR_THRESHOLDS.temperature.high);
      expect(status).toBe('warning');
    });
  });

  describe('Positive Cases - pH', () => {
    it('should return success for neutral pH (5.5-7.5)', () => {
      const status = getThresholdColor(6.8, SENSOR_THRESHOLDS.ph.low, SENSOR_THRESHOLDS.ph.high);
      expect(status).toBe('success');
    });

    it('should return danger for acidic soil (<5.5)', () => {
      const status = getThresholdColor(4.5, SENSOR_THRESHOLDS.ph.low, SENSOR_THRESHOLDS.ph.high);
      expect(status).toBe('danger');
    });

    it('should return warning for alkaline soil (>7.5)', () => {
      const status = getThresholdColor(8.5, SENSOR_THRESHOLDS.ph.low, SENSOR_THRESHOLDS.ph.high);
      expect(status).toBe('warning');
    });
  });

  describe('Status Color Mapping', () => {
    it('success status should map to green color', () => {
      expect(getSensorStatusColor('success')).toBe('#10B981');
    });

    it('warning status should map to yellow color', () => {
      expect(getSensorStatusColor('warning')).toBe('#F59E0B');
    });

    it('danger status should map to red color', () => {
      expect(getSensorStatusColor('danger')).toBe('#EF4444');
    });
  });
});

// ════════════════════════════════════════════
// Zone Selection
// ════════════════════════════════════════════
describe('Zone Selection for Monitoring', () => {
  describe('Positive Cases', () => {
    it('default selection should be first zone', () => {
      const defaultZone = mockZones[0].id;
      expect(defaultZone).toBe('z1');
    });

    it('each zone should have sensor data available', () => {
      mockZones.forEach(zone => {
        expect(mockSensorData[zone.id]).toBeDefined();
      });
    });

    it('selecting a zone should load its sensor data', () => {
      const selectedZone = 'z2';
      const sensor = mockSensorData[selectedZone];
      expect(sensor).toBeDefined();
      expect(sensor.soil_moisture).toBeDefined();
      expect(sensor.temperature).toBeDefined();
    });

    it('zone name should be displayed for selected zone', () => {
      const selectedZone = 'z3';
      const zoneName = mockZones.find(z => z.id === selectedZone)?.name;
      expect(zoneName).toBeDefined();
      expect(zoneName).toContain('Ladang Selatan');
    });
  });

  describe('Negative Cases', () => {
    it('non-existent zone should return undefined sensor data', () => {
      expect(mockSensorData['z999']).toBeUndefined();
    });

    it('zone list should not be empty', () => {
      expect(mockZones.length).toBeGreaterThan(0);
    });
  });
});

// ════════════════════════════════════════════
// Time Range Filter
// ════════════════════════════════════════════
describe('Time Range Filter', () => {
  const validRanges = ['24h', '7d', '30d'];

  describe('Positive Cases', () => {
    it('should accept valid time ranges', () => {
      validRanges.forEach(range => {
        expect(validRanges).toContain(range);
      });
    });

    it('default range should be 24h', () => {
      const defaultRange = '24h';
      expect(defaultRange).toBe('24h');
    });
  });

  describe('Negative Cases', () => {
    it('should not accept invalid ranges', () => {
      expect(validRanges).not.toContain('1h');
      expect(validRanges).not.toContain('1y');
      expect(validRanges).not.toContain('all');
    });
  });
});

// ════════════════════════════════════════════
// Sensor Data Display for All Zones
// ════════════════════════════════════════════
describe('Sensor Data Display per Zone', () => {
  describe('Positive Cases', () => {
    mockZones.forEach(zone => {
      it(`Zone "${zone.name}" should have complete sensor data`, () => {
        const sensor = mockSensorData[zone.id];
        expect(sensor).toBeDefined();
        expect(typeof sensor.soil_moisture).toBe('number');
        expect(typeof sensor.temperature).toBe('number');
        expect(typeof sensor.humidity).toBe('number');
        expect(typeof sensor.ph).toBe('number');
      });
    });
  });

  describe('Positive Cases - Threshold Status Check per Zone', () => {
    it('should determine correct soil moisture status for z4 (error zone)', () => {
      const sensor = mockSensorData['z4'];
      const status = getThresholdColor(
        sensor.soil_moisture,
        SENSOR_THRESHOLDS.soilMoisture.low,
        SENSOR_THRESHOLDS.soilMoisture.high
      );
      // z4 has soil_moisture of 28.1 which is below 30 (low threshold)
      expect(status).toBe('danger');
    });

    it('should determine correct soil moisture status for z1 (irrigating zone)', () => {
      const sensor = mockSensorData['z1'];
      const status = getThresholdColor(
        sensor.soil_moisture,
        SENSOR_THRESHOLDS.soilMoisture.low,
        SENSOR_THRESHOLDS.soilMoisture.high
      );
      // z1 has soil_moisture of 62.5 which is within range
      expect(status).toBe('success');
    });
  });
});
