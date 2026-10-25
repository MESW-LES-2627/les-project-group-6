import { BookId } from '../../domain/book/book-id.js';
import type { IBookRepository } from '../../domain/book/book-repository.js';
import { NotFoundError } from '../../domain/shared/domain-error.js';

export class RemoveBookUseCase {
  constructor(private readonly books: IBookRepository) {}

  async execute(rawId: unknown): Promise<void> {
    const deleted = await this.books.delete(BookId.of(rawId));
    if (!deleted) throw new NotFoundError('Book');
  }
}
