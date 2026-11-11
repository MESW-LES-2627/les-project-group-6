import { InvalidValueError, NotFoundError } from '../../utils/errors.js';
import { BookId } from '../book/book.js';
import type { IBookRepository } from '../book/book-repository.js';
import { UserId } from '../user/user.js';
import { ReadingState } from './reading-state.js';
import { ReadingStatus, ReadingStatusId } from './reading-status.js';
import type { IReadingStatusRepository } from './reading-status-repository.js';

export interface SetReadingStatusCommand {
  userId: unknown;
  bookId: unknown;
  status: unknown;
  currentPage?: unknown;
  startedOn?: string | null;
  finishedOn?: string | null;
}

export interface UpdateReadingStatusCommand {
  id?: unknown;
  /** The acting reader; only their own entries can be changed. */
  userId: unknown;
  bookId?: unknown;
  status?: unknown;
  currentPage?: unknown;
  startedOn?: string | null;
  finishedOn?: string | null;
}

// Application service: one method per use case on the reader's library.
export class ReadingStatusService {
  constructor(
    private readonly readingStatuses: IReadingStatusRepository,
    private readonly books: IBookRepository,
  ) {}

  /** Sets the reader's status for a book, adding the book to their library if needed. */
  async set(command: SetReadingStatusCommand): Promise<ReadingStatus> {
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
    if (command.startedOn !== undefined || command.finishedOn !== undefined) {
      status.setDates(command.startedOn, command.finishedOn);
    }

    await this.readingStatuses.save(status);
    return status;
  }

  /** Changes the status and/or page of an existing entry in the reader's library. */
  async update(command: UpdateReadingStatusCommand): Promise<ReadingStatus> {
    const status = await this.findEntry(command);
    // Another reader's entry is reported as not found, so its id is not revealed.
    if (!status || !status.userId.equals(UserId.of(command.userId))) {
      throw new NotFoundError('Reading status');
    }

    const book = await this.books.findById(status.bookId);
    if (!book) throw new NotFoundError('Book');

    if (command.status !== undefined) {
      status.changeStatus(ReadingState.of(command.status).type, book.pageCount);
    }
    if (command.currentPage !== undefined) {
      status.updateProgress(book.progressAt(command.currentPage));
    }
    if (command.startedOn !== undefined || command.finishedOn !== undefined) {
      status.setDates(command.startedOn, command.finishedOn);
    }

    await this.readingStatuses.save(status);
    return status;
  }

  /** Removes a book from the reader's library. */
  async remove(userId: unknown, bookId: unknown): Promise<void> {
    const deleted = await this.readingStatuses.delete(UserId.of(userId), BookId.of(bookId));
    if (!deleted) throw new NotFoundError('Reading status');
  }

  /** Removes one of the reader's entries by its ID; another reader's entry is reported as not found. */
  async removeById(userId: unknown, id: unknown): Promise<void> {
    const status = await this.readingStatuses.findById(ReadingStatusId.of(id));
    if (!status || !status.userId.equals(UserId.of(userId))) {
      throw new NotFoundError('Reading status');
    }
    const deleted = await this.readingStatuses.deleteById(status.id);
    if (!deleted) throw new NotFoundError('Reading status');
  }

  /**
   * Ensures the book is in the reader's library with status 'in-progress'.
   * Adds it if missing; advances 'not-started' to 'in-progress'; leaves other statuses untouched.
   */
  async ensureInProgress(userId: UserId, bookId: BookId): Promise<ReadingStatus> {
    const book = await this.books.findById(bookId);
    if (!book) throw new NotFoundError('Book');

    const status =
      (await this.readingStatuses.findByUserAndBook(userId, bookId)) ??
      ReadingStatus.create(userId, bookId);

    if (status.status === 'not-started') {
      status.startReading();
      await this.readingStatuses.save(status);
    }

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
