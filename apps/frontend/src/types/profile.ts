/** Decoration drawn on a generated cover when the book has no cover image. */
export type CoverMotif = 'frame' | 'band' | 'disc' | 'block';

export interface CoverStyle {
  background: string;
  ink: string;
  accent: string;
  motif: CoverMotif;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  cover: CoverStyle;
}

export interface ProfileUser {
  name: string;
  initials: string;
  handle: string;
  /** ISO date (YYYY-MM-DD) */
  memberSince: string;
  bio?: string;
  genres: string[];
  privacy: 'public' | 'friends' | 'private';
}

export interface ReadingProgress {
  book: Book;
  page: number;
  pages: number;
}

/** A finished book on the shelf. Width follows the page count, height the format. */
export interface Spine {
  book: Book;
  width: number;
  height: number;
}

export interface ChapterProgress {
  /** Roman numeral, for example "VII" */
  number: string;
  title: string;
  nextNumber: string;
  xp: number;
  xpToNext: number;
}

export interface StreakDay {
  /** ISO date (YYYY-MM-DD) */
  date: string;
  read: boolean;
}

export interface Streak {
  /** Oldest first, the last entry is today */
  days: StreakDay[];
  current: number;
  longest: number;
  freezesLeft: number;
}

export interface ReadingTimeStats {
  /** Minutes counted from finished sessions in the app, measured by the server */
  countedMinutes: number;
  /** Finished sessions those minutes come from */
  sessionsCount: number;
  /** Hours imported from before the user joined, these do not earn XP */
  importedHours: number;
}

export interface Folder {
  id: string;
  name: string;
  bookCount: number;
  /** Up to three covers for the preview, front first */
  previewBooks: Book[];
}

export interface MonthRecap {
  /** First day of the month, ISO date (YYYY-MM-DD) */
  month: string;
  books: Book[];
  hours: number;
  challengesWon: number;
}

export interface Profile {
  user: ProfileUser;
  unreadNotifications: number;
  currentlyReading: ReadingProgress[];
  shelf: Spine[];
  recentlyAdded: Book[];
  chapter: ChapterProgress;
  streak: Streak;
  readingTime: ReadingTimeStats;
  challengesWon: number;
  folders: Folder[];
  recap: MonthRecap | null;
}
