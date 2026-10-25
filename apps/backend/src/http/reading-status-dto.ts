import type { ReadingStatus } from '../domain/reading/reading-status.js';
import type { ReadingStatusType } from '../domain/reading/reading-state.js';

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
