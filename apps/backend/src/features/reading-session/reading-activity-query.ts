import { and, asc, desc, eq, gte, inArray, isNotNull, lt, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { readingSessions } from '../../database/schema.js';

/** Counted minutes one reader read in one book. */
export interface MinutesRead {
  userId: string;
  bookId: string;
  minutes: number;
}

/** Counted minutes all readers read in one book. */
export interface BookMinutes {
  bookId: string;
  minutes: number;
}

/** A time window and how many books a ranking keeps. */
export interface RankingWindow {
  /** Inclusive. */
  from: Date;
  /** Exclusive. */
  to: Date;
  limit: number;
}

export interface ActivityWindow {
  userIds: readonly string[];
  /** Inclusive. */
  from: Date;
  /** Exclusive. */
  to: Date;
  /** Only this book, when given. */
  bookId?: string;
}

/**
 * The published read contract of reading sessions. Groups (challenge standings,
 * book club progress) ask it how much their members read, instead of reading the
 * `reading_sessions` table and repeating the rule of which minutes count.
 */
export interface ReadingActivityQuery {
  /**
   * Counted minutes per reader and book. A session counts once it has ended, and
   * on the day it ended: it must end inside [from, to). Running sessions do not count.
   */
  countedMinutes(window: ActivityWindow): Promise<MinutesRead[]>;

  /**
   * Books ranked by the counted minutes of all readers, with the same rule as
   * `countedMinutes`. Books with no counted minutes are left out.
   */
  topBooks(window: RankingWindow): Promise<BookMinutes[]>;
}

export class DrizzleReadingActivityQuery implements ReadingActivityQuery {
  constructor(private readonly db: NodePgDatabase) {}

  async countedMinutes(window: ActivityWindow): Promise<MinutesRead[]> {
    if (window.userIds.length === 0) return [];
    return this.db
      .select({
        userId: readingSessions.userId,
        bookId: readingSessions.bookId,
        minutes: sql<number>`coalesce(sum(${readingSessions.countedMinutes}), 0)::int`,
      })
      .from(readingSessions)
      .where(
        and(
          inArray(readingSessions.userId, [...window.userIds]),
          window.bookId ? eq(readingSessions.bookId, window.bookId) : undefined,
          isNotNull(readingSessions.endedAt),
          gte(readingSessions.endedAt, window.from.toISOString()),
          lt(readingSessions.endedAt, window.to.toISOString()),
        ),
      )
      .groupBy(readingSessions.userId, readingSessions.bookId);
  }

  async topBooks(window: RankingWindow): Promise<BookMinutes[]> {
    if (window.limit <= 0) return [];
    const minutes = sql<number>`sum(${readingSessions.countedMinutes})::int`;
    return this.db
      .select({ bookId: readingSessions.bookId, minutes })
      .from(readingSessions)
      .where(
        and(
          isNotNull(readingSessions.endedAt),
          gte(readingSessions.endedAt, window.from.toISOString()),
          lt(readingSessions.endedAt, window.to.toISOString()),
        ),
      )
      .groupBy(readingSessions.bookId)
      .having(sql`sum(${readingSessions.countedMinutes}) > 0`)
      .orderBy(desc(minutes), asc(readingSessions.bookId))
      .limit(window.limit);
  }
}
