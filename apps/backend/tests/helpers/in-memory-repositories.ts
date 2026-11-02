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
  MemberRole,
} from '../../src/features/challenge-group/challenge-group.js';
import { ChatMessage, type MessageId } from '../../src/features/group-chat/chat-message.js';
import type {
  IChatMessageRepository,
  MessageCursor,
} from '../../src/features/group-chat/chat-message-repository.js';
import type { GroupMembership } from '../../src/features/group-chat/group-membership-query.js';
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

export class InMemoryChatMessageRepository implements IChatMessageRepository {
  private readonly messages: ChatMessage[] = [];
  private nextSeq = 1;

  async append(message: ChatMessage): Promise<{ message: ChatMessage; created: boolean }> {
    const existing = this.messages.find(
      (m) =>
        message.clientId !== null &&
        m.clientId?.equals(message.clientId) &&
        m.authorId?.equals(message.authorId!),
    );
    if (existing) return { message: existing, created: false };
    const stored = ChatMessage.reconstitute({
      id: message.id,
      seq: this.nextSeq++,
      groupId: message.groupId,
      authorId: message.authorId,
      clientId: message.clientId,
      kind: message.kind,
      body: message.body,
      createdAt: message.createdAt,
      deletedAt: message.deletedAt,
    });
    this.messages.push(stored);
    return { message: stored, created: true };
  }

  async findById(groupId: GroupId, id: MessageId): Promise<ChatMessage | null> {
    return this.messages.find((m) => m.groupId.equals(groupId) && m.id.equals(id)) ?? null;
  }

  async page(groupId: GroupId, cursor: MessageCursor, limit: number): Promise<ChatMessage[]> {
    const inGroup = this.messages.filter((m) => m.groupId.equals(groupId));
    if (cursor.after !== undefined) {
      return inGroup.filter((m) => m.seq! > cursor.after!).slice(0, limit);
    }
    const older =
      cursor.before !== undefined ? inGroup.filter((m) => m.seq! < cursor.before!) : inGroup;
    return older.slice(-limit);
  }

  async markDeleted(message: ChatMessage): Promise<void> {
    const i = this.messages.findIndex((m) => m.id.equals(message.id));
    this.messages[i] = message;
  }
}

export class InMemoryGroupMembership implements GroupMembership {
  private readonly roles = new Map<string, MemberRole>();

  add(groupId: GroupId, userId: UserId, role: MemberRole = 'member'): void {
    this.roles.set(`${groupId.value}:${userId.value}`, role);
  }

  async roleOf(groupId: GroupId, userId: UserId): Promise<MemberRole | null> {
    return this.roles.get(`${groupId.value}:${userId.value}`) ?? null;
  }
}
