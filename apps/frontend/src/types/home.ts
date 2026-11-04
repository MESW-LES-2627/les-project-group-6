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
}

export interface ReadingFriend {
  initials: string;
  name: string;
  book: string;
}

export interface TrendingBook {
  id: string;
  title: string;
  cover: string;
  note: string;
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
  trending: TrendingBook[];
}
