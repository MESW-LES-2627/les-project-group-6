import { Book, type NewBookProps } from '../../domain/book/book.js';
import type { IBookRepository } from '../../domain/book/book-repository.js';

export class RegisterBookUseCase {
  constructor(private readonly books: IBookRepository) {}

  async execute(command: NewBookProps): Promise<Book> {
    const book = Book.create(command);
    await this.books.save(book);
    return book;
  }
}
