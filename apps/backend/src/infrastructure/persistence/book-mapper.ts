import { Book } from '../../domain/book/book.js';
import { BookId } from '../../domain/book/book-id.js';
import { BookTitle } from '../../domain/book/book-title.js';
import { Isbn13 } from '../../domain/book/isbn13.js';
import { PageCount } from '../../domain/book/page-count.js';
import type { books } from '../database/schema.js';

// Data Mapper: the only place that knows both the books row and the Book entity.
export const BookMapper = {
  toDomain(row: typeof books.$inferSelect): Book {
    return Book.reconstitute({
      id: BookId.of(row.id),
      title: BookTitle.of(row.title),
      description: row.description,
      isbn13: row.isbn13 ? Isbn13.of(row.isbn13) : null,
      pageCount: row.pageCount != null ? PageCount.of(row.pageCount) : null,
      coverUrl: row.coverUrl,
      isCommunityAdded: row.isCommunityAdded,
      createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
    });
  },

  toPersistence(book: Book): typeof books.$inferInsert {
    return {
      id: book.id.value,
      title: book.title.value,
      description: book.description,
      isbn13: book.isbn13?.value ?? null,
      pageCount: book.pageCount?.value ?? null,
      coverUrl: book.coverUrl,
      isCommunityAdded: book.isCommunityAdded,
      createdAt: book.createdAt.toISOString(),
    };
  },
};
