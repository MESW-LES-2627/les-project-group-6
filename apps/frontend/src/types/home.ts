export interface BedsideBook {
  id: string;
  title: string;
  author: string;
  cover: string;
  pages: number;
  currentPage: number;
  club: string;
  lastSession: { minutes: number; when: string; pages: number };
}

export interface Streak {
  days: number;
  freezesLeft: number;
  freezesMax: number;
  todayComplete: boolean;
}

export interface ChallengeSummary {
  id: string;
  name: string;
  rank: number;
  countedMinutes: number;
  behindLeaders: number;
  progress: number;
  daysLeft: number;
  endsOn: string;
  readers: number;
  members: string[];
}

export interface ClubSummary {
  id: string;
  name: string;
  finished: number;
  total: number;
  progress: number;
  deadline: string;
  members: string[];
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
  /** Set when the item links to the group where the comment was posted. */
  to?: string;
}

export interface ReadingFriend {
  initials: string;
  name: string;
  book: string;
}

/** A friend's current book on the Home "Reading now" card. */
export interface HomeFriendReading {
  id: string;
  initials: string;
  name: string;
  book: string;
  /** True when a reading session is running right now. */
  readingNow: boolean;
}

/** A book on the Home "Currently reading" shelf. */
export interface HomeReadingBook {
  id: string;
  title: string;
  author: string;
  cover: string;
  pages: number;
  currentPage: number;
  percent: number;
  pagesToGo: number;
  club?: string;
  lastSession?: string;
}

/** The active challenge tile on Home. */
export interface HomeChallenge {
  id: string;
  name: string;
  rank: number | null;
  readers: number;
  score: string | null;
  daysLeft: string;
  progress: number;
}

/** The active book-club tile on Home. */
export interface HomeClub {
  id: string;
  name: string;
  bookTitle: string;
  bookCover: string;
  finished: number;
  total: number;
  progress: number;
  deadline: string;
}

/** A pending friend request; the API has no display name for it yet. */
export interface HomeFriendRequest {
  id: string;
  name: string | null;
}

/** A pending group invite, ready to show on Home. */
export interface HomeGroupInvite {
  id: string;
  title: string;
  detail: string;
}

export interface HomeInvitation {
  id: string;
  title: string;
  detail: string;
}

export interface HomeData {
  date: string;
  /** Today as YYYY-MM-DD, for the week of reading days */
  isoDate: string;
  readerName: string;
  bedside: BedsideBook;
  streak: Streak;
  challenge: ChallengeSummary;
  club: ClubSummary;
  goals: YearGoals;
  activity: ActivityItem[];
  readingNow: ReadingFriend[];
  friendRequest: { name: string } | null;
  invitation: HomeInvitation | null;
}
