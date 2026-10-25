import { BookId } from '../../domain/book/book-id.js';
import { PageProgress } from '../../domain/reading/page-progress.js';
import { ReadingState } from '../../domain/reading/reading-state.js';
import { ReadingStatus } from '../../domain/reading/reading-status.js';
import { ReadingStatusId } from '../../domain/reading/reading-status-id.js';
import { UserId } from '../../domain/user/user-id.js';
import type { readingStatus } from '../database/schema.js';

// Data Mapper: the only place that knows both the reading_status row and the aggregate.
export const ReadingStatusMapper = {
  toDomain(row: typeof readingStatus.$inferSelect): ReadingStatus {
    return ReadingStatus.reconstitute({
      id: ReadingStatusId.of(row.id),
      userId: UserId.of(row.userId),
      bookId: BookId.of(row.bookId),
      state: ReadingState.of(row.status),
      progress: PageProgress.of(row.currentPage),
      updatedAt: new Date(row.updatedAt),
    });
  },

  toPersistence(status: ReadingStatus): typeof readingStatus.$inferInsert {
    return {
      id: status.id.value,
      userId: status.userId.value,
      bookId: status.bookId.value,
      status: status.status,
      currentPage: status.progress.page,
      updatedAt: status.updatedAt.toISOString(),
    };
  },
};
