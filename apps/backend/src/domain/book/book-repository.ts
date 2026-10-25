import type { Book } from './book.js';
import type { BookId } from './book-id.js';

export interface IBookRepository {
  findById(id: BookId): Promise<Book | null>;
  findByTitle(title: string): Promise<Book[]>;
  save(book: Book): Promise<void>;
  delete(id: BookId): Promise<boolean>;
}
