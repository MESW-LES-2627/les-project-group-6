import type { Book } from '../../domain/book/book.js';
import { BookId } from '../../domain/book/book-id.js';
import type { IBookRepository } from '../../domain/book/book-repository.js';
import { NotFoundError } from '../../domain/shared/domain-error.js';
import { InvalidIdError } from '../../domain/shared/uuid.js';

export class GetBookUseCase {
  constructor(private readonly books: IBookRepository) {}

  async execute(rawId: unknown): Promise<Book> {
    const book = await this.books.findById(GetBookUseCase.parseId(rawId));
    if (!book) throw new NotFoundError('Book');
    return book;
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
