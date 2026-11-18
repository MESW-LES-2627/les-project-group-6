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
import type {
  BookDetail,
  FolderSummary,
  LibraryBook,
  ReadingStatus,
  TagSummary,
} from '@/types/library';
import type { SessionGroup } from '@/types/session';
import { authProvider, isAuthConfigured } from '@/services/auth';
import { formatLongDate, formatPeriod, initialsOf } from '@/utils/groups';

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

/** The API answered with an error status; `code` is set for auth errors (e.g. `PROFILE_REQUIRED`). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let onUnauthorized: () => void = () => {};

/** Called whenever the API answers 401 (expired or revoked session). */
export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

/**
 * Every API request goes through here: it adds the Supabase access token as
 * `Authorization: Bearer` (F-AUTH-01). The API takes the user from that token.
 */
async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  const token = isAuthConfigured() ? await authProvider.accessToken() : null;
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const timeout = AbortSignal.timeout(10_000);
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    // A caller's signal (e.g. a newer search) and the timeout both cancel the request.
    signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout,
    headers,
  });
  if (response.status === 401) onUnauthorized();
  return response;
}

/** Throws an ApiError with the server's message when the response is not ok. */
async function ensureOk(response: Response, fallback: string): Promise<Response> {
  if (response.ok) return response;
  let message = `${fallback}: HTTP ${response.status}`;
  let code: string | undefined;
  try {
    const body = (await response.json()) as { error?: string; code?: string };
    message = body.error ?? message;
    code = body.code;
  } catch {
    // Not JSON: keep the fallback message.
  }
  throw new ApiError(message, response.status, code);
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

// ---------------------------------------------------------------------------
// The signed-in reader's profile (F-AUTH-01)
// ---------------------------------------------------------------------------

export interface ApiMe {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio?: string | null;
  timezone: string;
  photoUrl: string | null;
  profileVisibility: string;
  createdAt: string;
  streakType?: string;
  /** Live streak: 0 once a whole day was missed (F-READ-04). */
  currentStreak?: number;
  longestStreak?: number;
  /** Today already counts for the streak. */
  readToday?: boolean;
}

export interface ApiStreakDay {
  date: string;
  read: boolean;
}

export interface ApiStreak {
  current: number;
  longest: number;
  /** Today already counts for the streak. */
  readToday: boolean;
  /** Last day (YYYY-MM-DD, reader's timezone) that counted, or null before the first one. */
  lastReadDate: string | null;
  streakType: string;
  freezesLeft: number;
  days: ApiStreakDay[];
}

export interface CreateProfilePayload {
  username: string;
  displayName: string;
  timezone: string;
}

/** The reader's profile; rejects with ApiError code `PROFILE_REQUIRED` before sign-up is finished. */
export async function getMe(): Promise<ApiMe> {
  const response = await ensureOk(await apiFetch('/me'), 'Failed to load your profile');
  return response.json() as Promise<ApiMe>;
}

/** The reader's live streak statistics and 28-day reading calendar grid. */
export async function getStreak(): Promise<ApiStreak> {
  const response = await ensureOk(await apiFetch('/me/streak'), 'Failed to load your streak');
  return response.json() as Promise<ApiStreak>;
}

/** Creates the `users` row for the signed-in Supabase account. */
export async function createMe(payload: CreateProfilePayload): Promise<ApiMe> {
  const response = await ensureOk(
    await apiFetch('/me', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(payload) }),
    'Failed to create your profile',
  );
  return response.json() as Promise<ApiMe>;
}

/** Public check used by the sign-up form before the account is created. */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const response = await ensureOk(
    await apiFetch(`/usernames/${encodeURIComponent(username)}/availability`),
    'Failed to check the username',
  );
  const body = (await response.json()) as { available?: unknown };
  return body.available === true;
}

export interface ApiBook {
  id: string;
  title: string;
  /** Author names; empty when the catalogue has none. */
  authors: string[];
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
  /** The reader's folders that hold this book (F-LIB-03). */
  folderIds?: string[];
  /** The reader's own tags on this book (F-LIB-04). */
  tagIds?: string[];
}

