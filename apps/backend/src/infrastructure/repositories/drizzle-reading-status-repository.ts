import { eq, and } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  ReadingStatus,
  type IReadingStatusRepository,
  type ReadingStatusType,
  type UserLibraryItem,
} from '../../domain/reading-status.js';
import { Book } from '../../domain/book.js';
import * as schema from '../database/schema.js';
import { readingStatus, books } from '../database/schema.js';

export class DrizzleReadingStatusRepository implements IReadingStatusRepository {
  constructor(private readonly db: NodePgDatabase<typeof schema>) {}

  async findById(id: string): Promise<ReadingStatus | null> {
    const rows = await this.db
      .select()
      .from(readingStatus)
      .where(eq(readingStatus.id, id))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return this.mapToDomain(row);
  }

  async findByUserAndBook(userId: string, bookId: string): Promise<ReadingStatus | null> {
    const rows = await this.db
      .select()
      .from(readingStatus)
      .where(and(eq(readingStatus.userId, userId), eq(readingStatus.bookId, bookId)))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    return this.mapToDomain(row);
  }

  async save(entry: ReadingStatus): Promise<void> {
    const existing = await this.findByUserAndBook(entry.userId, entry.bookId);

    if (existing) {
      await this.db
        .update(readingStatus)
        .set({
          status: entry.status,
          currentPage: entry.currentPage,
          updatedAt: entry.updatedAt.toISOString(),
        })
        .where(eq(readingStatus.id, existing.id));
    } else {
      await this.db.insert(readingStatus).values({
        id: entry.id,
        userId: entry.userId,
        bookId: entry.bookId,
        status: entry.status,
        currentPage: entry.currentPage,
        updatedAt: entry.updatedAt.toISOString(),
      });
    }
  }

  async update(
    target: string | ReadingStatus,
    updated?: ReadingStatus,
  ): Promise<ReadingStatus | null> {
    let existingId: string;
    let entryToApply: ReadingStatus;

    if (updated) {
      existingId = typeof target === 'string' ? target : target.id;
      entryToApply = updated;
    } else {
      entryToApply = target as ReadingStatus;
      existingId = entryToApply.id;
    }

    let existing = await this.findById(existingId);
    if (!existing && entryToApply.userId && entryToApply.bookId) {
      existing = await this.findByUserAndBook(entryToApply.userId, entryToApply.bookId);
    }
    if (!existing) {
      return null;
    }

    const updatedStatus = entryToApply.status ?? existing.status;
    const updatedPage =
      entryToApply.currentPage !== undefined ? entryToApply.currentPage : existing.currentPage;
    const updatedDate = entryToApply.updatedAt ?? new Date();

    await this.db
      .update(readingStatus)
      .set({
        status: updatedStatus,
        currentPage: updatedPage,
        updatedAt: updatedDate.toISOString(),
      })
      .where(eq(readingStatus.id, existing.id));

    return new ReadingStatus({
      id: existing.id,
      userId: existing.userId,
      bookId: existing.bookId,
      status: updatedStatus,
      currentPage: updatedPage,
      updatedAt: updatedDate,
    });
  }

  async findUserLibrary(
    userId: string,
    statusFilter?: ReadingStatusType,
  ): Promise<UserLibraryItem[]> {
    const conditions = [eq(readingStatus.userId, userId)];
    if (statusFilter) {
      conditions.push(eq(readingStatus.status, statusFilter));
    }

    const rows = await this.db
      .select({
        statusId: readingStatus.id,
        userId: readingStatus.userId,
        bookId: readingStatus.bookId,
        status: readingStatus.status,
        currentPage: readingStatus.currentPage,
        statusUpdatedAt: readingStatus.updatedAt,
        book: books,
      })
      .from(readingStatus)
      .innerJoin(books, eq(readingStatus.bookId, books.id))
      .where(and(...conditions));

    return rows.map((row) => ({
      id: row.statusId,
      book: new Book({
        id: row.book.id,
        title: row.book.title,
        description: row.book.description,
        isbn13: row.book.isbn13,
        pageCount: row.book.pageCount,
        coverUrl: row.book.coverUrl,
        isCommunityAdded: row.book.isCommunityAdded,
        createdAt: row.book.createdAt ? new Date(row.book.createdAt) : new Date(),
      }),
      status: row.status as ReadingStatusType,
      currentPage: row.currentPage,
      updatedAt: new Date(row.statusUpdatedAt),
    }));
  }

  private mapToDomain(row: typeof readingStatus.$inferSelect): ReadingStatus {
    return new ReadingStatus({
      id: row.id,
      userId: row.userId,
      bookId: row.bookId,
      status: row.status as ReadingStatusType,
      currentPage: row.currentPage,
      updatedAt: row.updatedAt ? new Date(row.updatedAt) : new Date(),
    });
  }
}
