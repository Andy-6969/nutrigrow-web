/**
 * Unit Tests for: src/shared/lib/constants.ts
 * 
 * Tests for application constants:
 * - APP_NAME, APP_TAGLINE, APP_VERSION
 * - API_BASE_URL, WS_URL
 * - ZONE_STATUS
 * - SENSOR_THRESHOLDS
 * - NAV_ITEMS
 */

import { APP_NAME, APP_TAGLINE, APP_VERSION, API_BASE_URL, WS_URL, ZONE_STATUS, SENSOR_THRESHOLDS, NAV_ITEMS } from '@/shared/lib/constants';

// ════════════════════════════════════════════
// App Metadata Constants
// ════════════════════════════════════════════
describe('App Metadata Constants', () => {
  describe('Positive Cases', () => {
    it('should have correct APP_NAME', () => {
      expect(APP_NAME).toBe('NutriGrow');
    });

    it('should have correct APP_TAGLINE', () => {
      expect(APP_TAGLINE).toBe('Smart Fertigation System');
    });

    it('should have valid semantic version for APP_VERSION', () => {
      expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should have default API_BASE_URL', () => {
      expect(API_BASE_URL).toBe('http://localhost:3001');
    });

    it('should have default WS_URL', () => {
      expect(WS_URL).toBe('http://localhost:3002');
    });
  });

  describe('Negative Cases', () => {
    it('APP_NAME should not be empty', () => {
      expect(APP_NAME).not.toBe('');
    });

    it('APP_VERSION should not contain alpha characters', () => {
      expect(APP_VERSION).not.toMatch(/[a-zA-Z]/);
    });
  });
});

