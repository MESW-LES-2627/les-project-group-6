import { and, count, desc, eq, gte, isNotNull, isNull, sql } from 'drizzle-orm';
import type { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import { readingSessions } from '../../database/schema.js';
import { BookId } from '../book/book.js';
import { UserId } from '../user/user.js';
import { ReadingSession, ReadingSessionId } from './reading-session.js';

export interface ReadingStats {
  totalMinutes: number;
  sessionsCount: number;
}

export interface IReadingSessionRepository {
  findById(id: ReadingSessionId): Promise<ReadingSession | null>;
  findActiveByUser(userId: UserId): Promise<ReadingSession | null>;
  findCompletedSessions(
    userId: UserId,
    since?: Date,
  ): Promise<{ endedAt: Date; countedMinutes: number }[]>;
  statsForUser(userId: UserId): Promise<ReadingStats>;
  save(session: ReadingSession): Promise<void>;
  delete(id: ReadingSessionId): Promise<void>;
  /**
   * Runs `work` in a transaction holding a lock on this reader, so two requests for
   * the same reader run one after the other. `work` gets the repository to use inside it.
   */
  withReaderLock<T>(
    userId: UserId,
    work: (sessions: IReadingSessionRepository) => Promise<T>,
  ): Promise<T>;
}

type ReadingSessionRow = typeof readingSessions.$inferSelect;

// Data Mapper: the only place that knows both the reading_sessions row and the aggregate.
function toDomain(row: ReadingSessionRow): ReadingSession {
  return ReadingSession.reconstitute({
    id: ReadingSessionId.of(row.id),
    userId: UserId.of(row.userId),
    bookId: BookId.of(row.bookId),
    startedAt: new Date(row.startedAt),
    endedAt: row.endedAt ? new Date(row.endedAt) : null,
    durationSeconds: row.durationSeconds,
    countedMinutes: row.countedMinutes,
  });
}

function toRow(session: ReadingSession): typeof readingSessions.$inferInsert {
  return {
    id: session.id.value,
    userId: session.userId.value,
    bookId: session.bookId.value,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    durationSeconds: session.durationSeconds,
    countedMinutes: session.countedMinutes,
  };
}

export class DrizzleReadingSessionRepository implements IReadingSessionRepository {
  constructor(private readonly db: PgDatabase<NodePgQueryResultHKT>) {}

  async findById(id: ReadingSessionId): Promise<ReadingSession | null> {
    const rows = await this.db
      .select()
      .from(readingSessions)
      .where(eq(readingSessions.id, id.value))
      .limit(1);
    const row = rows[0];
    return row ? toDomain(row) : null;
  }

  async findActiveByUser(userId: UserId): Promise<ReadingSession | null> {
    const rows = await this.db
      .select()
      .from(readingSessions)
      .where(and(eq(readingSessions.userId, userId.value), isNull(readingSessions.endedAt)))
      .limit(1);
    const row = rows[0];
    return row ? toDomain(row) : null;
  }

  async findCompletedSessions(
    userId: UserId,
    since?: Date,
  ): Promise<{ endedAt: Date; countedMinutes: number }[]> {
    const conditions = [
      eq(readingSessions.userId, userId.value),
      isNotNull(readingSessions.endedAt),
    ];
    if (since) {
      conditions.push(gte(readingSessions.endedAt, since.toISOString()));
    }
    const rows = await this.db
      .select({
        endedAt: readingSessions.endedAt,
        countedMinutes: readingSessions.countedMinutes,
      })
      .from(readingSessions)
      .where(and(...conditions))
      .orderBy(desc(readingSessions.endedAt));

    return rows.map((r) => ({
      endedAt: new Date(r.endedAt!),
      countedMinutes: r.countedMinutes,
    }));
  }

  async statsForUser(userId: UserId): Promise<ReadingStats> {
    const rows = await this.db
      .select({
        totalMinutes: sql<number>`coalesce(sum(${readingSessions.countedMinutes}), 0)::int`,
        sessionsCount: count(),
      })
      .from(readingSessions)
      .where(and(eq(readingSessions.userId, userId.value), isNotNull(readingSessions.endedAt)));
    return rows[0] ?? { totalMinutes: 0, sessionsCount: 0 };
  }

  async save(session: ReadingSession): Promise<void> {
    const row = toRow(session);
    await this.db
      .insert(readingSessions)
      .values(row)
      .onConflictDoUpdate({
        target: readingSessions.id,
        set: {
          endedAt: row.endedAt,
          durationSeconds: row.durationSeconds,
          countedMinutes: row.countedMinutes,
        },
      });
  }

  async delete(id: ReadingSessionId): Promise<void> {
    await this.db.delete(readingSessions).where(eq(readingSessions.id, id.value));
  }

  async withReaderLock<T>(
    userId: UserId,
    work: (sessions: IReadingSessionRepository) => Promise<T>,
  ): Promise<T> {
    return this.db.transaction(async (tx) => {
      // Released at commit or rollback. A second request for the same reader waits here,
      // then sees the session the first one inserted.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId.value}))`);
      return work(new DrizzleReadingSessionRepository(tx));
    });
  }
}
