import type {
  BookClubDetail,
  ChallengeDetail,
  GroupKind,
  GroupMember,
  GroupStatus,
  GroupSummary,
  LeaderboardEntry,
  PastResult,
  WinMetric,
} from '@/types/groups';
import type { LibraryBook, ReadingStatus } from '@/types/library';
import { formatLongDate, formatPeriod, initialsOf } from '@/utils/groups';

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

export const DEMO_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

export interface ApiBook {
  id: string;
  title: string;
  description: string | null;
  isbn13: string | null;
  pageCount: number;
  coverUrl: string | null;
  isCommunityAdded?: boolean;
  createdAt?: string;
}

export interface ApiLibraryItem {
  id: string;
  book: ApiBook;
  status: ReadingStatus;
  currentPage: number;
  updatedAt: string;
}

const KNOWN_AUTHORS: Record<string, string> = {
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01': 'Jane Austen',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02': 'Matt Haig',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03': 'Madeline Miller',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04': 'Donna Tartt',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05': 'Virginia Woolf',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a06': 'Susanna Clarke',
};

const KNOWN_GENRES: Record<string, string> = {
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01': 'Classics',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02': 'Literary fiction',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03': 'Fantasy',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04': 'Dark academia',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05': 'Essays',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a06': 'Fantasy',
};

export function mapApiLibraryItemToBook(item: ApiLibraryItem): LibraryBook {
  const book = item.book;
  const author = KNOWN_AUTHORS[book.id] ?? 'Unknown Author';
  const genre = KNOWN_GENRES[book.id] ?? 'General';
  const pages = book.pageCount || 1;
  const currentPage = item.currentPage || 0;
  const percent = Math.round((currentPage / pages) * 100);

  let summary = '';
  if (item.status === 'not-started') {
    summary = 'Ready when you are';
  } else if (item.status === 'in-progress') {
    summary = `${currentPage} / ${pages} pages • ${percent}% complete`;
  } else if (item.status === 'finished') {
    summary = `Read 1 time • ★★★★★`;
  } else {
    summary = `Stopped at page ${currentPage}`;
  }

  const chip =
    item.status === 'not-started'
      ? 'To read'
      : item.status === 'in-progress'
        ? 'Reading'
        : item.status === 'finished'
          ? 'Finished'
          : 'DNF';

  return {
    id: book.id,
    title: book.title,
    author,
    cover: book.coverUrl || '/placeholder-cover.png',
    detailCover: book.coverUrl || undefined,
    status: item.status,
    pages,
    currentPage,
    genre,
    summary,
    folderIds: [],
    tagIds: [],
    chip,
    updatedAt: item.updatedAt,
  };
}

export function mapApiBookToLibraryBook(
  book: ApiBook,
  status: ReadingStatus = 'not-started',
  currentPage = 0,
): LibraryBook {
  return mapApiLibraryItemToBook({
    id: book.id,
    book,
    status,
    currentPage,
    updatedAt: book.createdAt || new Date().toISOString(),
  });
}

export async function getHealth(): Promise<string> {
  const response = await fetch(`${baseUrl}/health`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const body: unknown = await response.json();
  if (
    typeof body !== 'object' ||
    body === null ||
    !('status' in body) ||
    typeof body.status !== 'string'
  ) {
    throw new Error('Invalid health response');
  }

  return body.status;
}

export async function getUserLibrary(
  userId: string = DEMO_USER_ID,
  statusFilter?: ReadingStatus,
): Promise<ApiLibraryItem[]> {
  const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
  const response = await fetch(`${baseUrl}/user/${encodeURIComponent(userId)}/library${query}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to load user library: HTTP ${response.status}`);
  }

  return response.json() as Promise<ApiLibraryItem[]>;
}

export async function getBook(bookId: string): Promise<ApiBook> {
  const response = await fetch(`${baseUrl}/book/${encodeURIComponent(bookId)}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to load book: HTTP ${response.status}`);
  }

  return response.json() as Promise<ApiBook>;
}

export async function updateReadingStatus(payload: {
  userId?: string;
  bookId: string;
  status: ReadingStatus;
  currentPage?: number;
}): Promise<unknown> {
  const response = await fetch(`${baseUrl}/reading-status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      userId: payload.userId || DEMO_USER_ID,
      bookId: payload.bookId,
      status: payload.status,
      currentPage: payload.currentPage ?? 0,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to update reading status: HTTP ${response.status}`);
  }

  return response.json();
}

