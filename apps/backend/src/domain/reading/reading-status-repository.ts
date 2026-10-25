import type { BookId } from '../book/book-id.js';
import type { UserId } from '../user/user-id.js';
import type { ReadingStatus } from './reading-status.js';
import type { ReadingStatusId } from './reading-status-id.js';

export interface IReadingStatusRepository {
  findById(id: ReadingStatusId): Promise<ReadingStatus | null>;
  findByUserAndBook(userId: UserId, bookId: BookId): Promise<ReadingStatus | null>;
  save(status: ReadingStatus): Promise<void>;
}
