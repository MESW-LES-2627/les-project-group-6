import type { LibraryBook } from '@/types/library';
import type { ActiveSession } from '@/types/session';

const emmaSession: ActiveSession = {
  bookId: 'emma',
  startedAtLabel: 'Started today at 10:00',
  startTimeLabel: '10:00',
  startPage: 294,
  currentPage: 318,
  elapsedSeconds: 28 * 60 + 14,
  groups: [
    {
      id: 'october-sprint',
      name: 'October Sprint',
      description: 'Any book during 1-31 October • Minutes metric',
      note: 'Counts timer minutes within the daily cap.',
    },
    {
      id: 'classics-emma',
      name: 'Classics • Emma',
      description: 'Only Emma counts for this club round.',
      note: 'Only time on the selected book contributes to its leaderboard.',
    },
  ],
  profileTitle: 'One profile total',
  profileCopy:
    'Your profile gets the lowest counted value across eligible groups—not the sum. Without a group, full session time counts.',
  rules: [
    'Simple timer; no manual competitive minutes',
    'End page required for October Sprint',
    '60 counted min/day cap in the Sprint',
    'Club: 120 counted min/day cap',
  ],
  rulesNote:
    'Still-reading checks and inactivity pause are off for these groups. Rules locked when each round started.',
};

/** Active-session mock. Other books get a quiet session with no eligible groups. */
export function getActiveSession(book: LibraryBook): ActiveSession {
  if (book.id === emmaSession.bookId) return emmaSession;

  return {
    bookId: book.id,
    startedAtLabel: 'Started today at 10:00',
    startTimeLabel: '10:00',
    startPage: book.currentPage,
    currentPage: book.currentPage,
    elapsedSeconds: 0,
    groups: [],
    profileTitle: 'One profile total',
    profileCopy:
      'Your profile gets the lowest counted value across eligible groups—not the sum. Without a group, full session time counts.',
    rules: [
      'Simple timer; no manual competitive minutes',
      'End page required for challenge groups',
      'Daily group caps apply to counted minutes',
      'Still-reading checks are set by each group',
    ],
    rulesNote:
      'Still-reading checks and inactivity pause depend on the group rules. Rules locked when each round started.',
  };
}
