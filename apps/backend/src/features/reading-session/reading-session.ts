import crypto from 'node:crypto';
import { BusinessRuleViolationError } from '../../utils/errors.js';
import { Uuid } from '../../utils/uuid.js';
import type { BookId } from '../book/book.js';
import type { UserId } from '../user/user.js';

/** A session left running longer than this only counts up to the cap. */
export const MAX_COUNTED_SECONDS = 12 * 60 * 60;

export class SessionAlreadyFinishedError extends BusinessRuleViolationError {
  constructor() {
    super('This reading session is already finished');
  }
}

export class NotSessionOwnerError extends BusinessRuleViolationError {
  constructor() {
    super('Only the reader who started the session can finish or cancel it');
  }
}

export class ReadingSessionId extends Uuid {
  declare private readonly brand: 'ReadingSessionId';

  static of(raw: unknown): ReadingSessionId {
    return new ReadingSessionId(Uuid.parse(raw, 'reading session id'));
  }

  static generate(): ReadingSessionId {
    return new ReadingSessionId(crypto.randomUUID());
  }
}

export interface ReadingSessionState {
  id: ReadingSessionId;
  userId: UserId;
  bookId: BookId;
  startedAt: Date;
  endedAt: Date | null;
  durationSeconds: number;
  countedMinutes: number;
}

// Aggregate root: one timed stretch of reading. The server clock is the only
// source of time, so the client cannot inflate the minutes it reports.
export class ReadingSession {
  readonly id: ReadingSessionId;
  readonly userId: UserId;
  readonly bookId: BookId;
  readonly startedAt: Date;
  private _endedAt: Date | null;
  private _durationSeconds: number;
  private _countedMinutes: number;

  private constructor(state: ReadingSessionState) {
    this.id = state.id;
    this.userId = state.userId;
    this.bookId = state.bookId;
    this.startedAt = state.startedAt;
    this._endedAt = state.endedAt;
    this._durationSeconds = state.durationSeconds;
    this._countedMinutes = state.countedMinutes;
  }

  /** The reader starts the timer on a book. */
  static start(userId: UserId, bookId: BookId, now: Date): ReadingSession {
    return new ReadingSession({
      id: ReadingSessionId.generate(),
      userId,
      bookId,
      startedAt: now,
      endedAt: null,
      durationSeconds: 0,
      countedMinutes: 0,
    });
  }

  /** Rebuilds a session that already exists (used by the repository). */
  static reconstitute(state: ReadingSessionState): ReadingSession {
    return new ReadingSession(state);
  }

  get endedAt(): Date | null {
    return this._endedAt;
  }

  get durationSeconds(): number {
    return this._durationSeconds;
  }

  get countedMinutes(): number {
    return this._countedMinutes;
  }

  get isActive(): boolean {
    return this._endedAt === null;
  }

  /** Seconds elapsed so far, measured by the server. */
  elapsedSecondsAt(now: Date): number {
    const end = this._endedAt ?? now;
    return Math.max(0, Math.floor((end.getTime() - this.startedAt.getTime()) / 1000));
  }

  /** Stops the timer; the duration comes from the server clock, never the client. */
  finish(by: UserId, now: Date): void {
    this.assertRunningFor(by);

    this._durationSeconds = this.elapsedSecondsAt(now);
    this._countedMinutes = Math.floor(Math.min(this._durationSeconds, MAX_COUNTED_SECONDS) / 60);
    this._endedAt = now;
  }

  /** Checks the reader may discard this session (e.g. started by mistake); nothing is counted. */
  cancel(by: UserId): void {
    this.assertRunningFor(by);
  }

  private assertRunningFor(reader: UserId): void {
    if (!this.userId.equals(reader)) throw new NotSessionOwnerError();
    if (!this.isActive) throw new SessionAlreadyFinishedError();
  }
}
