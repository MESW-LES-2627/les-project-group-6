import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { reviews } from '../../database/schema.js';
import { BookId } from '../book/book.js';
import { UserId } from '../user/user.js';
import { Rating, Review, ReviewComment, ReviewId } from './review.js';

export interface IReviewRepository {
  findByUserAndBook(userId: UserId, bookId: BookId): Promise<Review | null>;
  /** Inserts, or replaces the rating and comment of the reader's review of that book. */
  save(review: Review): Promise<void>;
  delete(userId: UserId, bookId: BookId): Promise<boolean>;
}

type ReviewRow = typeof reviews.$inferSelect;

// Data Mapper: the only place that knows both the reviews row and the aggregate.
function toDomain(row: ReviewRow): Review {
  return Review.reconstitute({
    id: ReviewId.of(row.id),
    userId: UserId.of(row.userId),
    bookId: BookId.of(row.bookId),
    rating: Rating.of(row.rating),
    comment: ReviewComment.of(row.comment),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  });
}

export class DrizzleReviewRepository implements IReviewRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async findByUserAndBook(userId: UserId, bookId: BookId): Promise<Review | null> {
    const rows = await this.db
      .select()
      .from(reviews)
      .where(and(eq(reviews.userId, userId.value), eq(reviews.bookId, bookId.value)))
      .limit(1);
    const row = rows[0];
    return row ? toDomain(row) : null;
  }

  async save(review: Review): Promise<void> {
    // Single atomic upsert: the (user_id, book_id) unique constraint keeps one review per pair.
    await this.db
      .insert(reviews)
      .values({
        id: review.id.value,
        userId: review.userId.value,
        bookId: review.bookId.value,
        rating: review.rating.value,
        comment: review.comment.text,
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString(),
      })
      .onConflictDoUpdate({
        target: [reviews.userId, reviews.bookId],
        set: {
          rating: review.rating.value,
          comment: review.comment.text,
          updatedAt: review.updatedAt.toISOString(),
        },
      });
  }

  async delete(userId: UserId, bookId: BookId): Promise<boolean> {
    const result = await this.db
      .delete(reviews)
      .where(and(eq(reviews.userId, userId.value), eq(reviews.bookId, bookId.value)))
      .returning({ id: reviews.id });
    return result.length > 0;
  }
}
