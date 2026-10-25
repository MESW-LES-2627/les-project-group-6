import { BookId } from '../../domain/book/book-id.js';
import type { IBookRepository } from '../../domain/book/book-repository.js';
import { ReadingState } from '../../domain/reading/reading-state.js';
import type { ReadingStatus } from '../../domain/reading/reading-status.js';
import { ReadingStatusId } from '../../domain/reading/reading-status-id.js';
import type { IReadingStatusRepository } from '../../domain/reading/reading-status-repository.js';
import { InvalidValueError, NotFoundError } from '../../domain/shared/domain-error.js';
import { UserId } from '../../domain/user/user-id.js';

export interface UpdateReadingStatusCommand {
  id?: unknown;
  userId?: unknown;
  bookId?: unknown;
  status?: unknown;
  currentPage?: unknown;
}

// Changes the status and/or page of an existing entry in the reader's library.
export class UpdateReadingStatusUseCase {
  constructor(
    private readonly readingStatuses: IReadingStatusRepository,
    private readonly books: IBookRepository,
  ) {}

  async execute(command: UpdateReadingStatusCommand): Promise<ReadingStatus> {
    const status = await this.findEntry(command);
    if (!status) throw new NotFoundError('Reading status');

    const book = await this.books.findById(status.bookId);
    if (!book) throw new NotFoundError('Book');

    if (command.status !== undefined) {
      status.changeStatus(ReadingState.of(command.status).type, book.pageCount);
    }
    if (command.currentPage !== undefined) {
      status.updateProgress(book.progressAt(command.currentPage));
    }

    await this.readingStatuses.save(status);
    return status;
  }

  private findEntry(command: UpdateReadingStatusCommand): Promise<ReadingStatus | null> {
    if (command.id) {
      return this.readingStatuses.findById(ReadingStatusId.of(command.id));
    }
    if (command.userId && command.bookId) {
      return this.readingStatuses.findByUserAndBook(
        UserId.of(command.userId),
        BookId.of(command.bookId),
      );
    }
    throw new InvalidValueError('Reading status ID or userId and bookId are required');
  }
}
