import type { Book, CoverStyle, UnbuiltProfileSections } from '@/types/profile';

// Mock data only for the profile sections whose features are not built yet: the unread
// notification count (F-NOTIF), the chapter and XP level, challenges won (#61) and the
// monthly recap. The user, books, shelf, folders, streak and reading time come from the
// API. Remove each part when its endpoint exists.

function book(id: string, title: string, author: string, cover: CoverStyle): Book {
  return { id, title, author, cover };
}

export const mockProfile: UnbuiltProfileSections = {
  unreadNotifications: 3,
  chapter: {
    number: 'VII',
    title: 'The Quiet Explorer',
    nextNumber: 'VIII',
    xp: 640,
    xpToNext: 1000,
  },
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
