import { eq, and } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { BookId } from '../../domain/book/book-id.js';
import type { ReadingStatus } from '../../domain/reading/reading-status.js';
import type { ReadingStatusId } from '../../domain/reading/reading-status-id.js';
import type { IReadingStatusRepository } from '../../domain/reading/reading-status-repository.js';
import type { UserId } from '../../domain/user/user-id.js';
import { readingStatus } from '../database/schema.js';
import { ReadingStatusMapper } from '../persistence/reading-status-mapper.js';

export class DrizzleReadingStatusRepository implements IReadingStatusRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async findById(id: ReadingStatusId): Promise<ReadingStatus | null> {
    const rows = await this.db
      .select()
      .from(readingStatus)
      .where(eq(readingStatus.id, id.value))
      .limit(1);
    const row = rows[0];
    return row ? ReadingStatusMapper.toDomain(row) : null;
  }

  async findByUserAndBook(userId: UserId, bookId: BookId): Promise<ReadingStatus | null> {
    const rows = await this.db
      .select()
      .from(readingStatus)
      .where(and(eq(readingStatus.userId, userId.value), eq(readingStatus.bookId, bookId.value)))
      .limit(1);
    const row = rows[0];
    return row ? ReadingStatusMapper.toDomain(row) : null;
  }

  async save(status: ReadingStatus): Promise<void> {
    const row = ReadingStatusMapper.toPersistence(status);
    // Single atomic upsert: the (user_id, book_id) unique constraint keeps one row per pair.
    await this.db
      .insert(readingStatus)
      .values(row)
      .onConflictDoUpdate({
        target: [readingStatus.userId, readingStatus.bookId],
        set: { status: row.status, currentPage: row.currentPage, updatedAt: row.updatedAt },
      });
  }
}
