/**
 * Unit Tests for: src/shared/lib/utils.ts
 * 
 * Tests for utility functions:
 * - cn (classname merger)
 * - formatNumber
 * - formatCurrency
 * - formatRelativeTime
 * - getThresholdColor
 * - getSensorStatusColor
 */

import { cn, formatNumber, formatCurrency, formatRelativeTime, getThresholdColor, getSensorStatusColor } from '@/shared/lib/utils';

// ════════════════════════════════════════════
// cn() - Class Name Merger
// ════════════════════════════════════════════
describe('cn() - Class Name Merger', () => {
  // ── Positive Cases ──
  describe('Positive Cases', () => {
    it('should merge multiple string classnames', () => {
      expect(cn('foo', 'bar')).toBe('foo bar');
    });

    it('should handle single classname', () => {
      expect(cn('foo')).toBe('foo');
    });

    it('should handle conditional classnames with truthy values', () => {
      expect(cn('base', true && 'active')).toBe('base active');
    });

    it('should handle array of classnames', () => {
      expect(cn(['foo', 'bar'])).toBe('foo bar');
    });

    it('should handle object-style classnames', () => {
      expect(cn({ active: true, disabled: false })).toBe('active');
    });

    it('should handle mixed types', () => {
      expect(cn('foo', { bar: true }, ['baz'])).toBe('foo bar baz');
    });
  });

  // ── Negative Cases ──
  describe('Negative Cases', () => {
    it('should handle empty arguments', () => {
      expect(cn()).toBe('');
    });

    it('should filter out falsy values (false)', () => {
      expect(cn('foo', false && 'bar')).toBe('foo');
    });

    it('should filter out null and undefined', () => {
      expect(cn('foo', null, undefined, 'bar')).toBe('foo bar');
    });

    it('should filter out empty strings', () => {
      expect(cn('foo', '', 'bar')).toBe('foo bar');
    });

    it('should handle object with all false values', () => {
      expect(cn({ a: false, b: false })).toBe('');
    });
  });
});

// ════════════════════════════════════════════
// formatNumber() - Number Formatter (id-ID locale)
// ════════════════════════════════════════════
describe('formatNumber() - Number Formatter', () => {
  // ── Positive Cases ──
  describe('Positive Cases', () => {
    it('should format integer without decimals by default', () => {
      const result = formatNumber(12450);
      // id-ID locale uses dot as thousands separator
      expect(result).toBe('12.450');
    });

    it('should format number with specified decimals', () => {
      const result = formatNumber(34.5, 1);
      expect(result).toBe('34,5');
    });

    it('should format large numbers with thousands separator', () => {
      const result = formatNumber(2100000);
      expect(result).toBe('2.100.000');
    });

    it('should format zero correctly', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should format number with 2 decimal places', () => {
      const result = formatNumber(99.123, 2);
      expect(result).toBe('99,12');
    });

    it('should handle small numbers', () => {
      expect(formatNumber(5)).toBe('5');
    });
  });

  // ── Negative Cases ──
  describe('Negative Cases', () => {
    it('should handle negative numbers', () => {
      const result = formatNumber(-500);
      expect(result).toContain('500');
    });

    it('should handle very large numbers', () => {
      const result = formatNumber(999999999);
      expect(result).toBe('999.999.999');
    });

    it('should handle decimal number with 0 decimal parameter', () => {
      const result = formatNumber(99.9, 0);
      expect(result).toBe('100');
    });
  });
});

// ════════════════════════════════════════════
// formatCurrency() - Currency Formatter (Indonesian Rupiah)
// ════════════════════════════════════════════
describe('formatCurrency() - Currency Formatter', () => {
  // ── Positive Cases ──
  describe('Positive Cases', () => {
    it('should format billions with M suffix', () => {
      expect(formatCurrency(1000000000)).toBe('Rp 1.0 M');
    });

    it('should format millions with Jt suffix', () => {
      expect(formatCurrency(2100000)).toBe('Rp 2.1 Jt');
    });

    it('should format thousands with Rb suffix', () => {
      expect(formatCurrency(5500)).toBe('Rp 5.5 Rb');
    });

    it('should format small amounts without suffix', () => {
      expect(formatCurrency(500)).toBe('Rp 500');
    });

    it('should format exact million', () => {
      expect(formatCurrency(1000000)).toBe('Rp 1.0 Jt');
    });

    it('should format 1.5 billion correctly', () => {
      expect(formatCurrency(1500000000)).toBe('Rp 1.5 M');
    });
  });

  // ── Negative Cases ──
  describe('Negative Cases', () => {
    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('Rp 0');
    });

    it('should handle value just below 1000', () => {
      expect(formatCurrency(999)).toBe('Rp 999');
    });

    it('should handle exactly 1000', () => {
      expect(formatCurrency(1000)).toBe('Rp 1.0 Rb');
    });

    it('should handle value just below 1 million', () => {
      expect(formatCurrency(999999)).toBe('Rp 1000.0 Rb');
    });
  });
});

