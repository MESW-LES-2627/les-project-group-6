import { eq, ilike } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Book } from '../../domain/book/book.js';
import type { BookId } from '../../domain/book/book-id.js';
import type { IBookRepository } from '../../domain/book/book-repository.js';
import { books } from '../database/schema.js';
import { BookMapper } from '../persistence/book-mapper.js';

export class DrizzleBookRepository implements IBookRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async findById(id: BookId): Promise<Book | null> {
    const rows = await this.db.select().from(books).where(eq(books.id, id.value)).limit(1);
    const row = rows[0];
    return row ? BookMapper.toDomain(row) : null;
  }

  async findByTitle(title: string): Promise<Book[]> {
    const rows = await this.db
      .select()
      .from(books)
      .where(ilike(books.title, `%${title}%`));
    return rows.map(BookMapper.toDomain);
  }

  async save(book: Book): Promise<void> {
    const row = BookMapper.toPersistence(book);
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
