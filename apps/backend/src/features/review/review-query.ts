import type { BookId } from '../book/book.js';
import type { UserId } from '../user/user.js';

// Read side (CQRS): review lists join reviews, users, friendships and books.
export interface ReviewAuthorView {
  id: string;
  username: string;
  displayName: string;
  photoUrl: string | null;
}

export interface ReviewView {
  id: string;
  bookId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  author: ReviewAuthorView;
}

export interface BookReviewsView {
  mine: ReviewView | null;
  friends: ReviewView[];
  publicReviews: ReviewView[];
  /** Average over public-profile authors, one decimal; `null` when there are none. */
  publicAverage: number | null;
  publicCount: number;
}

export interface ProfileReviewView {
  book: { id: string; title: string; coverUrl: string | null };
  rating: number;
  comment: string | null;
  updatedAt: string;
}

export const PUBLIC_REVIEWS_PAGE = 10;

export interface ReviewQuery {
  forBook(bookId: BookId, viewerId: UserId): Promise<BookReviewsView>;
  /** Every review the user wrote, newest first. Access is checked by the service. */
  forUser(userId: UserId): Promise<ProfileReviewView[]>;
}
