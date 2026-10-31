import { describe, expect, it } from 'vitest';

import { endDate, formatLongDate, formatPeriod, initialsOf } from '../groups';

describe('group date helpers', () => {
  it('finds the last day of a period', () => {
    expect(endDate('2026-11-01', 30)).toBe('2026-11-30');
    expect(endDate('2026-12-20', 14)).toBe('2027-01-02');
  });

  it('formats dates and periods', () => {
    expect(formatLongDate('2026-11-01')).toBe('1 November 2026');
    expect(formatPeriod('2026-11-01', 30)).toBe('1–30 November 2026');
    expect(formatPeriod('2026-12-20', 14)).toBe('20 December – 2 January 2027');
  });

  it('builds initials from a name', () => {
    expect(initialsOf('Maya Laurent')).toBe('ML');
    expect(initialsOf('  eleanor ')).toBe('E');
  });
});
