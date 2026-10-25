import { eq, ilike, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { book } from '../../database/schema.js';
import { Book, BookId, BookTitle, Isbn13, PageCount } from './book.js';

export interface IBookRepository {
  findById(id: BookId): Promise<Book | null>;
  findByTitle(title: string): Promise<Book[]>;
  save(book: Book): Promise<void>;
  delete(id: BookId): Promise<boolean>;
}

type BookRow = typeof book.$inferSelect;

// Data Mapper: the only place that knows both the book row and the Book entity.
function toDomain(row: BookRow): Book {
  return Book.reconstitute({
    id: BookId.of(row.id),
    title: BookTitle.of(row.title),
    description: row.description,
    isbn13: row.isbn13 ? Isbn13.of(row.isbn13) : null,
    pageCount: row.pageCount != null ? PageCount.of(row.pageCount) : null,
    coverUrl: row.coverUrl,
    isCommunityAdded: row.isCommunityAdded,
    createdAt: new Date(row.createdAt),
  });
}

function toRow(entity: Book): typeof book.$inferInsert {
  return {
    id: entity.id.value,
    title: entity.title.value,
    description: entity.description,
    isbn13: entity.isbn13?.value ?? null,
    pageCount: entity.pageCount?.value ?? null,
    coverUrl: entity.coverUrl,
    isCommunityAdded: entity.isCommunityAdded,
    createdAt: entity.createdAt.toISOString(),
  };
}

export class DrizzleBookRepository implements IBookRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async findById(id: BookId): Promise<Book | null> {
    const rows = await this.db.select().from(book).where(eq(book.id, id.value)).limit(1);
    const row = rows[0];
    return row ? toDomain(row) : null;
  }

  async findByTitle(title: string): Promise<Book[]> {
    const rows = await this.db
      .select()
      .from(book)
      .where(ilike(book.title, `%${title}%`));
    return rows.map(toDomain);
  }

  async save(entity: Book): Promise<void> {
    const row = toRow(entity);
    await this.db
      .insert(book)
      .values(row)
      .onConflictDoUpdate({
        target: book.id,
        set: {
          title: row.title,
          description: row.description,
          isbn13: row.isbn13,
          pageCount: row.pageCount,
          coverUrl: row.coverUrl,
          isCommunityAdded: row.isCommunityAdded,
          updatedAt: sql`CURRENT_TIMESTAMP`,
        },
      });
  }

  async delete(id: BookId): Promise<boolean> {
    const deleted = await this.db
      .delete(book)
      .where(eq(book.id, id.value))
      .returning({ id: book.id });
    return deleted.length > 0;
  }
}
