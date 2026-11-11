import { eq, and } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { readingStatus } from '../../database/schema.js';
import { BookId } from '../book/book.js';
import { UserId } from '../user/user.js';
import { PageProgress, ReadingState } from './reading-state.js';
import { ReadingStatus, ReadingStatusId } from './reading-status.js';

export interface IReadingStatusRepository {
  findById(id: ReadingStatusId): Promise<ReadingStatus | null>;
  findByUserAndBook(userId: UserId, bookId: BookId): Promise<ReadingStatus | null>;
  save(status: ReadingStatus): Promise<void>;
  delete(userId: UserId, bookId: BookId): Promise<boolean>;
  deleteById(id: ReadingStatusId): Promise<boolean>;
}

type ReadingStatusRow = typeof readingStatus.$inferSelect;

// Data Mapper: the only place that knows both the reading_status row and the aggregate.
function toDomain(row: ReadingStatusRow): ReadingStatus {
  return ReadingStatus.reconstitute({
    id: ReadingStatusId.of(row.id),
    userId: UserId.of(row.userId),
    bookId: BookId.of(row.bookId),
    state: ReadingState.of(row.status),
    progress: PageProgress.of(row.currentPage),
    startedOn: row.startedOn ?? null,
    finishedOn: row.finishedOn ?? null,
    updatedAt: new Date(row.updatedAt),
  });
}

function toRow(status: ReadingStatus): typeof readingStatus.$inferInsert {
  return {
    id: status.id.value,
    userId: status.userId.value,
    bookId: status.bookId.value,
    status: status.status,
    currentPage: status.progress.page,
    startedOn: status.startedOn,
    finishedOn: status.finishedOn,
    updatedAt: status.updatedAt.toISOString(),
  };
}

export class DrizzleReadingStatusRepository implements IReadingStatusRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async findById(id: ReadingStatusId): Promise<ReadingStatus | null> {
    const rows = await this.db
      .select()
      .from(readingStatus)
      .where(eq(readingStatus.id, id.value))
      .limit(1);
    const row = rows[0];
    return row ? toDomain(row) : null;
  }

  async findByUserAndBook(userId: UserId, bookId: BookId): Promise<ReadingStatus | null> {
    const rows = await this.db
      .select()
      .from(readingStatus)
      .where(and(eq(readingStatus.userId, userId.value), eq(readingStatus.bookId, bookId.value)))
      .limit(1);
    const row = rows[0];
    return row ? toDomain(row) : null;
  }

  async save(status: ReadingStatus): Promise<void> {
    const row = toRow(status);
    // Single atomic upsert: the (user_id, book_id) unique constraint keeps one row per pair.
    await this.db
      .insert(readingStatus)
      .values(row)
      .onConflictDoUpdate({
        target: [readingStatus.userId, readingStatus.bookId],
        set: {
          status: row.status,
          currentPage: row.currentPage,
          startedOn: row.startedOn,
          finishedOn: row.finishedOn,
          updatedAt: row.updatedAt,
        },
      });
  }

  async delete(userId: UserId, bookId: BookId): Promise<boolean> {
    const result = await this.db
      .delete(readingStatus)
      .where(and(eq(readingStatus.userId, userId.value), eq(readingStatus.bookId, bookId.value)))
      .returning({ id: readingStatus.id });
    return result.length > 0;
  }

  async deleteById(id: ReadingStatusId): Promise<boolean> {
    const result = await this.db
      .delete(readingStatus)
      .where(eq(readingStatus.id, id.value))
      .returning({ id: readingStatus.id });
    return result.length > 0;
  }
}
