import { BookId } from './book-id.js';
import { BookTitle } from './book-title.js';
import { Isbn13 } from './isbn13.js';
import { PageCount } from './page-count.js';
import { PageProgress } from '../reading/page-progress.js';

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

  /** Rebuilds a book that already exists (used by the persistence mapper). */
  static reconstitute(state: BookState): Book {
    return new Book(state);
  }

  /** The reader's progress in this book, bounded by its page count when known. */
  progressAt(page: number): PageProgress {
    return PageProgress.of(page, this.pageCount);
  }
}
