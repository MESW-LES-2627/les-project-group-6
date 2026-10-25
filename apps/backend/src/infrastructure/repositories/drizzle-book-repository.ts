import { eq, ilike } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Book, type IBookRepository } from '../../domain/book.js';
import { books } from '../database/schema.js';

export class DrizzleBookRepository implements IBookRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async findById(id: string): Promise<Book | null> {
    const rows = await this.db.select().from(books).where(eq(books.id, id)).limit(1);
    const row = rows[0];
    if (!row) return null;
    return this.mapToDomain(row);
  }

  async findByTitle(title: string): Promise<Book[]> {
    const rows = await this.db
      .select()
      .from(books)
      .where(ilike(books.title, `%${title}%`));
    return rows.map((row) => this.mapToDomain(row));
  }

  async save(book: Book): Promise<void> {
    await this.db
      .insert(books)
      .values({
        id: book.id,
        title: book.title,
        description: book.description,
        isbn13: book.isbn13,
        pageCount: book.pageCount,
        coverUrl: book.coverUrl,
        isCommunityAdded: book.isCommunityAdded,
        createdAt: book.createdAt.toISOString(),
      })
      .onConflictDoUpdate({
        target: books.id,
        set: {
          title: book.title,
          description: book.description,
          isbn13: book.isbn13,
          pageCount: book.pageCount,
          coverUrl: book.coverUrl,
          isCommunityAdded: book.isCommunityAdded,
        },
      });
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.db.delete(books).where(eq(books.id, id)).returning({ id: books.id });
    return deleted.length > 0;
  }

  private mapToDomain(row: typeof books.$inferSelect): Book {
    return new Book({
      id: row.id,
      title: row.title,
      description: row.description,
      isbn13: row.isbn13,
      pageCount: row.pageCount,
      coverUrl: row.coverUrl,
      isCommunityAdded: row.isCommunityAdded,
      createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
    });
  }
}
