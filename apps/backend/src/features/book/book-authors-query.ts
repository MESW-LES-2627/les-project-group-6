import { asc, eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { authors, bookAuthors } from '../../database/schema.js';

type Executor = Pick<NodePgDatabase, 'select'>;

/**
 * The author names of each of these books, in one query. book_authors keeps no order,
 * so names come alphabetically; a book without authors is missing from the map.
 */
export async function authorNamesByBook(
  db: Executor,
  bookIds: readonly string[],
): Promise<Map<string, string[]>> {
  const byBook = new Map<string, string[]>();
  if (bookIds.length === 0) return byBook;
  const links = await db
    .select({ bookId: bookAuthors.bookId, name: authors.name })
    .from(bookAuthors)
    .innerJoin(authors, eq(authors.id, bookAuthors.authorId))
    .where(inArray(bookAuthors.bookId, [...new Set(bookIds)]))
    .orderBy(asc(authors.name));
  for (const { bookId, name } of links) {
    byBook.set(bookId, [...(byBook.get(bookId) ?? []), name]);
  }
  return byBook;
}
