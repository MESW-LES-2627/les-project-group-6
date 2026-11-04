import type { MemberRole } from '../group/group.js';
import type { UserId } from '../user/user.js';
import type { RoundOutcome } from './book-club.js';
import type { BookClubView, RoundView } from './book-club-service.js';
import type { BookPoll, PollStatus } from './book-poll.js';
import type { ClubBookView, ClubStandingView } from './club-progress-query.js';

// Shapes of a book club on the wire. Keeps value objects out of the JSON contract.
export interface RoundDto {
  id: string;
  number: number;
  startDate: string;
  deadline: string;
  outcome: RoundOutcome;
  finished: number;
  expected: number;
  daysLeft: number;
  book: ClubBookView | null;
}

export interface BookClubDto {
  id: string;
  name: string;
  description: string;
  adminId: string;
  members: { userId: string; role: MemberRole; joinedAt: string }[];
  round: RoundDto;
  createdAt: string;
}

export interface PollDto {
  id: string;
  status: PollStatus;
  closesAt: string;
  anonymous: boolean;
  proposals: {
    id: string;
    bookId: string;
    title: string;
    /** Null when proposals are anonymous. */
    proposedBy: { userId: string; displayName: string } | null;
    votes: number;
  }[];
  /** The proposal the reader voted for. */
  yourVote: string | null;
  voted: number;
  total: number;
}

export interface BookClubDetailDto extends BookClubDto {
  standings: ClubStandingView[];
  /** Every round, oldest first; the last one is the current round. */
  history: RoundDto[];
  poll: PollDto | null;
}

function toRoundDto(view: RoundView, books: ClubBookView[]): RoundDto {
  const { round } = view;
  return {
    id: round.id.value,
    number: round.number,
    startDate: round.period.startDate,
    deadline: round.period.deadline,
    outcome: view.outcome,
    finished: view.finished,
    expected: view.expected,
    daysLeft: view.daysLeft,
    book: books.find((b) => b.id === round.bookId.value) ?? null,
  };
}

export function toBookClubDto({ club, rounds }: BookClubView, books: ClubBookView[]): BookClubDto {
  return {
    id: club.id.value,
    name: club.name.value,
    description: club.description,
    adminId: club.adminId.value,
    members: club.members.map((m) => ({
      userId: m.userId.value,
      role: m.role,
      joinedAt: m.joinedAt.toISOString(),
    })),
    round: toRoundDto(rounds[rounds.length - 1]!, books),
    createdAt: club.createdAt.toISOString(),
  };
}

export function toBookClubDetailDto(
  view: BookClubView,
  books: ClubBookView[],
  standings: ClubStandingView[],
  poll: PollDto | null,
): BookClubDetailDto {
  return {
    ...toBookClubDto(view, books),
    standings,
    history: view.rounds.map((r) => toRoundDto(r, books)),
    poll,
  };
}

export function toPollDto(
  poll: BookPoll,
  now: Date,
  reader: UserId | null,
  memberCount: number,
  books: ClubBookView[],
  names: Map<string, string>,
): PollDto {
  return {
    id: poll.id.value,
    status: poll.statusAt(now),
    closesAt: poll.closesAt.toISOString(),
    anonymous: poll.anonymous,
    proposals: poll.proposals.map((p) => ({
      id: p.id.value,
      bookId: p.bookId.value,
      title: books.find((b) => b.id === p.bookId.value)?.title ?? 'Unknown book',
      proposedBy: poll.anonymous
        ? null
        : {
            userId: p.proposedBy.value,
            displayName: names.get(p.proposedBy.value) ?? 'A member',
          },
      votes: poll.votesFor(p.id),
    })),
    yourVote: reader ? (poll.voteOf(reader)?.value ?? null) : null,
    voted: poll.votes.length,
    total: memberCount,
  };
}
