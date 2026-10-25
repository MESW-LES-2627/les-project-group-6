import type { ReadingStatusType } from './reading-state.js';
import type { ReadingStatus } from './reading-status.js';

// Shape of a reading status on the wire. Keeps value objects out of the JSON contract.
export interface ReadingStatusDto {
  id: string;
  userId: string;
  bookId: string;
  status: ReadingStatusType;
  currentPage: number;
  updatedAt: string;
}

export function toReadingStatusDto(status: ReadingStatus): ReadingStatusDto {
  return {
    id: status.id.value,
    userId: status.userId.value,
    bookId: status.bookId.value,
    status: status.status,
    currentPage: status.progress.page,
    updatedAt: status.updatedAt.toISOString(),
  };
}
