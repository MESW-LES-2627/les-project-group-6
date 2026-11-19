import { and, eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  books,
  bookTags,
  listBooks,
  lists,
  readingStatus,
  userTags,
} from '../../database/schema.js';
import { authorNamesByBook } from '../book/book-authors-query.js';
import type { ReadingStatusType } from '../reading-status/reading-state.js';
import type { UserId } from '../user/user.js';

// Read side (CQRS): the library screen joins reading statuses with books, which
// does not fit one aggregate, so it is served by a query that returns plain views.
export interface LibraryBookView {
  id: string;
  title: string;
  authors: string[];
  description: string | null;
  isbn13: string | null;
  pageCount: number | null;
  coverUrl: string | null;
  isCommunityAdded: boolean;
  createdAt: string;
}

export interface LibraryItemView {
  id: string;
  book: LibraryBookView;
  status: ReadingStatusType;
  currentPage: number;
  startedOn: string | null;
  finishedOn: string | null;
  updatedAt: string;
  /** The reader's folders that hold this book; a book can be in several. */
  folderIds: string[];
  /** The reader's own tags on this book. */
  tagIds: string[];
}

export interface LibraryQuery {
  forUser(userId: UserId, status?: ReadingStatusType): Promise<LibraryItemView[]>;
}

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
        startedOn: readingStatus.startedOn,
        finishedOn: readingStatus.finishedOn,
        updatedAt: readingStatus.updatedAt,
        book: books,
      })
      .from(readingStatus)
      .innerJoin(books, eq(readingStatus.bookId, books.id))
      .where(and(...conditions));

    const bookIds = rows.map((row) => row.book.id);
    const folderIdsByBook = await this.folderIdsByBook(userId, bookIds);
    const tagIdsByBook = await this.tagIdsByBook(userId, bookIds);
    const authorsByBook = await authorNamesByBook(this.db, bookIds);

    return rows.map((row) => ({
      id: row.id,
      book: {
        id: row.book.id,
        title: row.book.title,
        authors: authorsByBook.get(row.book.id) ?? [],
        description: row.book.description,
        isbn13: row.book.isbn13,
        pageCount: row.book.pageCount,
        coverUrl: row.book.coverUrl,
        isCommunityAdded: row.book.isCommunityAdded,
        createdAt: new Date(row.book.createdAt).toISOString(),
      },
      status: row.status as ReadingStatusType,
      currentPage: row.currentPage,
      startedOn: row.startedOn ?? null,
      finishedOn: row.finishedOn ?? null,
      updatedAt: new Date(row.updatedAt).toISOString(),
      folderIds: folderIdsByBook.get(row.book.id) ?? [],
      tagIds: tagIdsByBook.get(row.book.id) ?? [],
    }));
  }

  /** Only the reader's own folders count; group lists are never exposed here. */
  private async folderIdsByBook(
    userId: UserId,
    bookIds: readonly string[],
  ): Promise<Map<string, string[]>> {
    const byBook = new Map<string, string[]>();
    if (bookIds.length === 0) return byBook;

    const memberships = await this.db
      .select({ folderId: listBooks.listId, bookId: listBooks.bookId })
      .from(listBooks)
      .innerJoin(lists, eq(listBooks.listId, lists.id))
      .where(and(eq(lists.userId, userId.value), inArray(listBooks.bookId, [...bookIds])))
      .orderBy(lists.name);

    for (const membership of memberships) {
      const ids = byBook.get(membership.bookId) ?? [];
      ids.push(membership.folderId);
      byBook.set(membership.bookId, ids);
    }
    return byBook;
  }

  private async tagIdsByBook(
    userId: UserId,
    bookIds: readonly string[],
  ): Promise<Map<string, string[]>> {
    const byBook = new Map<string, string[]>();
    if (bookIds.length === 0) return byBook;

    const rows = await this.db
      .select({ tagId: bookTags.tagId, bookId: bookTags.bookId })
      .from(bookTags)
      .innerJoin(userTags, eq(bookTags.tagId, userTags.id))
      .where(and(eq(userTags.userId, userId.value), inArray(bookTags.bookId, [...bookIds])))
      .orderBy(userTags.name);

    for (const row of rows) {
      const ids = byBook.get(row.bookId) ?? [];
      ids.push(row.tagId);
      byBook.set(row.bookId, ids);
    }
    return byBook;
  }
}
