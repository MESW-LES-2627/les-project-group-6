import type { Book, BookId } from '../../src/features/book/book.js';
import type { IBookRepository } from '../../src/features/book/book-repository.js';
import type {
  ReadingStatus,
  ReadingStatusId,
} from '../../src/features/reading-status/reading-status.js';
import type { IReadingStatusRepository } from '../../src/features/reading-status/reading-status-repository.js';
import type { UserId } from '../../src/features/user/user.js';

// Test doubles that honour the repository contracts without a database.
export class InMemoryBookRepository implements IBookRepository {
  private readonly books = new Map<string, Book>();

  async findById(id: BookId): Promise<Book | null> {
    return this.books.get(id.value) ?? null;
  }

  async findByTitle(title: string): Promise<Book[]> {
    const query = title.toLowerCase();
    return [...this.books.values()].filter((b) => b.title.value.toLowerCase().includes(query));
  }

  async save(book: Book): Promise<void> {
    this.books.set(book.id.value, book);
  }

  async delete(id: BookId): Promise<boolean> {
    return this.books.delete(id.value);
  }
}

export class InMemoryReadingStatusRepository implements IReadingStatusRepository {
  private readonly entries = new Map<string, ReadingStatus>();

  async findById(id: ReadingStatusId): Promise<ReadingStatus | null> {
    return [...this.entries.values()].find((e) => e.id.equals(id)) ?? null;
  }

  async findByUserAndBook(userId: UserId, bookId: BookId): Promise<ReadingStatus | null> {
    return this.entries.get(`${userId.value}:${bookId.value}`) ?? null;
  }

  async save(entry: ReadingStatus): Promise<void> {
    this.entries.set(`${entry.userId.value}:${entry.bookId.value}`, entry);
  }
}