export interface ApiReadingSession {
  id: string;
  userId: string;
  bookId: string;
  startedAt: string;
  endedAt: string | null;
  /** Seconds measured by the server; while running, the time elapsed so far. */
  elapsedSeconds: number;
  countedMinutes: number;
}

export interface ApiReadingStats {
  totalMinutes: number;
  sessionsCount: number;
}

async function errorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}

/** Starts the timer on a book, or resumes the session already running on it. */
export async function startReadingSession(
  bookId: string,
  userId: string = DEMO_USER_ID,
): Promise<ApiReadingSession> {
  const response = await fetch(`${baseUrl}/reading-sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ userId, bookId }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(
      await errorMessage(response, `Failed to start session: HTTP ${response.status}`),
    );
  }

  return response.json() as Promise<ApiReadingSession>;
}

/** Stops the timer; the server decides how many minutes the session counts. */
export async function finishReadingSession(
  sessionId: string,
  userId: string = DEMO_USER_ID,
): Promise<ApiReadingSession> {
  const response = await fetch(
    `${baseUrl}/reading-sessions/${encodeURIComponent(sessionId)}/finish`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ userId }),
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    throw new Error(
      await errorMessage(response, `Failed to finish session: HTTP ${response.status}`),
    );
  }

  return response.json() as Promise<ApiReadingSession>;
}

export async function getReadingStats(userId: string = DEMO_USER_ID): Promise<ApiReadingStats> {
  const response = await fetch(`${baseUrl}/user/${encodeURIComponent(userId)}/reading-stats`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to load reading stats: HTTP ${response.status}`);
  }

  return response.json() as Promise<ApiReadingStats>;
}

