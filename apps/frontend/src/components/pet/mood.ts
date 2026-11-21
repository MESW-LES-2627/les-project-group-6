import type { PetAnimal, PetMood } from './sprites';

/** What the pet does between moods; `idle` is standing still. */
export type PetAction = 'idle' | 'walk' | 'look' | 'hop' | 'wiggle' | 'sleep';

/** Default name of each pet. */
export const PET_NAMES: Record<PetAnimal, string> = {
  cat: 'Miso',
  dog: 'Biscuit',
  fox: 'Maple',
  rabbit: 'Clover',
};

/** Days without reading before each mood starts (read today = happy). */
export const MOOD_AFTER_DAYS = { neutral: 1, sad: 2, starving: 7 } as const;

/** `YYYY-MM-DD` of `date` in the reader's timezone, the format the streak API uses. */
export function localIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Whole calendar days from `from` to `to` (both `YYYY-MM-DD`). */
export function daysBetween(from: string, to: string): number {
  const day = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
  return Math.round((day(to) - day(from)) / 86_400_000);
}

/**
 * Mood from the last day that counted for the streak.
 * Never read yet is `neutral`, so a new reader is not greeted by a starving pet.
 */
export function getPetMood(lastReadDate: string | null, today: string): PetMood {
  if (!lastReadDate) return 'neutral';
  const away = daysBetween(lastReadDate, today);
  if (away >= MOOD_AFTER_DAYS.starving) return 'starving';
  if (away >= MOOD_AFTER_DAYS.sad) return 'sad';
  if (away >= MOOD_AFTER_DAYS.neutral) return 'neutral';
  return 'happy';
}

/** The idle actions a pet in `mood` may pick. Sad pets do less; starving pets don't walk. */
export const ACTIONS_BY_MOOD: Record<PetMood, PetAction[]> = {
  happy: ['walk', 'walk', 'look', 'hop', 'wiggle', 'sleep'],
  neutral: ['walk', 'walk', 'look', 'wiggle', 'sleep'],
  sad: ['walk', 'look', 'sleep', 'idle'],
  starving: ['sleep', 'idle', 'look'],
};

/** Picks the next idle action; `random` returns a number in [0, 1). */
export function pickAction(mood: PetMood, random: () => number = Math.random): PetAction {
  const options = ACTIONS_BY_MOOD[mood];
  return options[Math.floor(random() * options.length)] ?? 'idle';
}

/** Milliseconds it takes to cross 1% of the pet's track; sad pets walk slower. */
export function walkSpeed(mood: PetMood): number {
  return mood === 'sad' ? 90 : 45;
}

/** One line under the pet that explains its mood. */
export function moodCaption(name: string, mood: PetMood, neverRead = false): string {
  if (neverRead) return `Say hi to ${name}! Read today to make them happy.`;
  switch (mood) {
    case 'happy':
      return `${name} is happy. You read today!`;
    case 'neutral':
      return `${name} misses you. Read today to make them happy.`;
    case 'sad':
      return `${name} is sad. A short reading session will cheer them up.`;
    case 'starving':
      return `${name} is starving! Read to feed them.`;
  }
}
