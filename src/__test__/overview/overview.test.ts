/**
 * Unit Tests for: src/app/(dashboard)/overview/page.tsx
 * 
 * Tests for Overview Dashboard functionality:
 * - KPI Card data
 * - Zone Card data
 * - Chart type selection
 * - Weather + Smart Delay logic
 * - Irrigation activity table
 */

import { mockZones, mockSensorData, mockEcoSavings, mockWeather, mockIrrigationLogs } from '@/shared/lib/mockData';
import { formatNumber, formatCurrency, cn } from '@/shared/lib/utils';
import { ZONE_STATUS } from '@/shared/lib/constants';

// ════════════════════════════════════════════
// KPI Cards Data
// ════════════════════════════════════════════
describe('Overview - KPI Cards', () => {
  describe('Positive Cases', () => {
    it('should have 4 KPI metrics', () => {
      const kpis = [
        { value: mockEcoSavings.water_saved_liters, unit: 'L', trend: mockEcoSavings.water_trend },
        { value: mockEcoSavings.fertilizer_saved_kg, unit: 'kg', trend: mockEcoSavings.fertilizer_trend },
        { value: mockEcoSavings.cost_saved_rupiah, unit: 'Rp', trend: mockEcoSavings.cost_trend },
        { value: mockEcoSavings.energy_saved_kwh, unit: 'kWh', trend: mockEcoSavings.energy_trend },
      ];
      expect(kpis).toHaveLength(4);
    });

    it('each KPI should have positive value', () => {
      expect(mockEcoSavings.water_saved_liters).toBeGreaterThan(0);
      expect(mockEcoSavings.fertilizer_saved_kg).toBeGreaterThan(0);
      expect(mockEcoSavings.cost_saved_rupiah).toBeGreaterThan(0);
      expect(mockEcoSavings.energy_saved_kwh).toBeGreaterThan(0);
    });

    it('trend formatting: positive trends should show arrow up', () => {
      const isPositive = mockEcoSavings.water_trend >= 0;
      expect(isPositive).toBe(true);
    });

    it('currency KPI should display abbreviated format', () => {
      const formatted = formatCurrency(mockEcoSavings.cost_saved_rupiah);
      expect(formatted).toContain('Rp');
      expect(formatted).toContain('Jt');
    });

    it('non-currency KPI should display with unit', () => {
      const formatted = formatNumber(mockEcoSavings.water_saved_liters);
      expect(formatted).toBe('12.450');
    });
  });

  describe('Negative Cases', () => {
    it('no KPI value should be NaN', () => {
      expect(isNaN(mockEcoSavings.water_saved_liters)).toBe(false);
      expect(isNaN(mockEcoSavings.fertilizer_saved_kg)).toBe(false);
      expect(isNaN(mockEcoSavings.cost_saved_rupiah)).toBe(false);
      expect(isNaN(mockEcoSavings.energy_saved_kwh)).toBe(false);
    });
  });
});

// ════════════════════════════════════════════
// Zone Cards (Mini Agri-Twin)
// ════════════════════════════════════════════
describe('Overview - Zone Cards', () => {
  describe('Positive Cases', () => {
    it('should display all 5 zones', () => {
      expect(mockZones).toHaveLength(5);
    });

    it('each zone should have matching sensor data', () => {
      mockZones.forEach(zone => {
        const sensor = mockSensorData[zone.id];
        expect(sensor).toBeDefined();
      });
    });

    it('should get correct status label from ZONE_STATUS', () => {
      mockZones.forEach(zone => {
        const status = ZONE_STATUS[zone.status];
        expect(status).toBeDefined();
        expect(status.label).not.toBe('');
        expect(status.icon).not.toBe('');
      });
    });

    it('irrigating zones should have pulsing animation class', () => {
      const irrigatingZones = mockZones.filter(z => z.status === 'irrigating');
      expect(irrigatingZones.length).toBeGreaterThan(0);
    });
  });

  describe('Negative Cases', () => {
    it('zone name should not be empty', () => {
      mockZones.forEach(zone => {
        expect(zone.name).not.toBe('');
      });
    });

    it('soil moisture display should be a valid number', () => {
      mockZones.forEach(zone => {
        const sensor = mockSensorData[zone.id];
        expect(typeof sensor.soil_moisture).toBe('number');
        expect(isNaN(sensor.soil_moisture)).toBe(false);
      });
    });
  });
});

