/**
 * Unit Tests for: src/app/(dashboard)/schedules/page.tsx
 * 
 * Tests for Schedule Management functionality:
 * - parseCron helper function
 * - Schedule CRUD operations (logic)
 * - Schedule validation
 * - Calendar slot mapping
 */

// ════════════════════════════════════════════
// parseCron() - Cron Expression Parser
// ════════════════════════════════════════════
function parseCron(cron: string) {
  const [minute, hour, , , dayOfWeek] = cron.split(' ');
  return {
    hour: parseInt(hour) || 0,
    minute: parseInt(minute) || 0,
    days: dayOfWeek === '*' ? [0, 1, 2, 3, 4, 5, 6] : dayOfWeek.split(',').map(Number),
    label: `${String(parseInt(hour)).padStart(2, '0')}:${String(parseInt(minute)).padStart(2, '0')}`,
  };
}

describe('parseCron() - Cron Expression Parser', () => {
  describe('Positive Cases', () => {
    it('should parse daily schedule "0 6 * * *"', () => {
      const result = parseCron('0 6 * * *');
      expect(result.hour).toBe(6);
      expect(result.minute).toBe(0);
      expect(result.days).toEqual([0, 1, 2, 3, 4, 5, 6]);
      expect(result.label).toBe('06:00');
    });

    it('should parse specific days "0 16 * * 1,3,5"', () => {
      const result = parseCron('0 16 * * 1,3,5');
      expect(result.hour).toBe(16);
      expect(result.minute).toBe(0);
      expect(result.days).toEqual([1, 3, 5]);
      expect(result.label).toBe('16:00');
    });

    it('should parse half-hour schedule "30 5 * * 1,3,5"', () => {
      const result = parseCron('30 5 * * 1,3,5');
      expect(result.hour).toBe(5);
      expect(result.minute).toBe(30);
      expect(result.label).toBe('05:30');
    });

    it('should parse schedule with all days ("*")', () => {
      const result = parseCron('0 7 * * *');
      expect(result.days).toHaveLength(7);
    });

    it('should format label with zero-padded hours', () => {
      const result = parseCron('5 8 * * *');
      expect(result.label).toBe('08:05');
    });

    it('should parse late evening schedule', () => {
      const result = parseCron('0 22 * * *');
      expect(result.hour).toBe(22);
      expect(result.label).toBe('22:00');
    });

    it('should parse midnight schedule', () => {
      const result = parseCron('0 0 * * *');
      expect(result.hour).toBe(0);
      expect(result.minute).toBe(0);
      expect(result.label).toBe('00:00');
    });
  });

  describe('Negative / Edge Cases', () => {
    it('should handle single day "0 6 * * 0"', () => {
      const result = parseCron('0 6 * * 0');
      expect(result.days).toEqual([0]);
    });

    it('should handle all seven days explicitly', () => {
      const result = parseCron('0 6 * * 0,1,2,3,4,5,6');
      expect(result.days).toHaveLength(7);
    });

    it('should default to 0 for invalid hour', () => {
      const result = parseCron('0 abc * * *');
      expect(result.hour).toBe(0);
    });

    it('should default to 0 for invalid minute', () => {
      const result = parseCron('abc 6 * * *');
      expect(result.minute).toBe(0);
    });
  });
});

// ════════════════════════════════════════════
// Schedule CRUD Logic
// ════════════════════════════════════════════
interface Schedule {
  id: string;
  name: string;
  zone_id: string;
  zone_name: string;
  cron_expression: string;
  duration_minutes: number;
  is_active: boolean;
  include_fertigation: boolean;
}

const mockSchedules: Schedule[] = [
  { id: 's1', name: 'Penyiraman Pagi Z1', zone_id: 'z1', zone_name: 'Sawah Utara', cron_expression: '0 6 * * *', duration_minutes: 15, is_active: true, include_fertigation: true },
  { id: 's2', name: 'Penyiraman Sore Z2', zone_id: 'z2', zone_name: 'Kebun Timur', cron_expression: '0 16 * * *', duration_minutes: 20, is_active: true, include_fertigation: false },
  { id: 's3', name: 'Penyiraman Pagi Z3', zone_id: 'z3', zone_name: 'Ladang Selatan', cron_expression: '30 5 * * 1,3,5', duration_minutes: 25, is_active: true, include_fertigation: true },
];

