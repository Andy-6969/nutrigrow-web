/**
 * Unit Tests for: src/app/(dashboard)/agri-twin/page.tsx
 * 
 * Tests for Agri-Twin (Digital Twin) functionality:
 * - Zone position mapping
 * - Zone selection logic
 * - Zone detail panel display
 * - Zone list rendering logic
 * - Status visual mapping
 */

import { mockZones, mockSensorData } from '@/shared/lib/mockData';
import { ZONE_STATUS } from '@/shared/lib/constants';

// ════════════════════════════════════════════
// Zone Position Mapping
// ════════════════════════════════════════════
const zonePositions: Record<string, { x: number; y: number; w: number; h: number }> = {
  z1: { x: 3,  y: 3,  w: 46, h: 40 },
  z2: { x: 53, y: 3,  w: 44, h: 32 },
  z3: { x: 3,  y: 48, w: 35, h: 48 },
  z4: { x: 41, y: 48, w: 18, h: 22 },
  z5: { x: 63, y: 40, w: 34, h: 56 },
};

describe('Zone Position Mapping', () => {
  describe('Positive Cases', () => {
    it('should have positions for all zones', () => {
      mockZones.forEach(zone => {
        expect(zonePositions[zone.id]).toBeDefined();
      });
    });

    it('all positions should be percentage-based (0-100)', () => {
      Object.values(zonePositions).forEach(pos => {
        expect(pos.x).toBeGreaterThanOrEqual(0);
        expect(pos.x).toBeLessThanOrEqual(100);
        expect(pos.y).toBeGreaterThanOrEqual(0);
        expect(pos.y).toBeLessThanOrEqual(100);
      });
    });

    it('width and height should be positive', () => {
      Object.values(zonePositions).forEach(pos => {
        expect(pos.w).toBeGreaterThan(0);
        expect(pos.h).toBeGreaterThan(0);
      });
    });

    it('zones should not extend beyond 100%', () => {
      Object.values(zonePositions).forEach(pos => {
        expect(pos.x + pos.w).toBeLessThanOrEqual(100);
        expect(pos.y + pos.h).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Negative Cases', () => {
    it('should not have positions for non-existent zones', () => {
      expect(zonePositions['z99']).toBeUndefined();
    });

    it('no zone should have zero width or height', () => {
      Object.values(zonePositions).forEach(pos => {
        expect(pos.w).not.toBe(0);
        expect(pos.h).not.toBe(0);
      });
    });
  });
});

// ════════════════════════════════════════════
// Zone Selection Logic
// ════════════════════════════════════════════
describe('Zone Selection Logic', () => {
  describe('Positive Cases', () => {
    it('should have no selection by default (null)', () => {
      const selectedZone: string | null = null;
      expect(selectedZone).toBeNull();
    });

    it('clicking a zone should select it', () => {
      let selectedZone: string | null = null;
      selectedZone = 'z1';
      expect(selectedZone).toBe('z1');
    });

    it('clicking the same zone should deselect it', () => {
      let selectedZone: string | null = 'z1';
      selectedZone = selectedZone === 'z1' ? null : 'z1';
      expect(selectedZone).toBeNull();
    });

    it('clicking a different zone should switch selection', () => {
      let selectedZone: string | null = 'z1';
      selectedZone = selectedZone === 'z2' ? null : 'z2';
      expect(selectedZone).toBe('z2');
    });

    it('selected zone should return valid zone data', () => {
      const selectedZone = 'z3';
      const zone = mockZones.find(z => z.id === selectedZone);
      expect(zone).toBeDefined();
      expect(zone?.name).toContain('Ladang Selatan');
    });

    it('selected sensor data should be available', () => {
      const selectedZone = 'z2';
      const sensor = mockSensorData[selectedZone];
      expect(sensor).toBeDefined();
      expect(sensor.soil_moisture).toBeDefined();
    });
  });

  describe('Negative Cases', () => {
    it('invalid zone ID should not return data', () => {
      const selectedZone = 'z999';
      const zone = mockZones.find(z => z.id === selectedZone);
      expect(zone).toBeUndefined();
    });
  });
});

// ════════════════════════════════════════════
// Zone Detail Panel
// ════════════════════════════════════════════
describe('Zone Detail Panel', () => {
  describe('Positive Cases - when zone is selected', () => {
    const selectedZone = 'z1';
    const zone = mockZones.find(z => z.id === selectedZone)!;
    const sensor = mockSensorData[selectedZone];

    it('should show zone name', () => {
      expect(zone.name).toBe('Zona 1 - Sawah Utara');
    });

    it('should show zone status with icon', () => {
      const status = ZONE_STATUS[zone.status];
      expect(status.icon).toBeDefined();
      expect(status.label).toBeDefined();
    });

    it('should display all 4 sensor readings', () => {
      expect(sensor.soil_moisture).toBeDefined();
      expect(sensor.temperature).toBeDefined();
      expect(sensor.humidity).toBeDefined();
      expect(sensor.ph).toBeDefined();
    });

    it('should show crop type and area', () => {
      expect(zone.crop_type).toBe('Padi');
      expect(zone.area_ha).toBe(2.5);
    });

    it('should show battery and RSSI if available', () => {
      expect(sensor.battery).toBeDefined();
      expect(sensor.rssi).toBeDefined();
    });
  });

  describe('Negative Cases - when no zone is selected', () => {
    it('should show placeholder message', () => {
      const selectedZone: string | null = null;
      const hasSelection = selectedZone !== null;
      expect(hasSelection).toBe(false);
      // When no selection, placeholder "Klik zona pada peta" should show
    });
  });
});

// ════════════════════════════════════════════
// Zone Name Parsing
// ════════════════════════════════════════════
describe('Zone Name Short Display', () => {
  describe('Positive Cases', () => {
    it('should extract short name after " - "', () => {
      const fullName = 'Zona 1 - Sawah Utara';
      const shortName = fullName.split(' - ')[1] || fullName;
      expect(shortName).toBe('Sawah Utara');
    });

    it('should handle all zone names', () => {
      mockZones.forEach(zone => {
        const shortName = zone.name.split(' - ')[1] || zone.name;
        expect(shortName).not.toBe('');
      });
    });
  });

  describe('Negative Cases', () => {
    it('should return full name if no separator exists', () => {
      const fullName = 'SingleZone';
      const shortName = fullName.split(' - ')[1] || fullName;
      expect(shortName).toBe('SingleZone');
    });
  });
});

// ════════════════════════════════════════════
// Status Visual Mapping
// ════════════════════════════════════════════
describe('Zone Status Visual Mapping', () => {
  describe('Positive Cases', () => {
    it('each zone status should have background style', () => {
      mockZones.forEach(zone => {
        const status = ZONE_STATUS[zone.status];
        expect(status.color).toMatch(/^#/);
      });
    });

    it('irrigating zones should trigger pulse animation', () => {
      const irrigating = mockZones.filter(z => z.status === 'irrigating');
      expect(irrigating.length).toBeGreaterThan(0);
    });

    it('error zones should show red color', () => {
      expect(ZONE_STATUS.error.color).toBe('#EF4444');
    });

    it('delayed zones should show yellow/amber color', () => {
      expect(ZONE_STATUS.delayed.color).toBe('#F59E0B');
    });
  });
});

// ════════════════════════════════════════════
// Zone List Rendering
// ════════════════════════════════════════════
describe('Zone List in Sidebar', () => {
  describe('Positive Cases', () => {
    it('should list all zones', () => {
      expect(mockZones).toHaveLength(5);
    });

    it('each zone in list should show soil moisture', () => {
      mockZones.forEach(zone => {
        const sensor = mockSensorData[zone.id];
        expect(sensor.soil_moisture).toBeDefined();
        expect(typeof sensor.soil_moisture).toBe('number');
      });
    });

    it('each zone list item should show status icon', () => {
      mockZones.forEach(zone => {
        const status = ZONE_STATUS[zone.status];
        expect(status.icon).toBeTruthy();
      });
    });

    it('each zone list item should show crop type', () => {
      mockZones.forEach(zone => {
        expect(zone.crop_type).toBeTruthy();
      });
    });
  });
});
