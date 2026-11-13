import type { BookId } from '../book/book.js';
import type { IReadingStatusRepository } from '../reading-status/reading-status-repository.js';
import type { UserId } from '../user/user.js';

/**
 * Published contract of the library: a folder may only hold books that are
 * already on the reader's shelf. Reading Status owns that relation.
 */
export interface LibraryMembership {
  contains(userId: UserId, bookId: BookId): Promise<boolean>;
}

export class ReadingStatusLibraryMembership implements LibraryMembership {
  constructor(private readonly statuses: IReadingStatusRepository) {}

  async contains(userId: UserId, bookId: BookId): Promise<boolean> {
    return (await this.statuses.findByUserAndBook(userId, bookId)) !== null;
  }
}
