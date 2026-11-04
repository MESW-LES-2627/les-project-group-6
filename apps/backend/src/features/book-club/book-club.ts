import crypto from 'node:crypto';
import { DAY_MS, isoDay, parseIsoDay } from '../../utils/calendar.js';
import { BusinessRuleViolationError, InvalidValueError } from '../../utils/errors.js';
import { Uuid } from '../../utils/uuid.js';
import type { BookId } from '../book/book.js';
import { GroupId, NotGroupAdminError, type GroupName, type Membership } from '../group/group.js';
import type { UserId } from '../user/user.js';

export class RoundId extends Uuid {
  declare private readonly brand: 'RoundId';

  static of(raw: unknown): RoundId {
    return new RoundId(Uuid.parse(raw, 'round id'));
  }

  static generate(): RoundId {
    return new RoundId(crypto.randomUUID());
  }
}

export class InvalidRoundPeriodError extends InvalidValueError {}

export const MAX_ROUND_DAYS = 365;

// Value object: the calendar days of a round, from its start to its deadline
// (inclusive, UTC). The book must be finished before the day after the deadline.
export class RoundPeriod {
  private constructor(
    readonly startDate: string,
    readonly deadline: string,
  ) {}

  static of(start: unknown, deadline: unknown): RoundPeriod {
    const from = parseIsoDay(start);
    if (!from) throw new InvalidRoundPeriodError(`Invalid start date: ${String(start)}`);
    const to = parseIsoDay(deadline);
    if (!to) throw new InvalidRoundPeriodError(`Invalid deadline: ${String(deadline)}`);
    const days = (to.getTime() - from.getTime()) / DAY_MS + 1;
    if (days < 1) throw new InvalidRoundPeriodError('The deadline is before the round starts');
    if (days > MAX_ROUND_DAYS) {
      throw new InvalidRoundPeriodError(`A round lasts at most ${MAX_ROUND_DAYS} days`);
    }
    return new RoundPeriod(start as string, deadline as string);
  }

  /** A round that starts on the day of `now` and ends on `deadline`. */
  static startingOn(now: Date, deadline: unknown): RoundPeriod {
    return RoundPeriod.of(isoDay(now), deadline);
  }

  get startsAt(): Date {
    return new Date(`${this.startDate}T00:00:00Z`);
  }

  /** First instant after the deadline day, for half-open time ranges. */
  get endsAt(): Date {
    return new Date(new Date(`${this.deadline}T00:00:00Z`).getTime() + DAY_MS);
  }

  daysLeft(now: Date): number {
    return Math.max(0, Math.ceil((this.endsAt.getTime() - now.getTime()) / DAY_MS));
  }
}

export type RoundOutcome = 'active' | 'completed' | 'not-completed';

export interface RoundState {
  id: RoundId;
  number: number;
  bookId: BookId;
  period: RoundPeriod;
  createdAt: Date;
}

// Entity inside the BookClub aggregate: the club reads one book by a deadline.
export class Round {
  readonly id: RoundId;
  readonly number: number;
  readonly bookId: BookId;
  readonly period: RoundPeriod;
  readonly createdAt: Date;

  private constructor(state: RoundState) {
    this.id = state.id;
    this.number = state.number;
    this.bookId = state.bookId;
    this.period = state.period;
    this.createdAt = state.createdAt;
  }

  static start(number: number, bookId: BookId, period: RoundPeriod, now: Date): Round {
    return new Round({ id: RoundId.generate(), number, bookId, period, createdAt: now });
  }

  static reconstitute(state: RoundState): Round {
    return new Round(state);
  }

  /** The members expected to finish: everyone who joined before the round ended. */
  expectedReaders(members: readonly Membership[]): Membership[] {
    return members.filter((m) => m.joinedAt < this.period.endsAt);
  }

  /** Whether `finishedAt` (when a member finished the book) is in time for this round. */
  inTime(finishedAt: Date | undefined): boolean {
    return finishedAt !== undefined && finishedAt < this.period.endsAt;
  }

  /**
   * Completed when every expected member finished the book before the deadline;
   * not completed once the deadline passed without that; active until then.
   * `finishedAt` holds when each member (by user id) marked the book as finished.
   */
  outcome(
    members: readonly Membership[],
    finishedAt: ReadonlyMap<string, Date>,
    now: Date,
  ): RoundOutcome {
    const expected = this.expectedReaders(members);
    const everyone =
      expected.length > 0 && expected.every((m) => this.inTime(finishedAt.get(m.userId.value)));
    if (everyone) return 'completed';
    return now >= this.period.endsAt ? 'not-completed' : 'active';
  }
}

export class RoundStillActiveError extends BusinessRuleViolationError {
  constructor() {
    super('The current round is still active: wait for the deadline or for everyone to finish');
  }
}

export interface NewBookClubProps {
  adminId: UserId;
  name: GroupName;
  description?: string | null;
  bookId: BookId;
  deadline: unknown;
}

export interface BookClubState {
  id: GroupId;
  name: GroupName;
  description: string;
  adminId: UserId;
  members: Membership[];
  /** At least one round, in order. */
  rounds: Round[];
  createdAt: Date;
}

// Aggregate root: a group that reads one book together per round. The creator is
// its admin and first member, and picks the book of every round.
export class BookClub {
  readonly id: GroupId;
  readonly name: GroupName;
  readonly description: string;
  readonly adminId: UserId;
  readonly createdAt: Date;
  private readonly _members: Membership[];
  private readonly _rounds: Round[];

  private constructor(state: BookClubState) {
    if (state.rounds.length === 0)
      throw new InvalidValueError('A book club has at least one round');
    this.id = state.id;
    this.name = state.name;
    this.description = state.description;
    this.adminId = state.adminId;
    this.createdAt = state.createdAt;
    this._members = [...state.members];
    this._rounds = [...state.rounds].sort((a, b) => a.number - b.number);
  }

  /** Round 1 starts today with the chosen book. */
  static create(props: NewBookClubProps, now: Date = new Date()): BookClub {
    return new BookClub({
      id: GroupId.generate(),
      name: props.name,
      description: props.description?.trim() ?? '',
      adminId: props.adminId,
      members: [{ userId: props.adminId, role: 'admin', joinedAt: now }],
      rounds: [Round.start(1, props.bookId, RoundPeriod.startingOn(now, props.deadline), now)],
      createdAt: now,
    });
  }

  static reconstitute(state: BookClubState): BookClub {
    return new BookClub(state);
  }

  get members(): readonly Membership[] {
    return this._members;
  }

  get rounds(): readonly Round[] {
    return this._rounds;
  }

  get currentRound(): Round {
    return this._rounds[this._rounds.length - 1]!;
  }

  isMember(userId: UserId): boolean {
    return this._members.some((m) => m.userId.equals(userId));
  }

  isAdmin(userId: UserId): boolean {
    return this.adminId.equals(userId);
  }

  /**
   * The admin picks the next book once the current round is over (everyone
   * finished, or the deadline passed). The new round starts today.
   */
  startNextRound(
    by: UserId,
    bookId: BookId,
    deadline: unknown,
    currentOutcome: RoundOutcome,
    now: Date,
  ): Round {
    if (!this.isAdmin(by)) throw new NotGroupAdminError('start a new round');
    if (currentOutcome === 'active') throw new RoundStillActiveError();
    const round = Round.start(
      this.currentRound.number + 1,
      bookId,
      RoundPeriod.startingOn(now, deadline),
      now,
    );
    this._rounds.push(round);
    return round;
  }
}
