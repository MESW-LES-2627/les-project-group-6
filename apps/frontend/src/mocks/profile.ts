import type { Book, CoverStyle, Profile, Spine, StreakDay } from '@/types/profile';

// Mock data for the profile prototype, matching the design reference.
// Replace with data from the API once the profile endpoints exist.

function book(id: string, title: string, author: string, cover: CoverStyle): Book {
  return { id, title, author, cover };
}

const books = {
  innocence: book('innocence', 'The Age of Innocence', 'Edith Wharton', {
    background: '#E2C7A6',
    ink: '#3A1F1A',
    accent: '#8E2F3A',
    motif: 'frame',
  }),
  north: book('north', 'North and South', 'Elizabeth Gaskell', {
    background: '#2E4A6B',
    ink: '#F1E9DA',
    accent: '#C8A24A',
    motif: 'disc',
  }),
  cranford: book('cranford', 'Cranford', 'Elizabeth Gaskell', {
    background: '#E6D6E2',
    ink: '#3B2346',
    accent: '#7B4E8F',
    motif: 'band',
  }),
  deronda: book('deronda', 'Daniel Deronda', 'George Eliot', {
    background: '#1E2A44',
    ink: '#E9D8B8',
    accent: '#A8423A',
    motif: 'block',
  }),
  floss: book('floss', 'The Mill on the Floss', 'George Eliot', {
    background: '#5A7A66',
    ink: '#F7F2E6',
    accent: '#2C4A3B',
    motif: 'disc',
  }),
  sense: book('sense', 'Sense and Sensibility', 'Jane Austen', {
    background: '#F0B9A6',
    ink: '#4A1E22',
    accent: '#C24E3F',
    motif: 'frame',
  }),
  orlando: book('orlando', 'Orlando', 'Virginia Woolf', {
    background: '#D6A93C',
    ink: '#2B1B0E',
    accent: '#6C2E4F',
    motif: 'band',
  }),
  frome: book('frome', 'Ethan Frome', 'Edith Wharton', {
    background: '#CFD8DE',
    ink: '#1F2B36',
    accent: '#44606F',
    motif: 'block',
  }),
  middlemarch: book('middlemarch', 'Middlemarch', 'George Eliot', {
    background: '#7A3B2E',
    ink: '#F3E6D3',
    accent: '#D9A55B',
    motif: 'band',
  }),
  dalloway: book('dalloway', 'Mrs Dalloway', 'Virginia Woolf', {
    background: '#E3B7A0',
    ink: '#3C1E1A',
    accent: '#5E7F8C',
    motif: 'disc',
  }),
  howards: book('howards', 'Howards End', 'E. M. Forster', {
    background: '#6E8B5A',
    ink: '#14200F',
    accent: '#2F4426',
    motif: 'block',
  }),
  awakening: book('awakening', 'The Awakening', 'Kate Chopin', {
    background: '#33686A',
    ink: '#EFF4EC',
    accent: '#E0B65A',
    motif: 'disc',
  }),
  marner: book('marner', 'Silas Marner', 'George Eliot', {
    background: '#C4A788',
    ink: '#33241A',
    accent: '#7A4A2A',
    motif: 'frame',
  }),
  persuasion: book('persuasion', 'Persuasion', 'Jane Austen', {
    background: '#9DB4C0',
    ink: '#1E2E38',
    accent: '#4D6B7B',
    motif: 'band',
  }),
  eyre: book('eyre', 'Jane Eyre', 'Charlotte Brontë', {
    background: '#2F2F35',
    ink: '#E8DCC4',
    accent: '#8E2F3A',
    motif: 'frame',
  }),
  lighthouse: book('lighthouse', 'To the Lighthouse', 'Virginia Woolf', {
    background: '#2F6E83',
    ink: '#F2EAD8',
    accent: '#E9C46A',
    motif: 'disc',
  }),
  mirth: book('mirth', 'The House of Mirth', 'Edith Wharton', {
    background: '#B9474A',
    ink: '#FBEDE2',
    accent: '#6E1F2A',
    motif: 'band',
  }),
  bovary: book('bovary', 'Madame Bovary', 'Gustave Flaubert', {
    background: '#C9A85C',
    ink: '#2A1C10',
    accent: '#5B2A3A',
    motif: 'frame',
  }),
};

