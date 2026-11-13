import { BusinessRuleViolationError, InvalidValueError } from '../../utils/errors.js';
import type { PageCount } from '../book/book.js';

export class InvalidPageProgressError extends InvalidValueError {}

// The page a reader has reached. When the book's page count is known, the
// progress can never go beyond it.
export class PageProgress {
  private constructor(readonly page: number) {}

  static of(raw: unknown, total: PageCount | null = null): PageProgress {
    if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 0) {
      throw new InvalidPageProgressError('currentPage must be a non-negative integer');
    }
    if (total && raw > total.value) {
      throw new InvalidPageProgressError(
        `currentPage ${raw} exceeds the book's ${total.value} pages`,
      );
    }
    return new PageProgress(raw);
  }

  static zero(): PageProgress {
    return new PageProgress(0);
  }

  equals(other: PageProgress): boolean {
    return this.page === other.page;
  }
}

export const READING_STATUS_TYPES = [
  'not-started',
  'in-progress',
  'finished',
  'did-not-finish',
] as const;

export type ReadingStatusType = (typeof READING_STATUS_TYPES)[number];

export class InvalidReadingStatusError extends InvalidValueError {
  constructor() {
    super(`Invalid status. Must be one of: ${READING_STATUS_TYPES.join(', ')}`);
  }
}

export class InvalidReadingTransitionError extends BusinessRuleViolationError {
  constructor(from: ReadingStatusType, to: ReadingStatusType) {
    super(`Cannot change reading status from ${from} to ${to}`);
  }
}

// State pattern: each reading status is a class that knows which transitions it
// allows and what happens to the reader's progress when it is entered. Adding a
// status means adding a class, not editing a switch.
export abstract class ReadingState {
  abstract readonly type: ReadingStatusType;
  /** Whether the reader can record the page they reached while in this state. */
  abstract readonly tracksProgress: boolean;
  /** Whether the reader can rate and review the book in this state (F-LIB-02). */
  abstract readonly allowsReview: boolean;

  start(): ReadingState {
    throw new InvalidReadingTransitionError(this.type, 'in-progress');
  }

  finish(): ReadingState {
    throw new InvalidReadingTransitionError(this.type, 'finished');
  }

  abandon(): ReadingState {
    throw new InvalidReadingTransitionError(this.type, 'did-not-finish');
  }

  moveBackToShelf(): ReadingState {
    throw new InvalidReadingTransitionError(this.type, 'not-started');
  }

  /** The progress the reader has once this state is entered from `from`. */
  abstract progressOnEnter(
    from: ReadingState,
    previous: PageProgress,
    totalPages: PageCount | null,
  ): PageProgress;

  static of(type: unknown): ReadingState {
    const factory = STATES[type as ReadingStatusType];
    if (!factory) throw new InvalidReadingStatusError();
    return factory();
  }

  static notStarted(): ReadingState {
    return new NotStarted();
  }
}

class NotStarted extends ReadingState {
  readonly type = 'not-started';
  readonly tracksProgress = false;
  readonly allowsReview = false;

  override start(): ReadingState {
    return new InProgress();
  }

  // Logging a book that was read before joining the app.
  override finish(): ReadingState {
    return new Finished();
  }

  progressOnEnter(): PageProgress {
    return PageProgress.zero();
  }
}

class InProgress extends ReadingState {
  readonly type = 'in-progress';
  readonly tracksProgress = true;
  readonly allowsReview = true;

  override finish(): ReadingState {
    return new Finished();
  }

  override abandon(): ReadingState {
    return new DidNotFinish();
  }

  override moveBackToShelf(): ReadingState {
    return new NotStarted();
  }

  // Re-reading a finished book starts again from page 0; resuming keeps the page.
  progressOnEnter(from: ReadingState, previous: PageProgress): PageProgress {
    return from instanceof Finished ? PageProgress.zero() : previous;
  }
}

class Finished extends ReadingState {
  readonly type = 'finished';
  readonly tracksProgress = false;
  readonly allowsReview = true;

  override start(): ReadingState {
    return new InProgress();
  }

  progressOnEnter(
    _from: ReadingState,
    previous: PageProgress,
    totalPages: PageCount | null,
  ): PageProgress {
    return totalPages ? PageProgress.of(totalPages.value, totalPages) : previous;
  }
}

class DidNotFinish extends ReadingState {
  readonly type = 'did-not-finish';
  readonly tracksProgress = true;
  readonly allowsReview = true;

  override start(): ReadingState {
    return new InProgress();
  }

  override finish(): ReadingState {
    return new Finished();
  }

  progressOnEnter(_from: ReadingState, previous: PageProgress): PageProgress {
    return previous;
  }
}

const STATES: Record<ReadingStatusType, () => ReadingState> = {
  'not-started': () => new NotStarted(),
  'in-progress': () => new InProgress(),
  finished: () => new Finished(),
  'did-not-finish': () => new DidNotFinish(),
};
