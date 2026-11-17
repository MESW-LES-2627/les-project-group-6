import type { Book, CoverStyle, StreakDay, UnbuiltProfileSections } from '@/types/profile';

// Mock data only for the profile sections whose features are not built yet: the unread
// notification count (F-NOTIF), the chapter and XP level, the reading streak (#121),
// imported hours (F-PROF-03), challenges won (#61) and the monthly recap. The user,
// books, shelf, folders and reading time come from the API. Remove each part when its
// endpoint exists.

function book(id: string, title: string, author: string, cover: CoverStyle): Book {
  return { id, title, author, cover };
}

function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The 28 days ending on `today`, oldest first. */
function lastFourWeeks(today: Date, missed: string[] = []): StreakDay[] {
  return Array.from({ length: 28 }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 27 + i);
    const iso = toIsoDate(date);
    return { date: iso, read: !missed.includes(iso) };
  });
}

export const MOCK_TODAY = new Date(2026, 9, 22);

export const mockProfile: UnbuiltProfileSections = {
  unreadNotifications: 3,
  chapter: {
    number: 'VII',
    title: 'The Quiet Explorer',
    nextNumber: 'VIII',
    xp: 640,
    xpToNext: 1000,
  },
  streak: {
    days: lastFourWeeks(MOCK_TODAY, ['2026-09-29', '2026-10-03', '2026-10-10']),
    current: 12,
    longest: 21,
    freezesLeft: 2,
  },
  importedHours: 13,
  challengesWon: 3,
  recap: {
    month: '2026-09-01',
    books: [
      book('howards', 'Howards End', 'E. M. Forster', {
        background: '#6E8B5A',
        ink: '#14200F',
        accent: '#2F4426',
        motif: 'block',
      }),
      book('awakening', 'The Awakening', 'Kate Chopin', {
        background: '#33686A',
        ink: '#EFF4EC',
        accent: '#E0B65A',
        motif: 'disc',
      }),
      book('marner', 'Silas Marner', 'George Eliot', {
        background: '#C4A788',
        ink: '#33241A',
        accent: '#7A4A2A',
        motif: 'frame',
      }),
    ],
    hours: 16,
    challengesWon: 1,
  },
};
