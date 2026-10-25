import { BookId } from '../../domain/book/book-id.js';
import type { IBookRepository } from '../../domain/book/book-repository.js';
import { ReadingState } from '../../domain/reading/reading-state.js';
import { ReadingStatus } from '../../domain/reading/reading-status.js';
import type { IReadingStatusRepository } from '../../domain/reading/reading-status-repository.js';
import { NotFoundError } from '../../domain/shared/domain-error.js';
import { UserId } from '../../domain/user/user-id.js';

export interface SetReadingStatusCommand {
  userId: unknown;
  bookId: unknown;
  status: unknown;
  currentPage?: unknown;
}

// Sets the reader's status for a book, adding the book to their library if needed.
export class SetReadingStatusUseCase {
  constructor(
    private readonly readingStatuses: IReadingStatusRepository,
    private readonly books: IBookRepository,
  ) {}

  async execute(command: SetReadingStatusCommand): Promise<ReadingStatus> {
    const userId = UserId.of(command.userId);
    const bookId = BookId.of(command.bookId);
    const target = ReadingState.of(command.status).type;

    const book = await this.books.findById(bookId);
    if (!book) throw new NotFoundError('Book');

    const status =
      (await this.readingStatuses.findByUserAndBook(userId, bookId)) ??
      ReadingStatus.create(userId, bookId);

    status.changeStatus(target, book.pageCount);
    // The whole entry is replaced: the page only applies while the status tracks progress.
    if (command.currentPage !== undefined && status.tracksProgress) {
      status.updateProgress(book.progressAt(command.currentPage));
    }

    await this.readingStatuses.save(status);
    return status;
  }
}