// ════════════════════════════════════════════
// ZONE_STATUS Constants
// ════════════════════════════════════════════
describe('ZONE_STATUS Constants', () => {
  describe('Positive Cases', () => {
    it('should contain all 4 status types', () => {
      const keys = Object.keys(ZONE_STATUS);
      expect(keys).toHaveLength(4);
      expect(keys).toContain('irrigating');
      expect(keys).toContain('idle');
      expect(keys).toContain('delayed');
      expect(keys).toContain('error');
    });

    it('irrigating status should have correct label and color', () => {
      expect(ZONE_STATUS.irrigating.label).toBe('Aktif Menyiram');
      expect(ZONE_STATUS.irrigating.color).toBe('#10B981');
      expect(ZONE_STATUS.irrigating.icon).toBe('🟢');
    });

    it('idle status should have correct label and color', () => {
      expect(ZONE_STATUS.idle.label).toBe('Idle');
      expect(ZONE_STATUS.idle.color).toBe('#3B82F6');
      expect(ZONE_STATUS.idle.icon).toBe('🔵');
    });

    it('delayed status should have correct label and color', () => {
      expect(ZONE_STATUS.delayed.label).toBe('Ditunda (Smart Delay)');
      expect(ZONE_STATUS.delayed.color).toBe('#F59E0B');
      expect(ZONE_STATUS.delayed.icon).toBe('🟡');
    });

    it('error status should have correct label and color', () => {
      expect(ZONE_STATUS.error.label).toBe('Error / Offline');
      expect(ZONE_STATUS.error.color).toBe('#EF4444');
      expect(ZONE_STATUS.error.icon).toBe('🔴');
    });

    it('each status should have label, color, bg, and icon properties', () => {
      Object.values(ZONE_STATUS).forEach(status => {
        expect(status).toHaveProperty('label');
        expect(status).toHaveProperty('color');
        expect(status).toHaveProperty('bg');
        expect(status).toHaveProperty('icon');
      });
    });

    it('each color should be a valid hex color', () => {
      Object.values(ZONE_STATUS).forEach(status => {
        expect(status.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });

  describe('Negative Cases', () => {
    it('should not contain unknown status types', () => {
      const keys = Object.keys(ZONE_STATUS);
      expect(keys).not.toContain('running');
      expect(keys).not.toContain('offline');
      expect(keys).not.toContain('paused');
    });

    it('no status should have empty label', () => {
      Object.values(ZONE_STATUS).forEach(status => {
        expect(status.label).not.toBe('');
      });
    });

    it('no status should have empty icon', () => {
      Object.values(ZONE_STATUS).forEach(status => {
        expect(status.icon).not.toBe('');
      });
    });
  });
});

// ════════════════════════════════════════════
// SENSOR_THRESHOLDS Constants
// ════════════════════════════════════════════
describe('SENSOR_THRESHOLDS Constants', () => {
  describe('Positive Cases', () => {
    it('should contain all 4 sensor types', () => {
      const keys = Object.keys(SENSOR_THRESHOLDS);
      expect(keys).toHaveLength(4);
      expect(keys).toContain('soilMoisture');
      expect(keys).toContain('temperature');
      expect(keys).toContain('humidity');
      expect(keys).toContain('ph');
    });

    it('soilMoisture should have correct thresholds', () => {
      expect(SENSOR_THRESHOLDS.soilMoisture.low).toBe(30);
      expect(SENSOR_THRESHOLDS.soilMoisture.high).toBe(75);
      expect(SENSOR_THRESHOLDS.soilMoisture.unit).toBe('%');
      expect(SENSOR_THRESHOLDS.soilMoisture.label).toBe('Kelembaban Tanah');
    });

    it('temperature should have correct thresholds', () => {
      expect(SENSOR_THRESHOLDS.temperature.low).toBe(20);
      expect(SENSOR_THRESHOLDS.temperature.high).toBe(35);
      expect(SENSOR_THRESHOLDS.temperature.unit).toBe('°C');
    });

    it('humidity should have correct thresholds', () => {
      expect(SENSOR_THRESHOLDS.humidity.low).toBe(40);
      expect(SENSOR_THRESHOLDS.humidity.high).toBe(80);
      expect(SENSOR_THRESHOLDS.humidity.unit).toBe('%');
    });

    it('ph should have correct thresholds', () => {
      expect(SENSOR_THRESHOLDS.ph.low).toBe(5.5);
      expect(SENSOR_THRESHOLDS.ph.high).toBe(7.5);
    });

    it('each threshold should have low < high', () => {
      Object.values(SENSOR_THRESHOLDS).forEach(threshold => {
        expect(threshold.low).toBeLessThan(threshold.high);
      });
    });
  });

  describe('Negative Cases', () => {
    it('should not have negative low thresholds', () => {
      Object.values(SENSOR_THRESHOLDS).forEach(threshold => {
        expect(threshold.low).toBeGreaterThanOrEqual(0);
      });
    });

    it('should not contain unknown sensor types', () => {
      const keys = Object.keys(SENSOR_THRESHOLDS);
      expect(keys).not.toContain('pressure');
      expect(keys).not.toContain('light');
    });
  });
});

// ════════════════════════════════════════════
// NAV_ITEMS Constants
// ════════════════════════════════════════════
describe('NAV_ITEMS Constants', () => {
  describe('Positive Cases', () => {
    it('should contain 9 navigation items', () => {
      expect(NAV_ITEMS).toHaveLength(9);
    });

    it('each nav item should have id, label, icon, and href', () => {
      NAV_ITEMS.forEach(item => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('label');
        expect(item).toHaveProperty('icon');
        expect(item).toHaveProperty('href');
      });
    });

    it('each href should start with /', () => {
      NAV_ITEMS.forEach(item => {
        expect(item.href).toMatch(/^\//);
      });
    });

    it('each id should be unique', () => {
      const ids = NAV_ITEMS.map(item => item.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('each href should be unique', () => {
      const hrefs = NAV_ITEMS.map(item => item.href);
      const uniqueHrefs = new Set(hrefs);
      expect(uniqueHrefs.size).toBe(hrefs.length);
    });

    it('overview should be the first item', () => {
      expect(NAV_ITEMS[0].id).toBe('overview');
      expect(NAV_ITEMS[0].href).toBe('/overview');
    });

    it('settings should be the last item', () => {
      const last = NAV_ITEMS[NAV_ITEMS.length - 1];
      expect(last.id).toBe('settings');
      expect(last.href).toBe('/settings');
    });
  });

  describe('Negative Cases', () => {
    it('should not have empty labels', () => {
      NAV_ITEMS.forEach(item => {
        expect(item.label).not.toBe('');
      });
    });

    it('should not have empty ids', () => {
      NAV_ITEMS.forEach(item => {
        expect(item.id).not.toBe('');
      });
    });

    it('should not have hrefs without leading slash', () => {
      NAV_ITEMS.forEach(item => {
        expect(item.href.charAt(0)).toBe('/');
      });
    });
  });
});