// ════════════════════════════════════════════
// formatRelativeTime() - Relative Time Formatter
// ════════════════════════════════════════════
describe('formatRelativeTime() - Relative Time Formatter', () => {
  // ── Positive Cases ──
  describe('Positive Cases', () => {
    it('should return "Baru saja" for time less than 1 minute ago', () => {
      const now = new Date();
      const result = formatRelativeTime(now.toISOString());
      expect(result).toBe('Baru saja');
    });

    it('should return minutes format for time within the hour', () => {
      const date = new Date(Date.now() - 5 * 60000); // 5 minutes ago
      const result = formatRelativeTime(date.toISOString());
      expect(result).toBe('5 menit lalu');
    });

    it('should return hours format for time within the day', () => {
      const date = new Date(Date.now() - 3 * 3600000); // 3 hours ago
      const result = formatRelativeTime(date.toISOString());
      expect(result).toBe('3 jam lalu');
    });

    it('should return days format for time within the week', () => {
      const date = new Date(Date.now() - 2 * 86400000); // 2 days ago
      const result = formatRelativeTime(date.toISOString());
      expect(result).toBe('2 hari lalu');
    });

    it('should accept Date object as input', () => {
      const date = new Date(Date.now() - 10 * 60000);
      const result = formatRelativeTime(date);
      expect(result).toBe('10 menit lalu');
    });

    it('should return formatted date for time older than 7 days', () => {
      const date = new Date(Date.now() - 10 * 86400000); // 10 days ago
      const result = formatRelativeTime(date.toISOString());
      // Should return locale formatted date, e.g. "8 Apr 2026"
      expect(result).toMatch(/\d{1,2}\s\w+\s\d{4}/);
    });
  });

  // ── Negative Cases ──
  describe('Negative Cases', () => {
    it('should handle exactly 1 minute ago', () => {
      const date = new Date(Date.now() - 60000);
      const result = formatRelativeTime(date.toISOString());
      expect(result).toBe('1 menit lalu');
    });

    it('should handle exactly 1 hour ago', () => {
      const date = new Date(Date.now() - 3600000);
      const result = formatRelativeTime(date.toISOString());
      expect(result).toBe('1 jam lalu');
    });

    it('should handle 59 minutes (still in minutes range)', () => {
      const date = new Date(Date.now() - 59 * 60000);
      const result = formatRelativeTime(date.toISOString());
      expect(result).toBe('59 menit lalu');
    });

    it('should handle exactly 7 days (boundary to formatted date)', () => {
      const date = new Date(Date.now() - 7 * 86400000);
      const result = formatRelativeTime(date.toISOString());
      // Exactly 7 days = should return formatted date
      expect(result).toMatch(/\d{1,2}\s\w+\s\d{4}/);
    });
  });
});

// ════════════════════════════════════════════
// getThresholdColor()
// ════════════════════════════════════════════
describe('getThresholdColor() - Sensor Threshold Color', () => {
  // ── Positive Cases ──
  describe('Positive Cases', () => {
    it('should return "success" when value is within range', () => {
      expect(getThresholdColor(50, 30, 75)).toBe('success');
    });

    it('should return "success" when value equals low threshold', () => {
      expect(getThresholdColor(30, 30, 75)).toBe('success');
    });

    it('should return "success" when value equals high threshold', () => {
      expect(getThresholdColor(75, 30, 75)).toBe('success');
    });

    it('should return "danger" when value is below low threshold', () => {
      expect(getThresholdColor(20, 30, 75)).toBe('danger');
    });

    it('should return "warning" when value is above high threshold', () => {
      expect(getThresholdColor(80, 30, 75)).toBe('warning');
    });
  });

  // ── Negative Cases ──
  describe('Negative / Edge Cases', () => {
    it('should return "danger" for value just below low threshold', () => {
      expect(getThresholdColor(29.9, 30, 75)).toBe('danger');
    });

    it('should return "warning" for value just above high threshold', () => {
      expect(getThresholdColor(75.1, 30, 75)).toBe('warning');
    });

    it('should handle zero value with positive thresholds', () => {
      expect(getThresholdColor(0, 30, 75)).toBe('danger');
    });

    it('should handle negative value', () => {
      expect(getThresholdColor(-5, 0, 100)).toBe('danger');
    });

    it('should handle value way above threshold', () => {
      expect(getThresholdColor(1000, 30, 75)).toBe('warning');
    });

    it('should work with decimal thresholds (pH)', () => {
      expect(getThresholdColor(6.5, 5.5, 7.5)).toBe('success');
      expect(getThresholdColor(4.0, 5.5, 7.5)).toBe('danger');
      expect(getThresholdColor(8.0, 5.5, 7.5)).toBe('warning');
    });
  });
});

// ════════════════════════════════════════════
// getSensorStatusColor()
// ════════════════════════════════════════════
describe('getSensorStatusColor() - Status Color Mapper', () => {
  // ── Positive Cases ──
  describe('Positive Cases', () => {
    it('should return green for "success"', () => {
      expect(getSensorStatusColor('success')).toBe('#10B981');
    });

    it('should return yellow for "warning"', () => {
      expect(getSensorStatusColor('warning')).toBe('#F59E0B');
    });

    it('should return red for "danger"', () => {
      expect(getSensorStatusColor('danger')).toBe('#EF4444');
    });
  });

  // ── Negative Cases ──
  describe('Negative Cases', () => {
    it('should return gray for unknown status', () => {
      expect(getSensorStatusColor('unknown')).toBe('#6B7280');
    });

    it('should return gray for empty string', () => {
      expect(getSensorStatusColor('')).toBe('#6B7280');
    });

    it('should return gray for random string', () => {
      expect(getSensorStatusColor('critical')).toBe('#6B7280');
    });
  });
});