/** Discards a running session started by mistake; no minutes are saved. */
export async function cancelReadingSession(
  sessionId: string,
  userId: string = DEMO_USER_ID,
): Promise<void> {
  const response = await fetch(`${baseUrl}/reading-sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ userId }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(
      await errorMessage(response, `Failed to cancel session: HTTP ${response.status}`),
    );
  }
}

export interface ApiChallengeGroup {
  id: string;
  name: string;
  description: string;
  adminId: string;
  status: GroupStatus;
  challenge: { startDate: string; endDate: string; winMetric: WinMetric; metricGoal: number };
  members: { userId: string; role: 'admin' | 'member'; joinedAt: string }[];
  createdAt: string;
}

export interface ApiStanding {
  userId: string;
  displayName: string;
  username: string;
  role: string;
  /** Null when the metric is not tracked yet (only minutes is). */
  score: number | null;
  /** What the score was read in, most minutes first. */
  books: { bookId: string; title: string; minutes: number }[];
}

export interface ApiChallengeGroupDetail extends ApiChallengeGroup {
  standings: ApiStanding[];
}

export interface CreateChallengeGroupPayload {
  name: string;
  description?: string;
  startDate: string;
  durationDays: number;
  winMetric: WinMetric;
}

const METRIC_LABELS: Record<WinMetric, string> = {
  minutes: 'Minutes',
  pages: 'Pages',
  books: 'Books',
  streak: 'Streak',
};

const DAY_MS = 24 * 60 * 60 * 1000;

function durationDays(group: ApiChallengeGroup): number {
  const { startDate, endDate } = group.challenge;
  return Math.round((Date.parse(endDate) - Date.parse(startDate)) / DAY_MS) + 1;
}

function daysLeft(group: ApiChallengeGroup, now: Date): number {
  const end = Date.parse(`${group.challenge.endDate}T23:59:59Z`);
  return Math.max(0, Math.ceil((end - now.getTime()) / DAY_MS));
}

export function mapApiGroupToSummary(group: ApiChallengeGroup, now = new Date()): GroupSummary {
  const days = durationDays(group);
  const left = daysLeft(group, now);
  const elapsed = group.status === 'active' ? days - left : group.status === 'completed' ? days : 0;
  const metric = METRIC_LABELS[group.challenge.winMetric].toLowerCase();

  return {
    id: group.id,
    name: group.name,
    kind: 'challenge',
    status: group.status,
    headline: group.status === 'scheduled' ? 'Starts soon' : `${metric} challenge`,
    progress: Math.round((elapsed / days) * 100),
    detail:
      group.status === 'scheduled'
        ? `Starts ${group.challenge.startDate}`
        : group.status === 'active'
          ? `${left} ${left === 1 ? 'day' : 'days'} left`
          : 'Results are frozen',
    meta: `${formatPeriod(group.challenge.startDate, days)} · counted ${metric} · ${group.members.length} ${group.members.length === 1 ? 'member' : 'members'}`,
    memberInitials: [],
    memberCount: group.members.length,
  };
}

/** Builds the challenge page from the API; chat and history are not stored yet. */
export function mapApiGroupToChallengeDetail(
  group: ApiChallengeGroupDetail,
  now = new Date(),
): ChallengeDetail {
  const days = durationDays(group);
  const left = daysLeft(group, now);
  const tracked = group.standings.every((s) => s.score !== null);
  const unit = group.challenge.winMetric === 'minutes' ? 'min' : '';

  const members = group.standings.map((s) => ({
    id: s.userId,
    name: s.displayName,
    initials: initialsOf(s.displayName),
    handle: s.username,
  }));

  // Tied scores share a rank; the next distinct score gets the next rank.
  let rank = 0;
  let previous: number | null = null;
  const leaderboard: LeaderboardEntry[] = group.standings.map((s, i) => {
    if (s.score !== previous) rank += 1;
    previous = s.score;
    return {
      member: members[i]!,
      rank,
      score: tracked ? `${s.score} ${unit}`.trim() : '—',
      note: s.role === 'admin' ? 'Admin' : 'Member',
      books: s.books.map((b) => ({ title: b.title, score: `${b.minutes} min` })),
    };
  });

  const me = leaderboard.find((e) => e.member.id === DEMO_USER_ID);

  return {
    id: group.id,
    name: group.name,
    tagline: group.description || 'Any book counts. Make time for the page.',
    metric: {
      label: METRIC_LABELS[group.challenge.winMetric],
      note: tracked ? 'Completed session time only' : 'Scores for this metric are coming soon',
    },
    period: {
      label: formatPeriod(group.challenge.startDate, days),
      note: `${days} days · ends ${group.challenge.endDate}`,
    },
    standing: {
      label: me ? `#${me.rank} · ${me.score}` : '—',
      note: tracked ? 'Counted from finished reading sessions' : 'Not tracked yet',
    },
    remaining: {
      label: group.status === 'scheduled' ? 'Not started' : `${left} days`,
      note:
        group.status === 'completed'
          ? 'Completed · results frozen'
          : `${group.status[0]!.toUpperCase()}${group.status.slice(1)}`,
    },
    leaderboard,
    messages: [],
    members,
    history: [],
    rules: [{ label: 'Simple timer', on: true }],
    rulesNote:
      'Any book counts during the competition period. Only finished reading sessions count; cancelled sessions never do.',
  };
}

export async function createChallengeGroup(
  payload: CreateChallengeGroupPayload,
  userId: string = DEMO_USER_ID,
): Promise<ApiChallengeGroup> {
  const response = await fetch(`${baseUrl}/groups/challenges`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ userId, ...payload }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(
      await errorMessage(response, `Failed to create group: HTTP ${response.status}`),
    );
  }

  return response.json() as Promise<ApiChallengeGroup>;
}

export async function getChallengeGroup(groupId: string): Promise<ApiChallengeGroupDetail> {
  const response = await fetch(`${baseUrl}/groups/challenges/${encodeURIComponent(groupId)}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to load group: HTTP ${response.status}`);
  }

  return response.json() as Promise<ApiChallengeGroupDetail>;
}

