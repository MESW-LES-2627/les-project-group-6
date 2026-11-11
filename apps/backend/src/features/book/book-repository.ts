import { eq, ilike, inArray, or, sql, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { authors, bookAuthors, books } from '../../database/schema.js';
import { Book, BookId, BookTitle, Isbn13, PageCount } from './book.js';

export interface IBookRepository {
  findById(id: BookId): Promise<Book | null>;
  findByTitle(title: string): Promise<Book[]>;
  /**
   * F-EXP-01: books whose title or author looks like `query` (small typos,
   * missing accents) or whose ISBN starts with its digits, best match first.
   */
  search(query: string, limit: number): Promise<Book[]>;
  /** The books that exist among these ids, in no particular order. */
  findByIds(ids: readonly BookId[]): Promise<Book[]>;
  /** Up to `limit` books picked at random from the catalogue. */
  random(limit: number): Promise<Book[]>;
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

/** Below this length trigrams are unreliable, so only prefixes match. */
const TRIGRAM_MIN_LENGTH = 3;
/** pg_trgm's default (0.6) only just lets "hary poter" find "Harry Potter". */
const WORD_SIMILARITY_THRESHOLD = 0.5;

/**
 * The ISBN digits in `query` (hyphens and spaces removed), when it looks like a
 * whole or partly typed ISBN. Six digits minimum, so a year such as "1984" stays a title.
 */
export function isbnDigits(query: string): string | null {
  const digits = query.replace(/[\s-]/g, '');
  return /^\d{6,13}$/.test(digits) ? digits : null;
}

function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, '\\$&');
}

/** Lowercase and accent-free, the same expression as the trigram indexes (migration 0009). */
const folded = (value: SQL | AnyPgColumn): SQL => sql`f_unaccent(lower(${value}))`;

/** True when one of the book's authors satisfies `condition`. */
const anyAuthor = (condition: SQL): SQL =>
  sql`exists (select 1 from ${bookAuthors} join ${authors} on ${authors.id} = ${bookAuthors.authorId}
      where ${bookAuthors.bookId} = ${books.id} and ${condition})`;

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

  async search(query: string, limit: number): Promise<Book[]> {
    const text = query.trim();
    if (!text || limit <= 0) return [];

    const needle = folded(sql`${text}::text`);
    const prefix = sql`${folded(sql`${escapeLike(text)}::text`)} || '%'`;
    const title = folded(books.title);
    const authorName = folded(authors.name);
    const isbn = isbnDigits(text);
    const isbnMatch = isbn ? sql`${books.isbn13} like ${`${isbn}%`}` : null;
    const fuzzy = text.length >= TRIGRAM_MIN_LENGTH;

    const textMatch = fuzzy
      ? or(sql`${needle} <% ${title}`, anyAuthor(sql`${needle} <% ${authorName}`))
      : or(sql`${title} like ${prefix}`, anyAuthor(sql`${authorName} like ${prefix}`));
    const where = isbnMatch ? or(isbnMatch, textMatch) : textMatch;

    // Best first: ISBN, then a title starting with the query, then the closest title or author.
    const order: SQL[] = [];
    if (isbnMatch) order.push(sql`(${isbnMatch}) is true desc`);
    order.push(sql`(${title} like ${prefix}) desc`);
    if (fuzzy) {
      order.push(sql`greatest(
        word_similarity(${needle}, ${title}),
        coalesce((select max(word_similarity(${needle}, ${authorName}))
          from ${bookAuthors} join ${authors} on ${authors.id} = ${bookAuthors.authorId}
          where ${bookAuthors.bookId} = ${books.id}), 0)
      ) desc`);
    }
    order.push(sql`${books.title} asc`);

    return this.db.transaction(async (tx) => {
      // `<%` reads its threshold from this setting; `true` scopes it to this transaction.
      await tx.execute(
        sql`select set_config('pg_trgm.word_similarity_threshold', ${String(WORD_SIMILARITY_THRESHOLD)}, true)`,
      );
      const rows = await tx
        .select()
        .from(books)
        .where(where)
        .orderBy(...order)
        .limit(limit);
      return rows.map(toDomain);
    });
  }

  async findByIds(ids: readonly BookId[]): Promise<Book[]> {
    if (ids.length === 0) return [];
    const rows = await this.db
      .select()
      .from(books)
      .where(
        inArray(
          books.id,
          ids.map((id) => id.value),
        ),
      );
    return rows.map(toDomain);
  }

  async random(limit: number): Promise<Book[]> {
    if (limit <= 0) return [];
    const rows = await this.db
      .select()
      .from(books)
      .orderBy(sql`random()`)
      .limit(limit);
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
