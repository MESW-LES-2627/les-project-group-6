export type GroupKind = 'challenge' | 'book-club';
export type GroupStatus = 'active' | 'scheduled' | 'completed';
export type WinMetric = 'minutes' | 'pages' | 'books' | 'streak';

export interface GroupMember {
  id: string;
  name: string;
  initials: string;
  handle: string;
}

/** One card on the groups page. The text lines are ready to show, like the library cards. */
export interface GroupSummary {
  id: string;
  name: string;
  kind: GroupKind;
  status: GroupStatus;
  /** Big line, for example "#2 · 420 min" */
  headline: string;
  /** 0 to 100 */
  progress: number;
  detail: string;
  meta: string;
  memberInitials: string[];
  memberCount: number;
  /** Book club only: the round's book */
  book?: { title: string; author: string; cover: string };
  canRematch?: boolean;
}

export interface GroupInvitation {
  id: string;
  name: string;
  inviter: string;
  detail: string;
  /** The card added to the list when the invitation is accepted */
  group: GroupSummary;
}

export interface ChatMessage {
  id: string;
  /** System messages have no author */
  author?: GroupMember;
  text: string;
  time: string;
  /** Small label above a message, for example the spoiler etiquette tag */
  tag?: string;
}

export interface LeaderboardEntry {
  member: GroupMember;
  /** Shared by tied members */
  rank: number;
  score: string;
  note: string;
  /** 0 to 100, only for book clubs */
  progress?: number;
  finished?: boolean;
  /** Challenges only: what the score was read in, most minutes first */
  books?: { title: string; score: string }[];
}

export interface FairRule {
  label: string;
  /** Rules that are switched off render without a check mark */
  on: boolean;
}

export interface PastResult {
  label: string;
  summary: string;
  note: string;
  rematchLabel?: string;
}

export interface ChallengeDetail {
  id: string;
  name: string;
  tagline: string;
  metric: { label: string; note: string };
  period: { label: string; note: string };
  standing: { label: string; note: string };
  remaining: { label: string; note: string };
  leaderboard: LeaderboardEntry[];
  messages: ChatMessage[];
  members: GroupMember[];
  history: PastResult[];
  /** Absent for a group's first challenge */
  lastResult?: PastResult;
  rules: FairRule[];
  rulesNote: string;
}

export interface ProposalOption {
  id: string;
  title: string;
  /** Second line: the book's author, or who proposed it */
  author: string;
  votes: number;
}

export interface BookClubVoting {
  status: 'open' | 'closed';
  closes: string;
  options: ProposalOption[];
  yourVote: string | null;
  voted: number;
  total: number;
  anonymous: boolean;
}

export interface BookClubDetail {
  id: string;
  name: string;
  title: string;
  subtitle: string;
  round: {
    label: string;
    book: { id: string; title: string; author: string; pages: number; cover: string };
  };
  finished: { count: number; total: number };
  deadline: string;
  /** "20 days to turn the last page" */
  daysLeft: string;
  yourProgress: { page: number; pages: number };
  leaderboard: LeaderboardEntry[];
  messages: ChatMessage[];
  /** Null when no vote is open */
  voting: BookClubVoting | null;
  members: GroupMember[];
  adminName: string;
  /** Whether the reader is the admin */
  isAdmin: boolean;
  /** The round is over, so the admin can pick the next book */
  roundOver: boolean;
  /** Earlier rounds, newest first */
  history: PastResult[];
}
