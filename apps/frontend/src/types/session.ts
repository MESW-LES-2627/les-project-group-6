/** A group whose leaderboard this reading session can feed. */
export interface SessionGroup {
  id: string;
  name: string;
  description: string;
  note: string;
}

/** The active-session screen data shown after starting a reading session. */
export interface ActiveSession {
  bookId: string;
  /** For example "Started today at 10:00". */
  startedAtLabel: string;
  /** Short clock label used by the welcome-back note. */
  startTimeLabel: string;
  startPage: number;
  currentPage: number;
  elapsedSeconds: number;
  groups: SessionGroup[];
  profileTitle: string;
  profileCopy: string;
  rules: string[];
  rulesNote: string;
}