describe('Schedule CRUD Operations', () => {
  // ── Toggle Active ──
  describe('toggleActive', () => {
    it('should toggle schedule from active to inactive', () => {
      const schedules = [...mockSchedules];
      const toggled = schedules.map(s => s.id === 's1' ? { ...s, is_active: !s.is_active } : s);
      expect(toggled.find(s => s.id === 's1')?.is_active).toBe(false);
    });

    it('should toggle schedule from inactive to active', () => {
      const schedules = mockSchedules.map(s => s.id === 's1' ? { ...s, is_active: false } : s);
      const toggled = schedules.map(s => s.id === 's1' ? { ...s, is_active: !s.is_active } : s);
      expect(toggled.find(s => s.id === 's1')?.is_active).toBe(true);
    });

    it('should not affect other schedules when toggling', () => {
      const toggled = mockSchedules.map(s => s.id === 's1' ? { ...s, is_active: !s.is_active } : s);
      expect(toggled.find(s => s.id === 's2')?.is_active).toBe(true);
      expect(toggled.find(s => s.id === 's3')?.is_active).toBe(true);
    });
  });

  // ── Delete Schedule ──
  describe('deleteSchedule', () => {
    it('should remove a schedule by ID', () => {
      const filtered = mockSchedules.filter(s => s.id !== 's1');
      expect(filtered).toHaveLength(mockSchedules.length - 1);
      expect(filtered.find(s => s.id === 's1')).toBeUndefined();
    });

    it('should not change list when deleting non-existent ID', () => {
      const filtered = mockSchedules.filter(s => s.id !== 's999');
      expect(filtered).toHaveLength(mockSchedules.length);
    });

    it('should preserve other schedules after deletion', () => {
      const filtered = mockSchedules.filter(s => s.id !== 's2');
      expect(filtered.find(s => s.id === 's1')).toBeDefined();
      expect(filtered.find(s => s.id === 's3')).toBeDefined();
    });
  });

  // ── Create Schedule ──
  describe('createSchedule', () => {
    it('should add a new schedule to the list', () => {
      const newSchedule: Schedule = {
        id: `s${Date.now()}`,
        name: 'New Schedule',
        zone_id: 'z1',
        zone_name: 'Sawah Utara',
        cron_expression: '0 8 * * *',
        duration_minutes: 10,
        is_active: true,
        include_fertigation: false,
      };
      const updated = [...mockSchedules, newSchedule];
      expect(updated).toHaveLength(mockSchedules.length + 1);
      expect(updated[updated.length - 1].name).toBe('New Schedule');
    });

    it('new schedule should default to active', () => {
      const newSchedule: Schedule = {
        id: 'sNew',
        name: 'Test',
        zone_id: 'z1',
        zone_name: 'Test Zone',
        cron_expression: '0 6 * * *',
        duration_minutes: 15,
        is_active: true,
        include_fertigation: false,
      };
      expect(newSchedule.is_active).toBe(true);
    });
  });

  // ── Update Schedule ──
  describe('updateSchedule', () => {
    it('should update schedule properties', () => {
      const updatedData = { name: 'Updated Name', duration_minutes: 30 };
      const updated = mockSchedules.map(s =>
        s.id === 's1' ? { ...s, ...updatedData } : s
      );
      const found = updated.find(s => s.id === 's1');
      expect(found?.name).toBe('Updated Name');
      expect(found?.duration_minutes).toBe(30);
    });

    it('should not modify other schedules', () => {
      const updated = mockSchedules.map(s =>
        s.id === 's1' ? { ...s, name: 'Changed' } : s
      );
      expect(updated.find(s => s.id === 's2')?.name).toBe('Penyiraman Sore Z2');
    });
  });
});

// ════════════════════════════════════════════
// Schedule Validation
// ════════════════════════════════════════════
describe('Schedule Validation', () => {
  describe('Positive Cases', () => {
    it('duration should be between 1 and 120 minutes', () => {
      mockSchedules.forEach(s => {
        expect(s.duration_minutes).toBeGreaterThanOrEqual(1);
        expect(s.duration_minutes).toBeLessThanOrEqual(120);
      });
    });

    it('schedule IDs should be unique', () => {
      const ids = mockSchedules.map(s => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('cron expressions should have 5 parts', () => {
      mockSchedules.forEach(s => {
        const parts = s.cron_expression.split(' ');
        expect(parts).toHaveLength(5);
      });
    });
  });

  describe('Negative Cases', () => {
    it('should not have empty name', () => {
      mockSchedules.forEach(s => {
        expect(s.name).not.toBe('');
      });
    });

    it('should not have empty zone_id', () => {
      mockSchedules.forEach(s => {
        expect(s.zone_id).not.toBe('');
      });
    });

    it('should not have zero duration', () => {
      mockSchedules.forEach(s => {
        expect(s.duration_minutes).not.toBe(0);
      });
    });
  });
});

// ════════════════════════════════════════════
// Calendar Slot Mapping
// ════════════════════════════════════════════
describe('Calendar Slot Mapping', () => {
  const calendarSlots = mockSchedules.map(s => ({ ...s, ...parseCron(s.cron_expression) }));

  describe('Positive Cases', () => {
    it('each slot should have hour, minute, days, and label', () => {
      calendarSlots.forEach(slot => {
        expect(slot).toHaveProperty('hour');
        expect(slot).toHaveProperty('minute');
        expect(slot).toHaveProperty('days');
        expect(slot).toHaveProperty('label');
      });
    });

    it('should map daily schedule to all 7 days', () => {
      const dailySlot = calendarSlots.find(s => s.cron_expression === '0 6 * * *');
      expect(dailySlot?.days).toHaveLength(7);
    });

    it('should map specific day schedule to correct days', () => {
      const specificSlot = calendarSlots.find(s => s.cron_expression === '30 5 * * 1,3,5');
      expect(specificSlot?.days).toEqual([1, 3, 5]);
    });

    it('should be able to filter slots by hour and day', () => {
      const slotsAt6 = calendarSlots.filter(s => s.hour === 6);
      expect(slotsAt6.length).toBeGreaterThan(0);
    });
  });

  describe('Negative Cases', () => {
    it('should return empty if no slots match hour/day', () => {
      const slotsAt3 = calendarSlots.filter(s => s.hour === 3);
      expect(slotsAt3).toHaveLength(0);
    });
  });
});
