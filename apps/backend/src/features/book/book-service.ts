import { InvalidIdError } from '../../utils/uuid.js';
import { NotFoundError } from '../../utils/errors.js';
import { Book, BookId, type NewBookProps } from './book.js';
import type { IBookRepository } from './book-repository.js';
import type { OpenLibraryService } from './open-library-service.js';

// Application service: one method per use case on the book catalogue.
export class BookService {
  constructor(
    private readonly books: IBookRepository,
    private readonly openLibrary?: OpenLibraryService,
  ) {}

  async register(props: NewBookProps, authorName?: string | null): Promise<Book> {
    const book = Book.create(props);
    await this.books.save(book, authorName);
    return book;
  }

  async get(rawId: unknown): Promise<Book> {
    const book = await this.books.findById(BookService.parseId(rawId));
    if (!book) throw new NotFoundError('Book');
    return book;
  }

  search(title: string): Promise<Book[]> {
    return this.books.findByTitle(title.trim());
  }

  async remove(rawId: unknown): Promise<void> {
    const deleted = await this.books.delete(BookId.of(rawId));
    if (!deleted) throw new NotFoundError('Book');
  }

  async importFromOpenLibrary(query?: string): Promise<Book[]> {
    if (!this.openLibrary) return [];

    const items = await this.openLibrary.search(query, 5);
    const results: Book[] = [];

    for (const item of items) {
      const existing = await this.books.findByTitleAndAuthor(item.title, item.authorName);
      if (existing) {
        results.push(existing);
        continue;
      }

      try {
        const book = Book.create({
          title: item.title,
          description: item.description,
          isbn13: item.isbn13,
          pageCount: item.pageCount,
          coverUrl: item.coverUrl,
          isCommunityAdded: false,
        });
        await this.books.save(book, item.authorName);
        results.push(book);
      } catch {
        const fallback = Book.create({
          title: item.title,
          description: item.description,
          pageCount: item.pageCount,
          coverUrl: item.coverUrl,
          isCommunityAdded: false,
        });
        await this.books.save(fallback, item.authorName);
        results.push(fallback);
      }
    }

    return results;
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
