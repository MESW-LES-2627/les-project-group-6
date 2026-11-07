import { InvalidIdError } from '../../utils/uuid.js';
import { NotFoundError } from '../../utils/errors.js';
import { Book, BookId, type NewBookProps } from './book.js';
import type { IBookRepository } from './book-repository.js';

// Application service: one method per use case on the book catalogue.
export class BookService {
  constructor(private readonly books: IBookRepository) {}

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

  search(title: string): Promise<Book[]> {
    return this.books.findByTitle(title.trim());
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