export async function getUserGroups(userId: string = DEMO_USER_ID): Promise<ApiChallengeGroup[]> {
  const response = await fetch(`${baseUrl}/user/${encodeURIComponent(userId)}/groups`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to load groups: HTTP ${response.status}`);
  }

  return response.json() as Promise<ApiChallengeGroup[]>;
}

// Group chat (ADR-0006): REST sends and reads, the socket only pushes.
export interface ApiChatMessage {
  id: string;
  seq: number;
  groupId: string;
  kind: 'text' | 'system';
  authorId: string | null;
  clientId: string | null;
  /** Null once the message is deleted. */
  body: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export async function getGroupMessages(
  groupId: string,
  cursor: { after?: number; before?: number } = {},
  userId: string = DEMO_USER_ID,
): Promise<ApiChatMessage[]> {
  const query = new URLSearchParams({ userId });
  if (cursor.after !== undefined) query.set('after', String(cursor.after));
  if (cursor.before !== undefined) query.set('before', String(cursor.before));
  const response = await fetch(
    `${baseUrl}/groups/${encodeURIComponent(groupId)}/messages?${query}`,
    { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) },
  );

  if (!response.ok) {
    throw new Error(
      await errorMessage(response, `Failed to load messages: HTTP ${response.status}`),
    );
  }

  return response.json() as Promise<ApiChatMessage[]>;
}

/** Sends a message; retrying with the same clientId never stores it twice. */
export async function sendGroupMessage(
  groupId: string,
  payload: { clientId: string; body: string },
  userId: string = DEMO_USER_ID,
): Promise<ApiChatMessage> {
  const response = await fetch(`${baseUrl}/groups/${encodeURIComponent(groupId)}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ userId, ...payload }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(
      await errorMessage(response, `Failed to send message: HTTP ${response.status}`),
    );
  }

  return response.json() as Promise<ApiChatMessage>;
}

