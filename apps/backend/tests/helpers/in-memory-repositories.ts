import type { Book, BookId } from '../../src/features/book/book.js';
import type { IBookRepository } from '../../src/features/book/book-repository.js';
import type {
  ReadingStatus,
  ReadingStatusId,
} from '../../src/features/reading-status/reading-status.js';
import type { IReadingStatusRepository } from '../../src/features/reading-status/reading-status-repository.js';
import type {
  ReadingSession,
  ReadingSessionId,
} from '../../src/features/reading-session/reading-session.js';
import type {
  IReadingSessionRepository,
  ReadingStats,
} from '../../src/features/reading-session/reading-session-repository.js';
import type {
  ChallengeGroup,
  GroupId,
} from '../../src/features/challenge-group/challenge-group.js';
import type { IChallengeGroupRepository } from '../../src/features/challenge-group/challenge-group-repository.js';
import type { IUserRepository } from '../../src/features/user/user-repository.js';
import type { User, UserId, Username } from '../../src/features/user/user.js';

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

export class InMemoryReadingSessionRepository implements IReadingSessionRepository {
  private readonly sessions = new Map<string, ReadingSession>();

  async findById(id: ReadingSessionId): Promise<ReadingSession | null> {
    return this.sessions.get(id.value) ?? null;
  }

  async findActiveByUser(userId: UserId): Promise<ReadingSession | null> {
    return [...this.sessions.values()].find((s) => s.userId.equals(userId) && s.isActive) ?? null;
  }

  async statsForUser(userId: UserId): Promise<ReadingStats> {
    const finished = [...this.sessions.values()].filter(
      (s) => s.userId.equals(userId) && !s.isActive,
    );
    return {
      totalMinutes: finished.reduce((sum, s) => sum + s.countedMinutes, 0),
      sessionsCount: finished.length,
    };
  }

  async save(session: ReadingSession): Promise<void> {
    this.sessions.set(session.id.value, session);
  }

  async delete(id: ReadingSessionId): Promise<void> {
    this.sessions.delete(id.value);
  }

  // Readers are served one at a time here, so there is nothing to lock.
  async withReaderLock<T>(
    _userId: UserId,
    work: (sessions: IReadingSessionRepository) => Promise<T>,
  ): Promise<T> {
    return work(this);
  }
}

export class InMemoryUserRepository implements IUserRepository {
  private readonly users = new Map<string, User>();

  async findById(id: UserId): Promise<User | null> {
    return this.users.get(id.value) ?? null;
  }

  async findByUsername(username: Username): Promise<User | null> {
    return [...this.users.values()].find((u) => u.username.equals(username)) ?? null;
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id.value, user);
  }
}

export class InMemoryChallengeGroupRepository implements IChallengeGroupRepository {
  private readonly groups = new Map<string, ChallengeGroup>();

  async findById(id: GroupId): Promise<ChallengeGroup | null> {
    return this.groups.get(id.value) ?? null;
  }

  async findByMember(userId: UserId): Promise<ChallengeGroup[]> {
    return [...this.groups.values()].filter((g) => g.isMember(userId));
  }

  async add(group: ChallengeGroup): Promise<void> {
    this.groups.set(group.id.value, group);
  }
}
