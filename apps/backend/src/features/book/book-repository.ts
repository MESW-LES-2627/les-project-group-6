import { eq, inArray, sql, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { authors, bookAuthors, books } from '../../database/schema.js';
import { Book, BookId, BookTitle, Isbn13, PageCount } from './book.js';

export interface IBookRepository {
  findById(id: BookId): Promise<Book | null>;
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

function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, '\\$&');
}

/**
 * The smallest digit string above every string starting with `prefix`, or null when it is
 * all 9s ('97804411' -> '97804412', '9799' -> '98'). A range on it can use the isbn13 btree,
 * which a LIKE prefix cannot under a non-C collation.
 */
function nextPrefix(prefix: string): string | null {
  const last = prefix.search(/[0-8]9*$/);
  if (last < 0) return null;
  return prefix.slice(0, last) + String(Number(prefix[last]) + 1);
}

/** Books whose ISBN starts with `prefix`. */
function isbnStartsWith(prefix: string): SQL {
  const upper = nextPrefix(prefix);
  return upper
    ? sql`(${books.isbn13} >= ${prefix} and ${books.isbn13} < ${upper})`
    : sql`${books.isbn13} >= ${prefix}`;
}

/** Lowercase and accent-free, the same expression as the trigram indexes (migration 0009). */
const folded = (value: SQL | AnyPgColumn): SQL => sql`f_unaccent(lower(${value}))`;

export class DrizzleBookRepository implements IBookRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async findById(id: BookId): Promise<Book | null> {
    const rows = await this.db.select().from(books).where(eq(books.id, id.value)).limit(1);
    const row = rows[0];
    return row ? toDomain(row) : null;
  }

  async search(query: string, limit: number): Promise<Book[]> {
    const text = query.trim();
    if (!text || limit <= 0) return [];

    const needle = folded(sql`${text}::text`);
    const prefix = sql`${folded(sql`${escapeLike(text)}::text`)} || '%'`;
    const title = folded(books.title);
    const authorName = folded(authors.name);
    const isbn = Isbn13.prefixFrom(text);
    const isbnMatch = isbn ? isbnStartsWith(isbn) : null;
    const fuzzy = text.length >= TRIGRAM_MIN_LENGTH;

    // Short queries match the start of a title, or the start of any word of an author's name
    // (so "sa" finds "José Saramago").
    const authorPrefix = sql`${authorName} like ${prefix} or ${authorName} like '% ' || ${prefix}`;
    // One indexed lookup per branch (trigram GIN on titles and author names, btree on isbn13),
    // unioned into ids; a single OR across them would force a sequential scan of books.
    const branches: SQL[] = [
      sql`select ${books.id} from ${books}
          where ${fuzzy ? sql`${needle} <% ${title}` : sql`${title} like ${prefix}`}`,
      sql`select ${bookAuthors.bookId} from ${bookAuthors}
          join ${authors} on ${authors.id} = ${bookAuthors.authorId}
          where ${fuzzy ? sql`${needle} <% ${authorName}` : authorPrefix}`,
    ];
    if (isbnMatch) branches.push(sql`select ${books.id} from ${books} where ${isbnMatch}`);
    const where = sql`${books.id} in (${sql.join(branches, sql` union `)})`;

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
      // If this repository is ever handed an outer transaction, the setting persists for all of it.
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
