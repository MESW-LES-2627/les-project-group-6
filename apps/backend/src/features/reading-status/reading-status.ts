import crypto from 'node:crypto';
import { isoDay, parseIsoDay } from '../../utils/calendar.js';
import { BusinessRuleViolationError, InvalidValueError } from '../../utils/errors.js';
import { Uuid } from '../../utils/uuid.js';
import type { BookId, PageCount } from '../book/book.js';
import type { UserId } from '../user/user.js';
import { PageProgress, ReadingState, type ReadingStatusType } from './reading-state.js';

export class ProgressNotAllowedError extends BusinessRuleViolationError {
  constructor(status: ReadingStatusType) {
    super(`Cannot record page progress while the book is ${status}`);
  }
}

export class ReadingStatusId extends Uuid {
  declare private readonly brand: 'ReadingStatusId';

  static of(raw: unknown): ReadingStatusId {
    return new ReadingStatusId(Uuid.parse(raw, 'reading status id'));
  }

  static generate(): ReadingStatusId {
    return new ReadingStatusId(crypto.randomUUID());
  }
}

export interface ReadingStatusState {
  id: ReadingStatusId;
  userId: UserId;
  bookId: BookId;
  state: ReadingState;
  progress: PageProgress;
  startedOn?: string | null;
  finishedOn?: string | null;
  updatedAt: Date;
}

// Aggregate root: a reader's relationship with one book. It references the user
// and the book by ID only.
export class ReadingStatus {
  readonly id: ReadingStatusId;
  readonly userId: UserId;
  readonly bookId: BookId;
  private state: ReadingState;
  private _progress: PageProgress;
  private _startedOn: string | null;
  private _finishedOn: string | null;
  private _updatedAt: Date;

  private constructor(props: ReadingStatusState) {
    this.id = props.id;
    this.userId = props.userId;
    this.bookId = props.bookId;
    this.state = props.state;
    this._progress = props.progress;
    this._startedOn = props.startedOn ?? null;
    this._finishedOn = props.finishedOn ?? null;
    this._updatedAt = props.updatedAt;
  }

  /** The reader adds a book to their library; reading has not started yet. */
  static create(userId: UserId, bookId: BookId): ReadingStatus {
    return new ReadingStatus({
      id: ReadingStatusId.generate(),
      userId,
      bookId,
      state: ReadingState.notStarted(),
      progress: PageProgress.zero(),
      startedOn: null,
      finishedOn: null,
      updatedAt: new Date(),
    });
  }

  /** Rebuilds a reading status that already exists (used by the repository). */
  static reconstitute(props: ReadingStatusState): ReadingStatus {
    return new ReadingStatus(props);
  }

  get status(): ReadingStatusType {
    return this.state.type;
  }

  get progress(): PageProgress {
    return this._progress;
  }

  get startedOn(): string | null {
    return this._startedOn;
  }

  get finishedOn(): string | null {
    return this._finishedOn;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get tracksProgress(): boolean {
    return this.state.tracksProgress;
  }

  startReading(today: string = isoDay(new Date())): void {
    this.transitionTo(this.state.start(), null);
    if (!this._startedOn) {
      this._startedOn = today;
    }
    this._finishedOn = null;
  }

  finish(totalPages: PageCount | null, today: string = isoDay(new Date())): void {
    this.transitionTo(this.state.finish(), totalPages);
    this._finishedOn = today;
    if (!this._startedOn) {
      this._startedOn = today;
    }
  }

  abandon(): void {
    this.transitionTo(this.state.abandon(), null);
  }

  moveBackToShelf(): void {
    this.transitionTo(this.state.moveBackToShelf(), null);
    this._finishedOn = null;
  }

  /** Moves to `target` through the matching intention; staying in the same status is a no-op. */
  changeStatus(target: ReadingStatusType, totalPages: PageCount | null, today?: string): void {
    if (target === this.status) return;
    CHANGE_TO[target](this, totalPages, today);
  }

  updateProgress(progress: PageProgress): void {
    if (!this.state.tracksProgress) throw new ProgressNotAllowedError(this.status);
    this._progress = progress;
    this.touch();
  }

  /** Validates and sets optional startedOn and finishedOn dates. */
  setDates(startedOn?: string | null, finishedOn?: string | null): void {
    const nextStarted =
      startedOn !== undefined ? this.normalizeDate(startedOn, 'startedOn') : this._startedOn;
    const nextFinished =
      finishedOn !== undefined ? this.normalizeDate(finishedOn, 'finishedOn') : this._finishedOn;

    if (nextStarted && nextFinished && nextFinished < nextStarted) {
      throw new InvalidValueError('finishedOn cannot be before startedOn');
    }

    if (startedOn !== undefined) this._startedOn = nextStarted;
    if (finishedOn !== undefined) this._finishedOn = nextFinished;
    this.touch();
  }

  private normalizeDate(raw: string | null, field: string): string | null {
    if (raw === null || raw === '') return null;
    const parsed = parseIsoDay(raw);
    if (!parsed) {
      throw new InvalidValueError(`${field} must be a valid date formatted YYYY-MM-DD`);
    }
    return raw;
  }

  private transitionTo(next: ReadingState, totalPages: PageCount | null): void {
    this._progress = next.progressOnEnter(this.state, this._progress, totalPages);
    this.state = next;
    this.touch();
  }

  private touch(): void {
    this._updatedAt = new Date();
  }
}

const CHANGE_TO: Record<
  ReadingStatusType,
  (status: ReadingStatus, totalPages: PageCount | null, today?: string) => void
> = {
  'not-started': (status) => status.moveBackToShelf(),
  'in-progress': (status, _pages, today) => status.startReading(today),
  finished: (status, totalPages, today) => status.finish(totalPages, today),
  'did-not-finish': (status) => status.abandon(),
};
