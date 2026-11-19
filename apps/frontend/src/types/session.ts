/** A group whose leaderboard this reading session can feed. */
export interface SessionGroup {
  id: string;
  name: string;
  description: string;
  note: string;
}

/** The running session as the session screen shows it; times come from the server. */
export interface ActiveSession {
  bookId: string;
  /** For example "Started at 10:00". */
  startedAtLabel: string;
  /** Short clock label used by the welcome-back note. */
  startTimeLabel: string;
  /** The page the reader was on when the session started. */
  startPage: number;
  elapsedSeconds: number;
  groups: SessionGroup[];
}
