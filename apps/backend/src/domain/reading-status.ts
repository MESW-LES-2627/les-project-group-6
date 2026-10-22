import crypto from 'node:crypto';
import type { Book } from './book.js';

export type ReadingStatusType = 'not-started' | 'in-progress' | 'finished' | 'did-not-finish';

export interface ReadingStatusProps {
  id?: string;
  userId: string;
  bookId: string;
  status: ReadingStatusType;
  currentPage?: number;
  updatedAt?: Date;
}

export class ReadingStatus {
  readonly id: string;
  readonly userId: string;
  readonly bookId: string;
  readonly status: ReadingStatusType;
  readonly currentPage: number;
  readonly updatedAt: Date;

  constructor(props: ReadingStatusProps) {
    this.id = props.id ?? crypto.randomUUID();
    this.userId = props.userId;
    this.bookId = props.bookId;
    this.status = props.status;
    this.currentPage = props.currentPage ?? 0;
    this.updatedAt = props.updatedAt ?? new Date();
  }
}

export interface UserLibraryItem {
  book: Book;
  status: ReadingStatusType;
  currentPage: number;
  updatedAt: Date;
}

export interface IReadingStatusRepository {
  findByUserAndBook(userId: string, bookId: string): Promise<ReadingStatus | null>;
  save(entry: ReadingStatus): Promise<void>;
  findUserLibrary(userId: string, statusFilter?: ReadingStatusType): Promise<UserLibraryItem[]>;
}
