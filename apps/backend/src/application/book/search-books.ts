import type { Book } from '../../domain/book/book.js';
import type { IBookRepository } from '../../domain/book/book-repository.js';

export class SearchBooksUseCase {
  constructor(private readonly books: IBookRepository) {}

  execute(title: string): Promise<Book[]> {
    return this.books.findByTitle(title.trim());
  }
}
