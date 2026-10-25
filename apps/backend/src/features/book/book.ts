import crypto from 'node:crypto';
import { InvalidValueError } from '../../utils/errors.js';
import { Uuid } from '../../utils/uuid.js';
import { PageProgress } from '../reading/reading-state.js';

export class InvalidBookTitleError extends InvalidValueError {
  constructor() {
    super('Title is required');
  }
}

export class InvalidIsbnError extends InvalidValueError {
  constructor(raw: unknown) {
    super(`Invalid ISBN-13: ${String(raw)}`);
  }
}

export class InvalidPageCountError extends InvalidValueError {
  constructor(raw: unknown) {
    super(`Page count must be a positive integer, got ${String(raw)}`);
  }
}

export class BookId extends Uuid {
  declare private readonly brand: 'BookId';

  static of(raw: unknown): BookId {
    return new BookId(Uuid.parse(raw, 'book id'));
  }

  static generate(): BookId {
    return new BookId(crypto.randomUUID());
  }
}

export class BookTitle {
  private constructor(readonly value: string) {}

  static of(raw: unknown): BookTitle {
    const title = typeof raw === 'string' ? raw.trim() : '';
    if (title === '') throw new InvalidBookTitleError();
    return new BookTitle(title);
  }

  equals(other: BookTitle): boolean {
    return this.value === other.value;
  }
}

export class Isbn13 {
  private constructor(readonly value: string) {}

  // Accepts hyphens or spaces and checks the ISBN-13 check digit (weights 1 and 3).
  static of(raw: unknown): Isbn13 {
    if (typeof raw !== 'string') throw new InvalidIsbnError(raw);
    const digits = raw.replace(/[-\s]/g, '');
    if (!/^\d{13}$/.test(digits)) throw new InvalidIsbnError(raw);

    const sum = [...digits].reduce((acc, d, i) => acc + Number(d) * (i % 2 === 0 ? 1 : 3), 0);
    if (sum % 10 !== 0) throw new InvalidIsbnError(raw);

    return new Isbn13(digits);
  }

  equals(other: Isbn13): boolean {
    return this.value === other.value;
  }
}

export class PageCount {
  private constructor(readonly value: number) {}

  static of(raw: unknown): PageCount {
    if (typeof raw !== 'number' || !Number.isInteger(raw) || raw <= 0) {
      throw new InvalidPageCountError(raw);
    }
    return new PageCount(raw);
  }

  equals(other: PageCount): boolean {
    return this.value === other.value;
  }
}

export interface NewBookProps {
  title: string;
  description?: string | null;
  isbn13?: string | null;
  pageCount?: number | null;
  coverUrl?: string | null;
  isCommunityAdded?: boolean;
}

export interface BookState {
  id: BookId;
  title: BookTitle;
  description: string | null;
  isbn13: Isbn13 | null;
  pageCount: PageCount | null;
  coverUrl: string | null;
  isCommunityAdded: boolean;
  createdAt: Date;
}

export class Book {
  readonly id: BookId;
  readonly title: BookTitle;
  readonly description: string | null;
  readonly isbn13: Isbn13 | null;
  readonly pageCount: PageCount | null;
  readonly coverUrl: string | null;
  readonly isCommunityAdded: boolean;
  readonly createdAt: Date;

  private constructor(state: BookState) {
    this.id = state.id;
    this.title = state.title;
    this.description = state.description;
    this.isbn13 = state.isbn13;
    this.pageCount = state.pageCount;
    this.coverUrl = state.coverUrl;
    this.isCommunityAdded = state.isCommunityAdded;
    this.createdAt = state.createdAt;
  }

  /** Registers a new book: validates every field and generates its identity. */
  static create(props: NewBookProps): Book {
    return new Book({
      id: BookId.generate(),
      title: BookTitle.of(props.title),
      description: props.description?.trim() || null,
      isbn13: props.isbn13 ? Isbn13.of(props.isbn13) : null,
      pageCount: props.pageCount != null ? PageCount.of(props.pageCount) : null,
      coverUrl: props.coverUrl?.trim() || null,
      isCommunityAdded: props.isCommunityAdded ?? false,
      createdAt: new Date(),
    });
  }

  /** Rebuilds a book that already exists (used by the repository). */
  static reconstitute(state: BookState): Book {
    return new Book(state);
  }

  /** The reader's progress in this book, bounded by its page count when known. */
  progressAt(page: unknown): PageProgress {
    return PageProgress.of(page, this.pageCount);
  }
}
