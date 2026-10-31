import { eq, ilike } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { books } from '../../database/schema.js';
import { Book, BookId, BookTitle, Isbn13, PageCount } from './book.js';

export interface IBookRepository {
  findById(id: BookId): Promise<Book | null>;
  findByTitle(title: string): Promise<Book[]>;
  save(book: Book): Promise<void>;
  delete(id: BookId): Promise<boolean>;
}

type BookRow = typeof books.$inferSelect;

// Data Mapper: the only place that knows both the books row and the Book entity.
function toDomain(row: BookRow): Book {
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
}

function toRow(book: Book): typeof books.$inferInsert {
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
}

export class DrizzleBookRepository implements IBookRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async findById(id: BookId): Promise<Book | null> {
    const rows = await this.db.select().from(books).where(eq(books.id, id.value)).limit(1);
    const row = rows[0];
    return row ? toDomain(row) : null;
  }

  async findByTitle(title: string): Promise<Book[]> {
    const rows = await this.db
      .select()
      .from(books)
      .where(ilike(books.title, `%${title}%`));
    return rows.map(toDomain);
  }

  async save(book: Book): Promise<void> {
    const row = toRow(book);
    await this.db
      .insert(books)
      .values(row)
      .onConflictDoUpdate({
        target: books.id,
        set: {
          title: row.title,
          description: row.description,
          isbn13: row.isbn13,
          pageCount: row.pageCount,
          coverUrl: row.coverUrl,
          isCommunityAdded: row.isCommunityAdded,
        },
      });
  }

  async delete(id: BookId): Promise<boolean> {
    const deleted = await this.db
      .delete(books)
      .where(eq(books.id, id.value))
      .returning({ id: books.id });
    return deleted.length > 0;
  }
}
