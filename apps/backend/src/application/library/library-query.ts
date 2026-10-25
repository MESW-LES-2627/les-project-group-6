import type { ReadingStatusType } from '../../domain/reading/reading-state.js';
import type { UserId } from '../../domain/user/user-id.js';

// Read side (CQRS): the library screen joins reading statuses with books, which
// does not fit one aggregate, so it is served by a query that returns plain views.
export interface LibraryBookView {
  id: string;
  title: string;
  description: string | null;
  isbn13: string | null;
  pageCount: number | null;
  coverUrl: string | null;
  isCommunityAdded: boolean;
  createdAt: string;
}

export interface LibraryItemView {
  id: string;
  book: LibraryBookView;
  status: ReadingStatusType;
  currentPage: number;
  updatedAt: string;
}

export interface LibraryQuery {
  forUser(userId: UserId, status?: ReadingStatusType): Promise<LibraryItemView[]>;
}
