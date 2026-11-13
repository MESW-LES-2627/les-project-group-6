import crypto from 'node:crypto';
import { BusinessRuleViolationError, InvalidValueError } from '../../utils/errors.js';
import { Uuid } from '../../utils/uuid.js';
import type { BookId } from '../book/book.js';
import type { UserId } from '../user/user.js';

export class InvalidRatingError extends InvalidValueError {
  constructor() {
    super('Rating must be between 1 and 5');
  }
}

export class ReviewNotAllowedError extends BusinessRuleViolationError {
  constructor() {
    super('Start reading this book before reviewing it');
  }
}

/** A star rating from 1 to 5 (F-LIB-02 rule 1). */
export class Rating {
  private constructor(readonly value: number) {}

  static of(raw: unknown): Rating {
    if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1 || raw > 5) {
      throw new InvalidRatingError();
    }
    return new Rating(raw);
  }
}

export const MAX_COMMENT_LENGTH = 2000;

/** The optional text of a review: trimmed, and `null` when empty. */
export class ReviewComment {
  private constructor(readonly text: string | null) {}

  static of(raw: unknown): ReviewComment {
    if (raw === undefined || raw === null) return new ReviewComment(null);
    if (typeof raw !== 'string') throw new InvalidValueError('Comment must be text');
    const text = raw.trim();
    if (text.length > MAX_COMMENT_LENGTH) {
      throw new InvalidValueError(`Comment must be at most ${MAX_COMMENT_LENGTH} characters`);
    }
    return new ReviewComment(text === '' ? null : text);
  }
}

export class ReviewId extends Uuid {
  declare private readonly brand: 'ReviewId';

  static of(raw: unknown): ReviewId {
    return new ReviewId(Uuid.parse(raw, 'review id'));
  }

  static generate(): ReviewId {
    return new ReviewId(crypto.randomUUID());
  }
}

export interface ReviewState {
  id: ReviewId;
  userId: UserId;
  bookId: BookId;
  rating: Rating;
  comment: ReviewComment;
  createdAt: Date;
  updatedAt: Date;
}

// Aggregate root: one reader's opinion of one book. References both by ID only.
export class Review {
  readonly id: ReviewId;
  readonly userId: UserId;
  readonly bookId: BookId;
  readonly createdAt: Date;
  private _rating: Rating;
  private _comment: ReviewComment;
  private _updatedAt: Date;

  private constructor(state: ReviewState) {
    this.id = state.id;
    this.userId = state.userId;
    this.bookId = state.bookId;
    this.createdAt = state.createdAt;
    this._rating = state.rating;
    this._comment = state.comment;
    this._updatedAt = state.updatedAt;
  }

  static write(
    userId: UserId,
    bookId: BookId,
    rating: Rating,
    comment: ReviewComment,
    now: Date = new Date(),
  ): Review {
    return new Review({
      id: ReviewId.generate(),
      userId,
      bookId,
      rating,
      comment,
      createdAt: now,
      updatedAt: now,
    });
  }

  /** Rebuilds a stored review (used by the repository). */
  static reconstitute(state: ReviewState): Review {
    return new Review(state);
  }

  get rating(): Rating {
    return this._rating;
  }

  get comment(): ReviewComment {
    return this._comment;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /** Replaces the rating and comment; only the new ones are kept (story #122, "Edit my review"). */
  revise(rating: Rating, comment: ReviewComment, now: Date = new Date()): void {
    this._rating = rating;
    this._comment = comment;
    this._updatedAt = now;
  }
}