/** The authors of a book as one line, e.g. "Terry Pratchett, Neil Gaiman"; empty when unknown. */
export function authorLine(authors: readonly string[] | undefined): string {
  return (authors ?? []).join(', ');
}

export function mapApiLibraryItemToBook(item: ApiLibraryItem): LibraryBook {
  const book = item.book;
  const pages = book.pageCount || 1;
  const currentPage = item.currentPage || 0;
  const percent = Math.round((currentPage / pages) * 100);

  let summary = '';
  if (item.status === 'not-started') {
    summary = 'Ready when you are';
  } else if (item.status === 'in-progress') {
    summary = `${currentPage} / ${pages} pages • ${percent}% complete`;
  } else if (item.status === 'finished') {
    summary = `Finished • ${pages} pages`;
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
    author: authorLine(book.authors),
    // No image: the cover components show the title instead.
    cover: book.coverUrl ?? '',
    detailCover: book.coverUrl || undefined,
    status: item.status,
    pages,
    currentPage,
    summary,
    folderIds: item.folderIds ?? [],
    tagIds: item.tagIds ?? [],
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
  const response = await apiFetch('/health');

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

export async function getUserLibrary(statusFilter?: ReadingStatus): Promise<ApiLibraryItem[]> {
  const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
  const response = await apiFetch(`/me/library${query}`);

  if (!response.ok) {
    throw new Error(`Failed to load user library: HTTP ${response.status}`);
  }

  return response.json() as Promise<ApiLibraryItem[]>;
}

// ---------------------------------------------------------------------------
// Library folders (F-LIB-03)
// ---------------------------------------------------------------------------

/** The reader's private folders; a book can be in several of them. */
export async function getLibraryFolders(): Promise<FolderSummary[]> {
  return getJson<FolderSummary[]>('/me/library/folders', 'Failed to load your folders');
}

export async function createLibraryFolder(name: string): Promise<FolderSummary> {
  return sendJson<FolderSummary>(
    'POST',
    '/me/library/folders',
    { name },
    'Failed to create the folder',
  );
}

export async function renameLibraryFolder(folderId: string, name: string): Promise<FolderSummary> {
  return sendJson<FolderSummary>(
    'PATCH',
    `/me/library/folders/${encodeURIComponent(folderId)}`,
    { name },
    'Failed to rename the folder',
  );
}

export async function deleteLibraryFolder(folderId: string): Promise<void> {
  await ensureOk(
    await apiFetch(`/me/library/folders/${encodeURIComponent(folderId)}`, { method: 'DELETE' }),
    'Failed to delete the folder',
  );
}

/** Adds the book to one folder; its reading status is untouched. */
export async function addBookToFolder(folderId: string, bookId: string): Promise<void> {
  await ensureOk(
    await apiFetch(
      `/me/library/folders/${encodeURIComponent(folderId)}/books/${encodeURIComponent(bookId)}`,
      { method: 'PUT' },
    ),
    'Failed to add the book to the folder',
  );
}

/** Removes the book from one folder only; it stays in the reader's library. */
export async function removeBookFromFolder(folderId: string, bookId: string): Promise<void> {
  await ensureOk(
    await apiFetch(
      `/me/library/folders/${encodeURIComponent(folderId)}/books/${encodeURIComponent(bookId)}`,
      { method: 'DELETE' },
    ),
    'Failed to remove the book from the folder',
  );
}

// ---------------------------------------------------------------------------
// Library tags (F-LIB-04)
// ---------------------------------------------------------------------------

/** The reader's private tags that are on at least one book, with their book counts. */
export async function getLibraryTags(): Promise<TagSummary[]> {
  return getJson<TagSummary[]>('/me/library/tags', 'Failed to load your tags');
}

/** Adds a tag to the book, reusing the reader's tag of the same name (case-insensitive). */
export async function tagBook(bookId: string, name: string): Promise<TagSummary> {
  return sendJson<TagSummary>(
    'POST',
    `/me/library/books/${encodeURIComponent(bookId)}/tags`,
    { name },
    'Failed to add the tag',
  );
}

/** Removes one tag from the book; the book stays in the reader's library. */
export async function untagBook(bookId: string, tagId: string): Promise<void> {
  await ensureOk(
    await apiFetch(
      `/me/library/books/${encodeURIComponent(bookId)}/tags/${encodeURIComponent(tagId)}`,
      { method: 'DELETE' },
    ),
    'Failed to remove the tag',
  );
}

export async function getBook(bookId: string): Promise<ApiBook> {
  const response = await apiFetch(`/book/${encodeURIComponent(bookId)}`);

  if (!response.ok) {
    throw new Error(`Failed to load book: HTTP ${response.status}`);
  }

  return response.json() as Promise<ApiBook>;
}

export async function updateReadingStatus(payload: {
  bookId: string;
  status: ReadingStatus;
  currentPage?: number;
}): Promise<unknown> {
  const response = await apiFetch('/reading-status', {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify({
      bookId: payload.bookId,
      status: payload.status,
      currentPage: payload.currentPage ?? 0,
    }),
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
export async function startReadingSession(bookId: string): Promise<ApiReadingSession> {
  const response = await apiFetch('/reading-sessions', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify({ bookId }),
  });

  if (!response.ok) {
    throw new Error(
      await errorMessage(response, `Failed to start session: HTTP ${response.status}`),
    );
  }

  return response.json() as Promise<ApiReadingSession>;
}

/** Stops the timer; the server decides how many minutes the session counts. */
export async function finishReadingSession(sessionId: string): Promise<ApiReadingSession> {
  const response = await apiFetch(`/reading-sessions/${encodeURIComponent(sessionId)}/finish`, {
    method: 'PATCH',
  });

  if (!response.ok) {
    throw new Error(
      await errorMessage(response, `Failed to finish session: HTTP ${response.status}`),
    );
  }

  return response.json() as Promise<ApiReadingSession>;
}

export async function getReadingStats(): Promise<ApiReadingStats> {
  const response = await apiFetch('/me/reading-stats');

  if (!response.ok) {
    throw new Error(`Failed to load reading stats: HTTP ${response.status}`);
  }

  return response.json() as Promise<ApiReadingStats>;
}

/** The reader's running session, or null when none is running (the API answers 204). */
export async function getActiveReadingSession(): Promise<ApiReadingSession | null> {
  const response = await ensureOk(
    await apiFetch('/me/reading-sessions/active'),
    'Failed to load your reading session',
  );
  if (response.status === 204) return null;
  return response.json() as Promise<ApiReadingSession>;
}

/** Discards a running session started by mistake; no minutes are saved. */
export async function cancelReadingSession(sessionId: string): Promise<void> {
  const response = await apiFetch(`/reading-sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
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

/**
 * The reader's groups that a session on this book counts towards: every active challenge
 * (any book counts) and the book clubs whose active round reads this book.
 */
export function sessionGroupsFor(
  bookId: string,
  challenges: readonly ApiChallengeGroup[],
  clubs: readonly ApiBookClub[],
): SessionGroup[] {
  const fromChallenges = challenges
    .filter((group) => group.status === 'active')
    .map((group) => ({
      id: group.id,
      name: group.name,
      description: `Any book · ${formatPeriod(group.challenge.startDate, durationDays(group))}`,
      note: `Counted ${METRIC_LABELS[group.challenge.winMetric].toLowerCase()} from finished sessions.`,
    }));
  const fromClubs = clubs
    .filter((club) => club.round.outcome === 'active' && club.round.book?.id === bookId)
    .map((club) => ({
      id: club.id,
      name: club.name,
      description: `Round ${club.round.number} · deadline ${formatLongDate(club.round.deadline)}`,
      note: 'Only time on the round book counts for this club.',
    }));
  return [...fromChallenges, ...fromClubs];
}

/** Builds the challenge page from the API; `meId` is the reader viewing it. */
export function mapApiGroupToChallengeDetail(
  group: ApiChallengeGroupDetail,
  meId: string,
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

  const me = leaderboard.find((e) => e.member.id === meId);

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
): Promise<ApiChallengeGroup> {
  const response = await apiFetch('/groups/challenges', {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      await errorMessage(response, `Failed to create group: HTTP ${response.status}`),
    );
  }

  return response.json() as Promise<ApiChallengeGroup>;
}

export async function getChallengeGroup(groupId: string): Promise<ApiChallengeGroupDetail> {
  const response = await apiFetch(`/groups/challenges/${encodeURIComponent(groupId)}`);

  if (!response.ok) {
    throw new Error(`Failed to load group: HTTP ${response.status}`);
  }

  return response.json() as Promise<ApiChallengeGroupDetail>;
}

export async function getUserGroups(): Promise<ApiChallengeGroup[]> {
  const response = await apiFetch('/me/groups');

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
): Promise<ApiChatMessage[]> {
  const query = new URLSearchParams();
  if (cursor.after !== undefined) query.set('after', String(cursor.after));
  if (cursor.before !== undefined) query.set('before', String(cursor.before));
  const search = query.size ? `?${query}` : '';
  const response = await apiFetch(`/groups/${encodeURIComponent(groupId)}/messages${search}`);

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
): Promise<ApiChatMessage> {
  const response = await apiFetch(`/groups/${encodeURIComponent(groupId)}/messages`, {
    method: 'POST',
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      await errorMessage(response, `Failed to send message: HTTP ${response.status}`),
    );
  }

  return response.json() as Promise<ApiChatMessage>;
}

export async function deleteGroupMessage(groupId: string, messageId: string): Promise<void> {
  const response = await apiFetch(
    `/groups/${encodeURIComponent(groupId)}/messages/${encodeURIComponent(messageId)}`,
    { method: 'DELETE' },
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

async function getJson<T>(path: string, fallback: string, init?: RequestInit): Promise<T> {
  const response = await ensureOk(await apiFetch(path, init), fallback);
  return response.json() as Promise<T>;
}

async function sendJson<T>(
  method: 'POST' | 'PUT' | 'PATCH',
  path: string,
  body: unknown,
  fallback: string,
): Promise<T> {
  const response = await ensureOk(
    await apiFetch(path, { method, headers: JSON_HEADERS, body: JSON.stringify(body) }),
    fallback,
  );
  return response.json() as Promise<T>;
}

const id = (value: string) => encodeURIComponent(value);

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// ---------------------------------------------------------------------------
// Books catalog (used by the book picker)
// ---------------------------------------------------------------------------

/** F-EXP-01: books by title, author or ISBN, tolerating small typos; best match first. */
export async function searchBooks(query: string, signal?: AbortSignal): Promise<ApiBook[]> {
  return getJson<ApiBook[]>(`/book?q=${encodeURIComponent(query)}`, 'Failed to search books', {
    signal,
  });
}

/** The two weekly lists of the Explore page (F-EXP-04), and random books while nothing is trending. */
export interface ApiExplore {
  mostReadThisWeek: { book: ApiBook; minutes: number }[];
  trending: { book: ApiBook; readers: number }[];
  suggestions: ApiBook[];
}

export async function getExplore(): Promise<ApiExplore> {
  return getJson<ApiExplore>('/explore', 'Failed to load Explore');
}

/** What a reader types to add a book no source knows (F-BOOK-02). Only the title is required. */
export interface NewBookPayload {
  title: string;
  authors?: string[];
  isbn13?: string;
  pageCount?: number;
  description?: string;
}

/** Adds a missing book to the shared catalogue (F-BOOK-02). */
export async function addBook(book: NewBookPayload): Promise<ApiBook> {
  return sendJson<ApiBook>('POST', '/book', book, 'Failed to add the book');
}

/** Puts a book on the reader's shelf as "Not started". */
export async function addToLibrary(bookId: string): Promise<void> {
  await sendJson<unknown>(
    'PUT',
    `/library/${id(bookId)}`,
    { status: 'not-started' },
    'Failed to add the book to your library',
  );
}

// ---------------------------------------------------------------------------
// Ratings and reviews (F-LIB-02)
// ---------------------------------------------------------------------------

export interface ApiReviewAuthor {
  id: string;
  username: string;
  displayName: string;
  photoUrl: string | null;
}

export interface ApiReview {
  id: string;
  bookId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  author: ApiReviewAuthor;
}

export interface ApiBookReviews {
  mine: ApiReview | null;
  friends: ApiReview[];
  publicReviews: ApiReview[];
  publicAverage: number | null;
  publicCount: number;
}

export interface ApiProfileReview {
  book: { id: string; title: string; coverUrl: string | null };
  rating: number;
  comment: string | null;
  updatedAt: string;
}

/** Creates or replaces my rating and comment for a book. */
export async function saveReview(
  bookId: string,
  review: { rating: number; comment: string },
): Promise<void> {
  await sendJson<unknown>(
    'PUT',
    `/book/${id(bookId)}/review`,
    review,
    'Failed to save your review',
  );
}

export async function deleteReview(bookId: string): Promise<void> {
  await ensureOk(
    await apiFetch(`/book/${id(bookId)}/review`, { method: 'DELETE' }),
    'Failed to delete your review',
  );
}

/** My review, my friends' reviews, the newest public reviews and the public average. */
export async function getBookReviews(bookId: string): Promise<ApiBookReviews> {
  return getJson<ApiBookReviews>(`/book/${id(bookId)}/reviews`, 'Failed to load reviews');
}

/** The reviews on a profile; rejects with status 403 for a private profile of a stranger. */
export async function getUserReviews(userId: string): Promise<ApiProfileReview[]> {
  return getJson<ApiProfileReview[]>(`/users/${id(userId)}/reviews`, 'Failed to load reviews');
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

export async function getFriends(): Promise<GroupMember[]> {
  const friends = await getJson<ApiFriend[]>('/me/friends', 'Failed to load friends');
  return friends.map(mapApiFriend);
}

// ---------------------------------------------------------------------------
// User profiles and friendships (F-PROF-02, F-SOC-02)
// ---------------------------------------------------------------------------

export type FriendshipStatusWithViewer =
  'self' | 'none' | 'friends' | 'pending_sent' | 'pending_received';

export interface ApiUserProfile {
  id: string;
  username: string;
  displayName: string;
  photoUrl: string | null;
  bio: string | null;
  timezone: string;
  profileVisibility: 'public' | 'private';
  createdAt: string;
  isSelf: boolean;
  isVisible: boolean;
  friendshipStatus: FriendshipStatusWithViewer;
  friendRequestId: string | null;
  currentStreak: number;
  longestStreak: number;
  totalMinutes: number;
  sessionsCount: number;
}

export interface ApiFriendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
  respondedAt: string | null;
}

export interface UserSearchResult {
  id: string;
  username: string;
  displayName: string;
  photoUrl: string | null;
  bio: string | null;
  profileVisibility: 'public' | 'private';
}

export async function getUserProfile(username: string): Promise<ApiUserProfile> {
  const clean = username.trim().replace(/^@/, '');
  return getJson<ApiUserProfile>(
    `/users/${encodeURIComponent(clean)}`,
    'Failed to load user profile',
  );
}

/** F-SOC-02, F-EXP-01: search readers by username or display name. */
export async function searchUsers(
  query: string,
  signal?: AbortSignal,
): Promise<UserSearchResult[]> {
  const clean = query.trim().replace(/^@/, '');
  if (!clean) return [];
  return getJson<UserSearchResult[]>(
    `/users?q=${encodeURIComponent(clean)}`,
    'Failed to search readers',
    { signal },
  );
}

export async function sendFriendRequest(targetUserId: string): Promise<ApiFriendship> {
  return sendJson<ApiFriendship>(
    'POST',
    '/friend-requests',
    { targetUserId },
    'Failed to send friend request',
  );
}

/** A pending request addressed to the reader, with who sent it. */
export interface ApiIncomingRequest extends ApiFriendship {
  requester: { displayName: string; username: string } | null;
}

export async function getFriendRequests(): Promise<ApiIncomingRequest[]> {
  return getJson<ApiIncomingRequest[]>('/me/friend-requests', 'Failed to load friend requests');
}

export async function acceptFriendRequest(friendRequestId: string): Promise<ApiFriendship> {
  return sendJson<ApiFriendship>(
    'POST',
    `/friend-requests/${id(friendRequestId)}/accept`,
    {},
    'Failed to accept friend request',
  );
}

export async function declineFriendRequest(friendRequestId: string): Promise<void> {
  await ensureOk(
    await apiFetch(`/friend-requests/${id(friendRequestId)}/decline`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: '{}',
    }),
    'Failed to decline friend request',
  );
}

export async function removeFriend(userId: string): Promise<void> {
  await ensureOk(
    await apiFetch(`/friends/${id(userId)}`, { method: 'DELETE' }),
    'Failed to remove friend',
  );
}

export async function inviteToGroup(groupId: string, inviteeId: string): Promise<ApiGroupInvite> {
  return sendJson('POST', `/groups/${id(groupId)}/invites`, { inviteeId }, 'Failed to invite');
}

export async function getPendingInvites(): Promise<ApiPendingInvite[]> {
  return getJson('/me/group-invites', 'Failed to load invites');
}

export async function answerInvite(
  inviteId: string,
  answer: 'accept' | 'decline',
): Promise<ApiGroupInvite> {
  return sendJson('POST', `/group-invites/${id(inviteId)}/${answer}`, {}, `Failed to ${answer}`);
}

// ---------------------------------------------------------------------------
// Book clubs
// ---------------------------------------------------------------------------

export type ApiRoundOutcome = 'active' | 'completed' | 'not-completed';

export interface ApiClubBook {
  id: string;
  title: string;
  authors: string[];
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
    authors: string[];
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
          author: authorLine(round.book.authors),
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
export function mapApiClubToDetail(club: ApiBookClubDetail, meId: string): BookClubDetail {
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
        ? `Round ${round.number}: ${book.title}${book.authors.length ? ` by ${authorLine(book.authors)}` : ''}.`
        : ''),
    round: {
      label: `Round ${round.number} · ${OUTCOME_LABELS[round.outcome]}`,
      book: {
        id: book?.id ?? '',
        title: book?.title ?? 'Unknown book',
        author: authorLine(book?.authors),
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
            author: p.proposedBy
              ? `Proposed by ${p.proposedBy.displayName}`
              : authorLine(p.authors),
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

/**
 * The book page's details from the catalogue book, with the reader's club when one of
 * their active rounds reads it.
 */
export function mapApiBookToDetail(book: ApiBook, clubs: readonly ApiBookClub[] = []): BookDetail {
  const club = clubs.find((c) => c.round.outcome === 'active' && c.round.book?.id === book.id);
  return {
    tagline: authorLine(book.authors),
    synopsis: book.description ?? '',
    edition: { isbn: book.isbn13 },
    club: club
      ? {
          groupId: club.id,
          name: club.name,
          roundLabel: `Round ${club.round.number}`,
          memberCount: club.members.length,
          deadlineLabel: formatLongDate(club.round.deadline),
        }
      : undefined,
  };
}

export async function createBookClub(payload: CreateBookClubPayload): Promise<ApiBookClub> {
  return sendJson('POST', '/groups/book-clubs', payload, 'Failed to create club');
}

export async function getBookClub(groupId: string): Promise<ApiBookClubDetail> {
  return getJson(`/groups/book-clubs/${id(groupId)}`, 'Failed to load club');
}

export async function getUserBookClubs(): Promise<ApiBookClub[]> {
  return getJson('/me/book-clubs', 'Failed to load book clubs');
}

export async function startNextRound(
  groupId: string,
  payload: { bookId: string; deadline: string },
): Promise<ApiBookClub> {
  return sendJson(
    'POST',
    `/groups/book-clubs/${id(groupId)}/rounds`,
    payload,
    'Failed to start the round',
  );
}

export async function openPoll(
  groupId: string,
  payload: { closesAt: string; anonymous: boolean },
): Promise<ApiPoll> {
  return sendJson(
    'POST',
    `/groups/book-clubs/${id(groupId)}/poll`,
    payload,
    'Failed to open the vote',
  );
}

export async function proposeBook(groupId: string, bookId: string): Promise<ApiPoll> {
  return sendJson(
    'POST',
    `/groups/book-clubs/${id(groupId)}/poll/proposals`,
    { bookId },
    'Failed to propose',
  );
}

export async function voteForProposal(groupId: string, proposalId: string): Promise<ApiPoll> {
  return sendJson(
    'PUT',
    `/groups/book-clubs/${id(groupId)}/poll/vote`,
    { proposalId },
    'Failed to vote',
  );
}
