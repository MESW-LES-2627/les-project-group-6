// ---------------------------------------------------------------------------
// Sections served by the API
// ---------------------------------------------------------------------------

/** The book on the reader's bedside: the running session's book, else the latest in progress. */
export interface BedsideBook {
  id: string;
  title: string;
  author: string;
  cover: string;
  pages: number;
  currentPage: number;
  /** The book club whose active round reads this book, if any. */
  club: string | null;
  /** True when a reading session is running on this book. */
  sessionRunning: boolean;
}

/** One of the reader's active challenges, with their standing. */
export interface ChallengeSummary {
  id: string;
  name: string;
  /** The reader's rank (ties share it); null when they have no standing yet. */
  rank: number | null;
  /** For example "420 min", or "—" while the metric is not tracked. */
  score: string;
  readers: number;
  daysLeft: number;
  /** How far through the challenge period we are, 0–100. */
  progress: number;
}

/** One of the reader's book clubs with an active round. */
export interface ClubSummary {
  id: string;
  name: string;
  bookTitle: string;
  cover: string;
  finished: number;
  total: number;
  deadline: string;
}

/** A pending friend request addressed to the reader. */
export interface HomeFriendRequest {
  id: string;
  name: string;
}

/** A pending invite to a challenge or book club. */
export interface HomeInvitation {
  id: string;
  title: string;
  detail: string;
}

export interface TrendingBook {
  id: string;
  title: string;
  cover: string;
  note: string;
}

// ---------------------------------------------------------------------------
// Sections whose features are not built yet (mock data in src/mocks/home.ts)
// ---------------------------------------------------------------------------

export interface Streak {
  days: number;
  freezesLeft: number;
  freezesMax: number;
  todayComplete: boolean;
}

export interface YearGoals {
  year: number;
  booksRead: number;
  booksGoal: number;
  minutesRead: number;
  minutesGoal: number;
  onSchedule: boolean;
}

export interface ActivityItem {
  id: string;
  initials: string;
  title: string;
  detail: string;
}

export interface ReadingFriend {
  initials: string;
  name: string;
  book: string;
}

/** The home sections still on mock data until their features exist. */
export interface UnbuiltHomeSections {
  streak: Streak;
  goals: YearGoals;
  activity: ActivityItem[];
  readingNow: ReadingFriend[];
}
