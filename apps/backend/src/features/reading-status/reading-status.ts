import crypto from 'node:crypto';
import { BusinessRuleViolationError } from '../../utils/errors.js';
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
  private _updatedAt: Date;

  private constructor(props: ReadingStatusState) {
    this.id = props.id;
    this.userId = props.userId;
    this.bookId = props.bookId;
    this.state = props.state;
    this._progress = props.progress;
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

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get tracksProgress(): boolean {
    return this.state.tracksProgress;
  }

  startReading(): void {
    this.transitionTo(this.state.start(), null);
  }

  finish(totalPages: PageCount | null): void {
    this.transitionTo(this.state.finish(), totalPages);
  }

  abandon(): void {
    this.transitionTo(this.state.abandon(), null);
  }

  moveBackToShelf(): void {
    this.transitionTo(this.state.moveBackToShelf(), null);
  }

  /** Moves to `target` through the matching intention; staying in the same status is a no-op. */
  changeStatus(target: ReadingStatusType, totalPages: PageCount | null): void {
    if (target === this.status) return;
    CHANGE_TO[target](this, totalPages);
  }

  updateProgress(progress: PageProgress): void {
    if (!this.state.tracksProgress) throw new ProgressNotAllowedError(this.status);
    this._progress = progress;
    this.touch();
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
  (status: ReadingStatus, totalPages: PageCount | null) => void
> = {
  'not-started': (status) => status.moveBackToShelf(),
  'in-progress': (status) => status.startReading(),
  finished: (status, totalPages) => status.finish(totalPages),
  'did-not-finish': (status) => status.abandon(),
};
