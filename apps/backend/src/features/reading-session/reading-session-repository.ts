import { and, count, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
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
  statsForUser(userId: UserId): Promise<ReadingStats>;
  save(session: ReadingSession): Promise<void>;
  delete(id: ReadingSessionId): Promise<void>;
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
  constructor(private readonly db: NodePgDatabase) {}

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
}
