import { and, avg, count, desc, eq, inArray, notInArray, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { books, friendships, reviews, users } from '../../database/schema.js';
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

const reviewColumns = {
  id: reviews.id,
  bookId: reviews.bookId,
  rating: reviews.rating,
  comment: reviews.comment,
  createdAt: reviews.createdAt,
  updatedAt: reviews.updatedAt,
  authorId: users.id,
  username: users.username,
  displayName: users.displayName,
  photoUrl: users.photoUrl,
};

interface ReviewRow {
  id: string;
  bookId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  username: string;
  displayName: string;
  photoUrl: string | null;
}

function toView(row: ReviewRow): ReviewView {
  return {
    id: row.id,
    bookId: row.bookId,
    rating: row.rating,
    comment: row.comment,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    author: {
      id: row.authorId,
      username: row.username,
      displayName: row.displayName,
      photoUrl: row.photoUrl,
    },
  };
}

export class DrizzleReviewQuery implements ReviewQuery {
  constructor(private readonly db: NodePgDatabase) {}

  async forBook(bookId: BookId, viewerId: UserId): Promise<BookReviewsView> {
    // The viewer and their friends; their reviews show whatever the profile setting.
    const close = [viewerId.value, ...(await this.friendIdsOf(viewerId))];

    const closeRows = await this.db
      .select(reviewColumns)
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(and(eq(reviews.bookId, bookId.value), inArray(reviews.userId, close)))
      .orderBy(desc(reviews.createdAt));

    const publicRows = await this.db
      .select(reviewColumns)
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(
        and(
          eq(reviews.bookId, bookId.value),
          eq(users.profileVisibility, 'public'),
          notInArray(reviews.userId, close),
        ),
      )
      .orderBy(desc(reviews.createdAt))
      .limit(PUBLIC_REVIEWS_PAGE);

    // F-LIB-02 rule 5 and Q4: only public profiles count in the average.
    const [stats] = await this.db
      .select({ average: avg(reviews.rating), total: count() })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(and(eq(reviews.bookId, bookId.value), eq(users.profileVisibility, 'public')));

    const mine = closeRows.find((row) => row.authorId === viewerId.value);
    return {
      mine: mine ? toView(mine) : null,
      friends: closeRows.filter((row) => row.authorId !== viewerId.value).map(toView),
      publicReviews: publicRows.map(toView),
      publicAverage: stats?.average != null ? Math.round(Number(stats.average) * 10) / 10 : null,
      publicCount: stats?.total ?? 0,
    };
  }

  async forUser(userId: UserId): Promise<ProfileReviewView[]> {
    const rows = await this.db
      .select({
        bookId: books.id,
        title: books.title,
        coverUrl: books.coverUrl,
        rating: reviews.rating,
        comment: reviews.comment,
        updatedAt: reviews.updatedAt,
      })
      .from(reviews)
      .innerJoin(books, eq(reviews.bookId, books.id))
      .where(eq(reviews.userId, userId.value))
      .orderBy(desc(reviews.updatedAt));

    return rows.map((row) => ({
      book: { id: row.bookId, title: row.title, coverUrl: row.coverUrl },
      rating: row.rating,
      comment: row.comment,
      updatedAt: new Date(row.updatedAt).toISOString(),
    }));
  }

  private async friendIdsOf(userId: UserId): Promise<string[]> {
    const rows = await this.db
      .select({ requesterId: friendships.requesterId, addresseeId: friendships.addresseeId })
      .from(friendships)
      .where(
        and(
          eq(friendships.status, 'accepted'),
          or(eq(friendships.requesterId, userId.value), eq(friendships.addresseeId, userId.value)),
        ),
      );
    return rows.map((row) =>
      row.requesterId === userId.value ? row.addresseeId : row.requesterId,
    );
  }
}