export async function deleteGroupMessage(
  groupId: string,
  messageId: string,
  userId: string = DEMO_USER_ID,
): Promise<void> {
  const response = await fetch(
    `${baseUrl}/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(messageId)}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ userId }),
      signal: AbortSignal.timeout(10_000),
    },
  );

  if (!response.ok) {
    throw new Error(
      await errorMessage(response, `Failed to delete message: HTTP ${response.status}`),
    );
  }
}

/** Where the API lives, so the chat socket can connect to the same server. */
export function apiEndpoint(): { origin: string; path: string } {
  const url = new URL(baseUrl, window.location.origin);
  return { origin: url.origin, path: url.pathname.replace(/\/+$/, '') };
}

// ---------------------------------------------------------------------------
// Shared helpers for JSON requests
// ---------------------------------------------------------------------------

async function getJson<T>(path: string, fallback: string): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, `${fallback}: HTTP ${response.status}`));
  }
  return response.json() as Promise<T>;
}

async function sendJson<T>(
  method: 'POST' | 'PUT',
  path: string,
  body: unknown,
  fallback: string,
): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(await errorMessage(response, `${fallback}: HTTP ${response.status}`));
  }
  return response.json() as Promise<T>;
}

const id = (value: string) => encodeURIComponent(value);

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// ---------------------------------------------------------------------------
// Books catalog (used by the book picker)
// ---------------------------------------------------------------------------

export async function searchBooks(title: string): Promise<ApiBook[]> {
  return getJson<ApiBook[]>(`/book?title=${encodeURIComponent(title)}`, 'Failed to search books');
}

/** Adds a missing book with only its title (F-BOOK-02). */
export async function addBook(title: string): Promise<ApiBook> {
  return sendJson<ApiBook>('POST', '/book', { title }, 'Failed to add the book');
}

export function authorOf(bookId: string): string {
  return KNOWN_AUTHORS[bookId] ?? '';
}

// ---------------------------------------------------------------------------
// Friends and group invites (any group)
// ---------------------------------------------------------------------------

export interface ApiFriend {
  userId: string;
  displayName: string;
  username: string;
}

export interface ApiGroupInvite {
  id: string;
  groupId: string;
  inviteeId: string;
  inviterId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface ApiPendingInvite extends ApiGroupInvite {
  groupName: string;
  groupKind: GroupKind;
  inviterName: string;
}

export function mapApiFriend(friend: ApiFriend): GroupMember {
  return {
    id: friend.userId,
    name: friend.displayName,
    initials: initialsOf(friend.displayName),
    handle: friend.username,
  };
}

export async function getFriends(userId: string = DEMO_USER_ID): Promise<GroupMember[]> {
  const friends = await getJson<ApiFriend[]>(
    `/user/${id(userId)}/friends`,
    'Failed to load friends',
  );
  return friends.map(mapApiFriend);
}

export async function inviteToGroup(
  groupId: string,
  inviteeId: string,
  userId: string = DEMO_USER_ID,
): Promise<ApiGroupInvite> {
  return sendJson(
    'POST',
    `/groups/${id(groupId)}/invites`,
    { userId, inviteeId },
    'Failed to invite',
  );
}

export async function getPendingInvites(
  userId: string = DEMO_USER_ID,
): Promise<ApiPendingInvite[]> {
  return getJson(`/user/${id(userId)}/group-invites`, 'Failed to load invites');
}

export async function answerInvite(
  inviteId: string,
  answer: 'accept' | 'decline',
  userId: string = DEMO_USER_ID,
): Promise<ApiGroupInvite> {
  return sendJson(
    'POST',
    `/group-invites/${id(inviteId)}/${answer}`,
    { userId },
    `Failed to ${answer}`,
  );
}

// ---------------------------------------------------------------------------
// Book clubs
// ---------------------------------------------------------------------------

export type ApiRoundOutcome = 'active' | 'completed' | 'not-completed';

export interface ApiClubBook {
  id: string;
  title: string;
  pageCount: number | null;
  coverUrl: string | null;
}

export interface ApiRound {
  id: string;
  number: number;
  startDate: string;
  deadline: string;
  outcome: ApiRoundOutcome;
  finished: number;
  expected: number;
  daysLeft: number;
  book: ApiClubBook | null;
}

export interface ApiBookClub {
  id: string;
  name: string;
  description: string;
  adminId: string;
  members: { userId: string; role: 'admin' | 'member'; joinedAt: string }[];
  round: ApiRound;
  createdAt: string;
}

export interface ApiClubStanding {
  userId: string;
  displayName: string;
  username: string;
  role: string;
  minutes: number;
  currentPage: number;
  percent: number;
  finished: boolean;
}

export interface ApiPoll {
  id: string;
  status: 'open' | 'closed';
  closesAt: string;
  anonymous: boolean;
  proposals: {
    id: string;
    bookId: string;
    title: string;
    proposedBy: { userId: string; displayName: string } | null;
    votes: number;
  }[];
  yourVote: string | null;
  voted: number;
  total: number;
}

export interface ApiBookClubDetail extends ApiBookClub {
  standings: ApiClubStanding[];
  history: ApiRound[];
  poll: ApiPoll | null;
}

export interface CreateBookClubPayload {
  name: string;
  description?: string;
  bookId: string;
  deadline: string;
}

const OUTCOME_LABELS: Record<ApiRoundOutcome, string> = {
  active: 'Active',
  completed: 'Completed',
  'not-completed': 'Not completed',
};

function clubStatus(round: ApiRound): GroupStatus {
  return round.outcome === 'active' ? 'active' : 'completed';
}

export function mapApiClubToSummary(club: ApiBookClub): GroupSummary {
  const { round } = club;
  const title = round.book?.title ?? 'the club book';
  const total = round.expected || club.members.length;
  return {
    id: club.id,
    name: club.name,
    kind: 'book-club',
    status: clubStatus(round),
    headline: `${round.finished} of ${total} finished`,
    progress: total ? Math.round((round.finished / total) * 100) : 0,
    detail:
      round.outcome === 'active'
        ? `Reading ${title} · ${round.daysLeft} ${round.daysLeft === 1 ? 'day' : 'days'} left`
        : `Round ${round.number} ${OUTCOME_LABELS[round.outcome].toLowerCase()} · ${title}`,
    meta: `Deadline ${formatLongDate(round.deadline)} · Every member must finish`,
    memberInitials: [],
    memberCount: club.members.length,
    book: round.book
      ? {
          title: round.book.title,
          author: authorOf(round.book.id),
          cover: round.book.coverUrl ?? '',
        }
      : undefined,
  };
}

function closesLabel(iso: string): string {
  const date = new Date(iso);
  return `${formatLongDate(`${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`).replace(/ \d{4}$/, '')} at ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Builds the club page from the API; `meId` is the reader viewing it. */
export function mapApiClubToDetail(
  club: ApiBookClubDetail,
  meId: string = DEMO_USER_ID,
): BookClubDetail {
  const { round } = club;
  const book = round.book;
  const pages = book?.pageCount ?? 0;
  const admin = club.standings.find((s) => s.userId === club.adminId);
  const members: GroupMember[] = club.standings.map((s) => ({
    id: s.userId,
    name: s.displayName,
    initials: initialsOf(s.displayName),
    handle: s.username,
  }));
  const leaderboard: LeaderboardEntry[] = club.standings.map((s, i) => ({
    member: members[i]!,
    rank: i + 1,
    score: `${s.minutes} min`,
    note: s.finished ? 'Finished' : `${s.percent}% · In progress`,
    progress: s.percent,
    finished: s.finished,
  }));
  const me = club.standings.find((s) => s.userId === meId);
  const history: PastResult[] = club.history
    .slice(0, -1)
    .reverse()
    .map((r) => ({
      label: `Round ${r.number} · ${OUTCOME_LABELS[r.outcome]}`,
      summary: `${r.book?.title ?? 'Unknown book'} · ${r.finished} of ${r.expected} finished`,
      note: `${formatLongDate(r.startDate)} to ${formatLongDate(r.deadline)}`,
    }));
  const poll = club.poll;

  return {
    id: club.id,
    name: club.name,
    title: club.name,
    subtitle:
      club.description ||
      (book
        ? `Round ${round.number}: ${book.title}${authorOf(book.id) ? ` by ${authorOf(book.id)}` : ''}.`
        : ''),
    round: {
      label: `Round ${round.number} · ${OUTCOME_LABELS[round.outcome]}`,
      book: {
        id: book?.id ?? '',
        title: book?.title ?? 'Unknown book',
        author: authorOf(book?.id ?? ''),
        pages,
        cover: book?.coverUrl ?? '',
      },
    },
    finished: { count: round.finished, total: round.expected },
    deadline: formatLongDate(round.deadline),
    daysLeft:
      round.outcome === 'active'
        ? `${round.daysLeft} ${round.daysLeft === 1 ? 'day' : 'days'} to turn the last page`
        : `Round ${OUTCOME_LABELS[round.outcome].toLowerCase()}`,
    yourProgress: { page: me?.finished ? pages : (me?.currentPage ?? 0), pages },
    leaderboard,
    messages: [],
    voting: poll
      ? {
          status: poll.status,
          closes: closesLabel(poll.closesAt),
          options: poll.proposals.map((p) => ({
            id: p.id,
            title: p.title,
            author: p.proposedBy ? `Proposed by ${p.proposedBy.displayName}` : authorOf(p.bookId),
            votes: p.votes,
          })),
          yourVote: poll.yourVote,
          voted: poll.voted,
          total: poll.total,
          anonymous: poll.anonymous,
        }
      : null,
    members,
    adminName: admin?.displayName ?? 'The admin',
    isAdmin: club.adminId === meId,
    roundOver: round.outcome !== 'active',
    history,
  };
}

export async function createBookClub(
  payload: CreateBookClubPayload,
  userId: string = DEMO_USER_ID,
): Promise<ApiBookClub> {
  return sendJson('POST', '/groups/book-clubs', { userId, ...payload }, 'Failed to create club');
}

export async function getBookClub(
  groupId: string,
  userId: string = DEMO_USER_ID,
): Promise<ApiBookClubDetail> {
  return getJson(`/groups/book-clubs/${id(groupId)}?userId=${id(userId)}`, 'Failed to load club');
}

export async function getUserBookClubs(userId: string = DEMO_USER_ID): Promise<ApiBookClub[]> {
  return getJson(`/user/${id(userId)}/book-clubs`, 'Failed to load book clubs');
}

export async function startNextRound(
  groupId: string,
  payload: { bookId: string; deadline: string },
  userId: string = DEMO_USER_ID,
): Promise<ApiBookClub> {
  return sendJson(
    'POST',
    `/groups/book-clubs/${id(groupId)}/rounds`,
    { userId, ...payload },
    'Failed to start the round',
  );
}

export async function openPoll(
  groupId: string,
  payload: { closesAt: string; anonymous: boolean },
  userId: string = DEMO_USER_ID,
): Promise<ApiPoll> {
  return sendJson(
    'POST',
    `/groups/book-clubs/${id(groupId)}/poll`,
    { userId, ...payload },
    'Failed to open the vote',
  );
}

export async function proposeBook(
  groupId: string,
  bookId: string,
  userId: string = DEMO_USER_ID,
): Promise<ApiPoll> {
  return sendJson(
    'POST',
    `/groups/book-clubs/${id(groupId)}/poll/proposals`,
    { userId, bookId },
    'Failed to propose',
  );
}

export async function voteForProposal(
  groupId: string,
  proposalId: string,
  userId: string = DEMO_USER_ID,
): Promise<ApiPoll> {
  return sendJson(
    'PUT',
    `/groups/book-clubs/${id(groupId)}/poll/vote`,
    { userId, proposalId },
    'Failed to vote',
  );
}
