import { describe, expect, it } from 'vitest';

import {
  ACTIONS_BY_MOOD,
  daysBetween,
  getPetMood,
  localIsoDate,
  moodCaption,
  pickAction,
  walkSpeed,
} from '../mood';

describe('getPetMood', () => {
  const today = '2026-11-21';

  it.each([
    ['2026-11-21', 'happy'],
    ['2026-11-20', 'neutral'],
    ['2026-11-19', 'sad'],
    ['2026-11-15', 'sad'],
    ['2026-11-14', 'starving'],
    ['2026-10-01', 'starving'],
  ])('last read %s is %s', (lastRead, mood) => {
    expect(getPetMood(lastRead, today)).toBe(mood);
  });

  it('is neutral before the first reading', () => {
    expect(getPetMood(null, today)).toBe('neutral');
  });
});

describe('dates', () => {
  it('counts calendar days across months and DST', () => {
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2);
    expect(daysBetween('2026-11-30', '2026-12-01')).toBe(1);
    expect(daysBetween('2026-11-21', '2026-11-21')).toBe(0);
  });

  it('formats the local date like the streak API', () => {
    expect(localIsoDate(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});

describe('idle actions', () => {
  it('never lets a starving pet walk', () => {
    expect(ACTIONS_BY_MOOD.starving).not.toContain('walk');
  });

  it('picks from the actions of the mood', () => {
    expect(pickAction('happy', () => 0)).toBe(ACTIONS_BY_MOOD.happy[0]);
    expect(pickAction('starving', () => 0.999)).toBe(
      ACTIONS_BY_MOOD.starving[ACTIONS_BY_MOOD.starving.length - 1],
    );
  });

  it('makes sad pets walk slower', () => {
    expect(walkSpeed('sad')).toBeGreaterThan(walkSpeed('happy'));
  });
});

describe('moodCaption', () => {
  it('explains each mood with the pet name', () => {
    expect(moodCaption('Miso', 'happy')).toBe('Miso is happy. You read today!');
    expect(moodCaption('Miso', 'neutral')).toContain('misses you');
    expect(moodCaption('Miso', 'sad')).toContain('sad');
    expect(moodCaption('Miso', 'starving')).toBe('Miso is starving! Read to feed them.');
  });

  it('greets a reader who never read', () => {
    expect(moodCaption('Miso', 'neutral', true)).toContain('Say hi to Miso');
  });
});