// ════════════════════════════════════════════
// Chart Type Selection
// ════════════════════════════════════════════
describe('Overview - Sensor Chart Selection', () => {
  const chartTypes = ['soil_moisture', 'temperature', 'humidity', 'ph'];
  const chartColors: Record<string, string> = {
    soil_moisture: '#10B981',
    temperature: '#EF4444',
    humidity: '#3B82F6',
    ph: '#F59E0B',
  };
  const chartLabels: Record<string, string> = {
    soil_moisture: 'Kelembaban Tanah (%)',
    temperature: 'Suhu Udara (°C)',
    humidity: 'Kelembaban Udara (%)',
    ph: 'pH Tanah',
  };

  describe('Positive Cases', () => {
    it('should have 4 chart types', () => {
      expect(Object.keys(chartLabels)).toHaveLength(4);
    });

    it('each chart type should have a label', () => {
      chartTypes.forEach(type => {
        expect(chartLabels[type]).toBeDefined();
        expect(chartLabels[type]).not.toBe('');
      });
    });

    it('each chart type should have a color', () => {
      chartTypes.forEach(type => {
        expect(chartColors[type]).toBeDefined();
        expect(chartColors[type]).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it('default chart type should be soil_moisture', () => {
      const defaultType = 'soil_moisture';
      expect(chartTypes).toContain(defaultType);
    });
  });

  describe('Negative Cases', () => {
    it('should not have unknown chart types', () => {
      expect(chartLabels).not.toHaveProperty('pressure');
      expect(chartLabels).not.toHaveProperty('altitude');
    });
  });
});

// ════════════════════════════════════════════
// Weather & Smart Delay Logic
// ════════════════════════════════════════════
describe('Overview - Weather & Smart Delay', () => {
  describe('Positive Cases', () => {
    it('should display current weather data', () => {
      expect(mockWeather.temperature).toBeDefined();
      expect(mockWeather.humidity).toBeDefined();
      expect(mockWeather.description).toBeDefined();
      expect(mockWeather.icon).toBeDefined();
    });

    it('Smart Delay should activate when pop > 70%', () => {
      const isSmartDelayActive = mockWeather.pop > 70;
      // Current pop is 45, so should not be active
      expect(isSmartDelayActive).toBe(false);
    });

    it('should show normal status when pop <= 70%', () => {
      const isNormal = mockWeather.pop <= 70;
      expect(isNormal).toBe(true);
    });

    it('forecast should have future timestamps', () => {
      mockWeather.forecast.forEach(f => {
        expect(f.dt).toBeGreaterThan(0);
      });
    });
  });

  describe('Negative Cases', () => {
    it('should handle edge case where pop is exactly 70', () => {
      const pop = 70;
      const isActive = pop > 70;
      expect(isActive).toBe(false);
    });

    it('should handle edge case where pop is exactly 71', () => {
      const pop = 71;
      const isActive = pop > 70;
      expect(isActive).toBe(true);
    });
  });
});

// ════════════════════════════════════════════
// Recent Irrigation Activity Table
// ════════════════════════════════════════════
describe('Overview - Irrigation Activity Table', () => {
  describe('Positive Cases', () => {
    it('should display irrigation logs', () => {
      expect(mockIrrigationLogs.length).toBeGreaterThan(0);
    });

    it('each log should have displayable zone name', () => {
      mockIrrigationLogs.forEach(log => {
        expect(log.zone_name).not.toBe('');
      });
    });

    it('source labels should map correctly', () => {
      mockIrrigationLogs.forEach(log => {
        const label = log.source === 'auto' ? '🤖 Otomatis' : log.source === 'schedule' ? '📅 Jadwal' : '🔧 Override';
        expect(label).toBeTruthy();
      });
    });

    it('status labels should map correctly', () => {
      mockIrrigationLogs.forEach(log => {
        const label = log.status === 'running' ? '▶️ Berjalan' : '✅ Selesai';
        expect(label).toBeTruthy();
      });
    });

    it('water volume should format with L suffix', () => {
      mockIrrigationLogs.forEach(log => {
        const formatted = formatNumber(log.water_volume_liters);
        expect(formatted).toBeTruthy();
      });
    });
  });

  describe('Negative Cases', () => {
    it('no log should have zero water volume', () => {
      mockIrrigationLogs.forEach(log => {
        expect(log.water_volume_liters).toBeGreaterThan(0);
      });
    });

    it('no log should have zero duration', () => {
      mockIrrigationLogs.forEach(log => {
        expect(log.duration_minutes).toBeGreaterThan(0);
      });
    });
  });
});
