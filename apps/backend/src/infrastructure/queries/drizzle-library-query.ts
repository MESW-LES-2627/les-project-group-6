import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { LibraryItemView, LibraryQuery } from '../../application/library/library-query.js';
import type { ReadingStatusType } from '../../domain/reading/reading-state.js';
import type { UserId } from '../../domain/user/user-id.js';
import { books, readingStatus } from '../database/schema.js';

export class DrizzleLibraryQuery implements LibraryQuery {
  constructor(private readonly db: NodePgDatabase) {}

  async forUser(userId: UserId, status?: ReadingStatusType): Promise<LibraryItemView[]> {
    const conditions = [eq(readingStatus.userId, userId.value)];
    if (status) conditions.push(eq(readingStatus.status, status));

    const rows = await this.db
      .select({
        id: readingStatus.id,
        status: readingStatus.status,
        currentPage: readingStatus.currentPage,
        updatedAt: readingStatus.updatedAt,
        book: books,
      })
      .from(readingStatus)
      .innerJoin(books, eq(readingStatus.bookId, books.id))
      .where(and(...conditions));

    return rows.map((row) => ({
      id: row.id,
      book: {
        id: row.book.id,
        title: row.book.title,
        description: row.book.description,
        isbn13: row.book.isbn13,
        pageCount: row.book.pageCount,
        coverUrl: row.book.coverUrl,
        isCommunityAdded: row.book.isCommunityAdded,
        createdAt: new Date(row.book.createdAt).toISOString(),
      },
      status: row.status as ReadingStatusType,
      currentPage: row.currentPage,
      updatedAt: new Date(row.updatedAt).toISOString(),
    }));
  }
}
