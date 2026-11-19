// @req F-READ-01
import { describe, expect, it } from 'vitest';

import { formatDuration } from '../session';

describe('formatDuration', () => {
  it('formats minutes and hours like the summary shows them', () => {
    expect(formatDuration(0)).toBe('Under a minute');
    expect(formatDuration(59)).toBe('Under a minute');
    expect(formatDuration(45 * 60 + 30)).toBe('45 min');
    expect(formatDuration(65 * 60)).toBe('1 h 05 min');
    expect(formatDuration(2 * 3600 + 30 * 60)).toBe('2 h 30 min');
  });
});
