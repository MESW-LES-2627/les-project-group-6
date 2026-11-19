import {
  authorLine,
  mapApiGroupToChallengeDetail,
  mapApiGroupToSummary,
  type ApiBookClub,
  type ApiChallengeGroupDetail,
  type ApiExplore,
  type ApiIncomingRequest,
  type ApiLibraryItem,
  type ApiPendingInvite,
  type ApiReadingSession,
} from '@/services/api';
import type {
  BedsideBook,
  ChallengeSummary,
  ClubSummary,
  HomeFriendRequest,
  HomeInvitation,
  TrendingBook,
} from '@/types/home';
import { formatLongDate } from '@/utils/groups';

/** "Good morning" before noon, "Good afternoon" until 6 pm, then "Good evening". */
export function greetingFor(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** The first word of the display name, for the greeting. */
export function firstNameOf(displayName: string | undefined): string {
  return displayName?.trim().split(/\s+/)[0] ?? '';
}

/**
 * The bedside book: the book of the running session, otherwise the in-progress book
 * updated most recently. Null when the reader is reading nothing.
 */
export function pickBedside(
  library: readonly ApiLibraryItem[],
  active: ApiReadingSession | null,
  clubs: readonly ApiBookClub[],
): BedsideBook | null {
  const inProgress = library
    .filter((item) => item.status === 'in-progress')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const running = active ? library.find((item) => item.book.id === active.bookId) : undefined;
  const item = running ?? inProgress[0];
  if (!item) return null;

  const club = clubs.find((c) => c.round.outcome === 'active' && c.round.book?.id === item.book.id);
  return {
    id: item.book.id,
    title: item.book.title,
    author: authorLine(item.book.authors),
    cover: item.book.coverUrl ?? '',
    pages: item.book.pageCount || 1,
    currentPage: item.currentPage,
    club: club?.name ?? null,
    sessionRunning: active?.bookId === item.book.id,
  };
}

/** True when the reader's library has no books at all (Home then invites them to add one). */
export function isLibraryEmpty(library: readonly ApiLibraryItem[]): boolean {
  return library.length === 0;
}

/** An active challenge with the reader's standing (ties share a rank). */
export function toChallengeSummary(
  group: ApiChallengeGroupDetail,
  meId: string,
  now = new Date(),
): ChallengeSummary {
  const detail = mapApiGroupToChallengeDetail(group, meId, now);
  const mine = detail.leaderboard.find((entry) => entry.member.id === meId);
  const summary = mapApiGroupToSummary(group, now);
  const end = Date.parse(`${group.challenge.endDate}T23:59:59Z`);
  return {
    id: group.id,
    name: group.name,
    rank: mine && mine.rank > 0 ? mine.rank : null,
    score: mine?.score ?? '—',
    readers: group.members.length,
    daysLeft: Math.max(0, Math.ceil((end - now.getTime()) / 86_400_000)),
    progress: summary.progress,
  };
}

/** A book club with an active round. */
export function toClubSummary(club: ApiBookClub): ClubSummary {
  const { round } = club;
  return {
    id: club.id,
    name: club.name,
    bookTitle: round.book?.title ?? 'the club book',
    cover: round.book?.coverUrl ?? '',
    finished: round.finished,
    total: round.expected || club.members.length,
    deadline: formatLongDate(round.deadline),
  };
}

export function toFriendRequest(request: ApiIncomingRequest): HomeFriendRequest {
  return { id: request.id, name: request.requester?.displayName ?? 'A reader' };
}

export function toInvitation(invite: ApiPendingInvite): HomeInvitation {
  const kind = invite.groupKind === 'book-club' ? 'Book club' : 'Challenge';
  return {
    id: invite.id,
    title: invite.groupName,
    detail: `${kind} · invited by ${invite.inviterName}`,
  };
}

/** The books most readers started this week (F-EXP-04). */
export function toTrending(explore: ApiExplore, limit = 3): TrendingBook[] {
  return explore.trending.slice(0, limit).map(({ book, readers }) => ({
    id: book.id,
    title: book.title,
    cover: book.coverUrl ?? '',
    note: `${readers} ${readers === 1 ? 'reader' : 'readers'} this week`,
  }));
}
