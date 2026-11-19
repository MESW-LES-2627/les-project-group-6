import type { ReadingStatusType } from '../reading-status/reading-state.js';

/** A timed session counts for the streak once it reaches this many counted minutes. */
export const MIN_STREAK_SESSION_MINUTES = 5;

/** Logging progress counts for the streak once the page moves forward by this many pages. */
export const MIN_STREAK_PAGES = 5;

/** A reader's entry for one book, before or after a change. */
export interface ReadingSnapshot {
  status: ReadingStatusType;
  page: number;
}

/** A finished timed session counts as reading when it lasted at least 5 minutes. */
export function sessionCountsForStreak(countedMinutes: number): boolean {
  return countedMinutes >= MIN_STREAK_SESSION_MINUTES;
}

/**
 * A change to a book that was being read counts as reading, so readers who read away from
 * the app still keep their streak (F-READ-04):
 * 1. the book stays in progress and the page moves forward by 5 or more;
 * 2. the book goes from in progress to finished.
 */
export function progressCountsForStreak(before: ReadingSnapshot, after: ReadingSnapshot): boolean {
  if (before.status !== 'in-progress') return false;
  if (after.status === 'finished') return true;
  return after.status === 'in-progress' && after.page - before.page >= MIN_STREAK_PAGES;
}
