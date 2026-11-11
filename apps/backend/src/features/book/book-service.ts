import { InvalidIdError } from '../../utils/uuid.js';
import { InvalidValueError, NotFoundError } from '../../utils/errors.js';
import { Book, BookId, Isbn13, type NewBookProps } from './book.js';
import type { IBookRepository } from './book-repository.js';
import type { BookCatalog, CatalogBook } from './book-catalog.js';

/** F-EXP-01: how many books one search returns. */
export const SEARCH_LIMIT = 20;
/** Below this many local results, the outside catalogue is asked too. */
export const CATALOG_FALLBACK_BELOW = 5;
const MAX_QUERY_LENGTH = 100;

// Application service: one method per use case on the book catalogue.
export class BookService {
  // Without a catalogue (tests, local work offline) search stays local only.
  constructor(
    private readonly books: IBookRepository,
    private readonly catalog?: BookCatalog,
  ) {}

  async register(props: NewBookProps): Promise<Book> {
    const book = Book.create(props);
    await this.books.save(book);
    return book;
  }

  async get(rawId: unknown): Promise<Book> {
    const book = await this.books.findById(BookService.parseId(rawId));
    if (!book) throw new NotFoundError('Book');
    return book;
  }

  // F-EXP-01: blank text is not an error, just no results. Local books come first;
  // when there are few, books from the catalogue are imported and added after them.
  async search(raw: string): Promise<Book[]> {
    const query = raw.trim().slice(0, MAX_QUERY_LENGTH);
    if (!query) return [];
    const local = await this.books.search(query, SEARCH_LIMIT);
    if (!this.catalog || local.length >= CATALOG_FALLBACK_BELOW) return local;

    const results = [...local];
    const seen = new Set(local.flatMap((b) => (b.isbn13 ? [b.isbn13.value] : [])));
    const found = (await this.catalog.search(query, SEARCH_LIMIT)).flatMap((hit) => {
      const isbn = BookService.parseIsbn(hit.isbn13);
      return isbn ? [{ hit, isbn }] : [];
    });
    const existing = new Map(
      (await this.books.findByIsbns(found.map((f) => f.isbn))).flatMap((b) =>
        b.isbn13 ? [[b.isbn13.value, b] as const] : [],
      ),
    );
    for (const { hit, isbn } of found) {
      if (results.length >= SEARCH_LIMIT) break;
      if (seen.has(isbn.value)) continue;
      const book = existing.get(isbn.value) ?? (await this.importBook(hit));
      if (!book || results.some((b) => b.id.equals(book.id))) continue;
      seen.add(isbn.value);
      results.push(book);
    }
    return results;
  }

  private async importBook(found: CatalogBook): Promise<Book | null> {
    try {
      const book = Book.create({
        title: found.title,
        description: found.description,
        isbn13: found.isbn13,
        pageCount: found.pageCount,
        coverUrl: found.coverUrl,
        isCommunityAdded: false,
      });
      return await this.books.saveWithAuthors(book, found.authors);
    } catch (error) {
      // One bad record from the catalogue must not break the search.
      if (error instanceof InvalidValueError) return null;
      throw error;
    }
  }

  private static parseIsbn(raw: string): Isbn13 | null {
    try {
      return Isbn13.of(raw);
    } catch (error) {
      if (error instanceof InvalidValueError) return null;
      throw error;
    }
  }

  // A malformed id can never match a book, so it is reported as not found.
  private static parseId(rawId: unknown): BookId {
    try {
      return BookId.of(rawId);
    } catch (error) {
      if (error instanceof InvalidIdError) throw new NotFoundError('Book');
      throw error;
    }
  }
}