// [title, author, background, ink, width, height]
const shelfRows: [string, string, string, string, number, number][] = [
  ['Persuasion', 'Jane Austen', '#9DB4C0', '#1E2E38', 30, 168],
  ['Middlemarch', 'George Eliot', '#7A3B2E', '#F3E6D3', 46, 196],
  ['Jane Eyre', 'Charlotte Brontë', '#2F2F35', '#E8DCC4', 36, 182],
  ['Wuthering Heights', 'Emily Brontë', '#4F5B3A', '#EEE6CF', 32, 176],
  ['Mrs Dalloway', 'Virginia Woolf', '#E3B7A0', '#3C1E1A', 24, 170],
  ['To the Lighthouse', 'Virginia Woolf', '#2F6E83', '#F2EAD8', 26, 178],
  ['The House of Mirth', 'Edith Wharton', '#B9474A', '#FBEDE2', 34, 186],
  ['Great Expectations', 'Charles Dickens', '#1F3B5A', '#EAD9B0', 38, 192],
  ['Anna Karenina', 'Leo Tolstoy', '#6B1F2A', '#F0DCC8', 48, 198],
  ['Madame Bovary', 'Gustave Flaubert', '#C9A85C', '#2A1C10', 30, 174],
  ['The Portrait of a Lady', 'Henry James', '#8C7AA6', '#1F1730', 40, 194],
  ['Howards End', 'E. M. Forster', '#6E8B5A', '#14200F', 30, 172],
  ['A Room with a View', 'E. M. Forster', '#E7CF8E', '#3A2A12', 26, 164],
  ['Emma', 'Jane Austen', '#D7907A', '#2E1512', 36, 180],
  ['Bleak House', 'Charles Dickens', '#3B3A36', '#E6D7B5', 46, 196],
  ['Villette', 'Charlotte Brontë', '#A4B79A', '#22301E', 34, 184],
  ['The Awakening', 'Kate Chopin', '#33686A', '#EFF4EC', 22, 160],
  ['Silas Marner', 'George Eliot', '#C4A788', '#33241A', 24, 166],
];

const shelf: Spine[] = shelfRows.map(([title, author, background, ink, width, height], i) => ({
  book: book(`shelf-${i}`, title, author, { background, ink, accent: ink, motif: 'frame' }),
  width,
  height,
}));

function toIsoDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** The 28 days ending on `today`, oldest first. */
function lastFourWeeks(today: Date, missed: string[] = [], readNone = false): StreakDay[] {
  return Array.from({ length: 28 }, (_, i) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 27 + i);
    const iso = toIsoDate(date);
    return { date: iso, read: !readNone && !missed.includes(iso) };
  });
}

export const MOCK_TODAY = new Date(2026, 9, 22);

export const mockProfile: Profile = {
  user: {
    name: 'Eleanor Whitmore',
    initials: 'EW',
    handle: 'eleanorreads',
    memberSince: '2026-03-01',
    bio: 'Usually somewhere between a cup of tea and one more chapter.',
    genres: ['Classics', 'Literary fiction'],
    privacy: 'friends',
  },
  unreadNotifications: 3,
  currentlyReading: [
    { book: books.innocence, page: 212, pages: 387 },
    { book: books.north, page: 88, pages: 452 },
  ],
  shelf,
  recentlyAdded: [
    books.cranford,
    books.deronda,
    books.floss,
    books.sense,
    books.orlando,
    books.frome,
  ],
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
  readingTime: { countedMinutes: 4260, sessionsCount: 96, importedHours: 13 },
  challengesWon: 3,
  folders: [
    {
      id: 'next',
      name: 'To read next',
      bookCount: 14,
      previewBooks: [books.cranford, books.frome, books.persuasion],
    },
    {
      id: 'victorian',
      name: 'Victorian',
      bookCount: 23,
      previewBooks: [books.middlemarch, books.north, books.eyre],
    },
    {
      id: 'club',
      name: 'Book club 2026',
      bookCount: 9,
      previewBooks: [books.mirth, books.lighthouse, books.bovary],
    },
    {
      id: 'rereads',
      name: 'Rereads',
      bookCount: 6,
      previewBooks: [books.dalloway, books.sense, books.marner],
    },
  ],
  recap: {
    month: '2026-09-01',
    books: [books.howards, books.awakening, books.marner],
    hours: 16,
    challengesWon: 1,
  },
};

/** A user who just signed up: every section shows its empty state. */
export const mockNewUserProfile: Profile = {
  user: {
    name: 'Eleanor Whitmore',
    initials: 'EW',
    handle: 'eleanorreads',
    memberSince: '2026-10-22',
    genres: [],
    privacy: 'friends',
  },
  unreadNotifications: 0,
  currentlyReading: [],
  shelf: [],
  recentlyAdded: [],
  chapter: { number: 'I', title: 'The First Page', nextNumber: 'II', xp: 0, xpToNext: 100 },
  streak: { days: lastFourWeeks(MOCK_TODAY, [], true), current: 0, longest: 0, freezesLeft: 2 },
  readingTime: { countedMinutes: 0, sessionsCount: 0, importedHours: 0 },
  challengesWon: 0,
  folders: [],
  recap: null,
};
