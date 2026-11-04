import crypto from 'node:crypto';
import {
  BusinessRuleViolationError,
  InvalidValueError,
  NotFoundError,
} from '../../utils/errors.js';
import { Uuid } from '../../utils/uuid.js';
import type { BookId } from '../book/book.js';
import { NotGroupAdminError, NotGroupMemberError, type GroupId } from '../group/group.js';
import type { UserId } from '../user/user.js';
import type { BookClub } from './book-club.js';

export class PollId extends Uuid {
  declare private readonly brand: 'PollId';

  static of(raw: unknown): PollId {
    return new PollId(Uuid.parse(raw, 'poll id'));
  }

  static generate(): PollId {
    return new PollId(crypto.randomUUID());
  }
}

export class ProposalId extends Uuid {
  declare private readonly brand: 'ProposalId';

  static of(raw: unknown): ProposalId {
    return new ProposalId(Uuid.parse(raw, 'proposal id'));
  }

  static generate(): ProposalId {
    return new ProposalId(crypto.randomUUID());
  }
}

export interface Proposal {
  id: ProposalId;
  bookId: BookId;
  proposedBy: UserId;
  createdAt: Date;
}

export interface Vote {
  userId: UserId;
  proposalId: ProposalId;
  castAt: Date;
}

export class PollRuleError extends BusinessRuleViolationError {}

/** At most this many proposals per member (F-GRP-08 rule 2 default). */
export const PROPOSALS_PER_MEMBER = 1;

export type PollStatus = 'open' | 'closed';

export interface BookPollState {
  id: PollId;
  groupId: GroupId;
  closesAt: Date;
  /** When true, members see the proposals and totals but not who proposed. */
  anonymous: boolean;
  proposals: Proposal[];
  votes: Vote[];
  createdAt: Date;
  /** Set when the admin starts the next round; the poll is then history. */
  closedAt: Date | null;
}

function parseInstant(raw: unknown): Date {
  const date = typeof raw === 'string' ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) {
    throw new InvalidValueError(`Invalid closing time: ${String(raw)}`);
  }
  return date;
}

// Aggregate root: members propose books and vote on the next one until the poll
// closes. The admin still makes the final selection (F-GRP-08 rule 5).
export class BookPoll {
  readonly id: PollId;
  readonly groupId: GroupId;
  readonly closesAt: Date;
  readonly anonymous: boolean;
  readonly createdAt: Date;
  private readonly _proposals: Proposal[];
  private _votes: Vote[];
  private _closedAt: Date | null;

  private constructor(state: BookPollState) {
    this.id = state.id;
    this.groupId = state.groupId;
    this.closesAt = state.closesAt;
    this.anonymous = state.anonymous;
    this.createdAt = state.createdAt;
    this._proposals = [...state.proposals];
    this._votes = [...state.votes];
    this._closedAt = state.closedAt;
  }

  static open(
    club: BookClub,
    by: UserId,
    closesAt: unknown,
    anonymous: unknown,
    now: Date,
  ): BookPoll {
    if (!club.isAdmin(by)) throw new NotGroupAdminError('open a vote');
    const closes = parseInstant(closesAt);
    if (closes <= now) throw new InvalidValueError('The vote must close in the future');
    return new BookPoll({
      id: PollId.generate(),
      groupId: club.id,
      closesAt: closes,
      anonymous: anonymous === undefined ? true : anonymous === true,
      proposals: [],
      votes: [],
      createdAt: now,
      closedAt: null,
    });
  }

  static reconstitute(state: BookPollState): BookPoll {
    return new BookPoll(state);
  }

  get proposals(): readonly Proposal[] {
    return this._proposals;
  }

  get votes(): readonly Vote[] {
    return this._votes;
  }

  get closedAt(): Date | null {
    return this._closedAt;
  }

  statusAt(now: Date): PollStatus {
    return this._closedAt === null && now < this.closesAt ? 'open' : 'closed';
  }

  propose(club: BookClub, by: UserId, bookId: BookId, now: Date): Proposal {
    this.requireOpen(club, by, 'propose a book', now);
    if (club.currentRound.bookId.equals(bookId)) {
      throw new PollRuleError('This book is the one the club is reading now');
    }
    if (this._proposals.some((p) => p.bookId.equals(bookId))) {
      throw new PollRuleError('This book was already proposed');
    }
    const mine = this._proposals.filter((p) => p.proposedBy.equals(by)).length;
    if (mine >= PROPOSALS_PER_MEMBER) {
      throw new PollRuleError(`Each member proposes at most ${PROPOSALS_PER_MEMBER} book`);
    }
    const proposal = { id: ProposalId.generate(), bookId, proposedBy: by, createdAt: now };
    this._proposals.push(proposal);
    return proposal;
  }

  /** One vote per member; voting again moves the vote. */
  vote(club: BookClub, by: UserId, proposalId: ProposalId, now: Date): void {
    this.requireOpen(club, by, 'vote', now);
    if (!this._proposals.some((p) => p.id.equals(proposalId))) throw new NotFoundError('Proposal');
    this._votes = [
      ...this._votes.filter((v) => !v.userId.equals(by)),
      { userId: by, proposalId, castAt: now },
    ];
  }

  close(now: Date): void {
    if (this._closedAt === null) this._closedAt = now;
  }

  votesFor(proposalId: ProposalId): number {
    return this._votes.filter((v) => v.proposalId.equals(proposalId)).length;
  }

  voteOf(userId: UserId): ProposalId | null {
    return this._votes.find((v) => v.userId.equals(userId))?.proposalId ?? null;
  }

  private requireOpen(club: BookClub, by: UserId, action: string, now: Date): void {
    if (!club.isMember(by)) throw new NotGroupMemberError(action);
    if (this.statusAt(now) !== 'open') throw new PollRuleError('Voting is closed');
  }
}
