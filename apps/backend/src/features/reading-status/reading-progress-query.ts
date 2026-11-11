import { and, asc, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { readingStatus } from '../../database/schema.js';
import type { RankingWindow } from '../reading-session/reading-activity-query.js';

/** Where one reader is in one book. */
export interface ReaderProgress {
  userId: string;
  currentPage: number;
  finished: boolean;
}

/** How many readers added one book to their library. */
export interface BookReaders {
  bookId: string;
  readers: number;
}

/**
 * The published read contract of reading statuses. Other modules (book club
 * progress) ask it where readers are in a book, instead of reading the
 * `reading_status` table and knowing its status values.
 */
export interface ReadingProgressQuery {
  /** Progress of the readers who have the book in their library; the others are left out. */
  progressOf(userIds: readonly string[], bookId: string): Promise<ReaderProgress[]>;

  /** Books ranked by how many readers added them to their library in [from, to). */
  mostAdded(window: RankingWindow): Promise<BookReaders[]>;
}

export class DrizzleReadingProgressQuery implements ReadingProgressQuery {
  constructor(private readonly db: NodePgDatabase) {}

  async progressOf(userIds: readonly string[], bookId: string): Promise<ReaderProgress[]> {
    if (userIds.length === 0) return [];
    const rows = await this.db
      .select({
        userId: readingStatus.userId,
        status: readingStatus.status,
        currentPage: readingStatus.currentPage,
      })
      .from(readingStatus)
      .where(and(inArray(readingStatus.userId, [...userIds]), eq(readingStatus.bookId, bookId)));
    return rows.map((row) => ({
      userId: row.userId,
      currentPage: row.currentPage ?? 0,
      finished: row.status === 'finished',
    }));
  }

  async mostAdded(window: RankingWindow): Promise<BookReaders[]> {
    if (window.limit <= 0) return [];
    const readers = sql<number>`count(distinct ${readingStatus.userId})::int`;
    return this.db
      .select({ bookId: readingStatus.bookId, readers })
      .from(readingStatus)
      .where(
        and(
          gte(readingStatus.createdAt, window.from.toISOString()),
          lt(readingStatus.createdAt, window.to.toISOString()),
        ),
      )
      .groupBy(readingStatus.bookId)
      .orderBy(desc(readers), asc(readingStatus.bookId))
      .limit(window.limit);
  }
}
