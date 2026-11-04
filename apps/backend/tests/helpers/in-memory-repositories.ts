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
import type { ChallengeGroup } from '../../src/features/challenge-group/challenge-group.js';
import { GroupRoster, type GroupId, type Membership } from '../../src/features/group/group.js';
import type { IGroupRosterRepository } from '../../src/features/group/group-roster-repository.js';
import type { BookClub } from '../../src/features/book-club/book-club.js';
import type { IBookClubRepository } from '../../src/features/book-club/book-club-repository.js';
import type { BookPoll } from '../../src/features/book-club/book-poll.js';
import type { IBookPollRepository } from '../../src/features/book-club/book-poll-repository.js';
import type { ChatMessage } from '../../src/features/group-chat/chat-message.js';
import type { ChatEntry, IChatRepository } from '../../src/features/group-chat/chat-repository.js';
import type { FriendView, IFriendRepository } from '../../src/features/friend/friend-repository.js';
import type { GroupInvite, InviteId } from '../../src/features/group-invite/group-invite.js';
import type {
  IGroupInviteRepository,
  PendingInvite,
} from '../../src/features/group-invite/group-invite-repository.js';
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

export class InMemoryGroupRosterRepository implements IGroupRosterRepository {
  private readonly rosters = new Map<string, GroupRoster>();

  /** Registers a group, as creating a challenge or a club would. */
  put(roster: GroupRoster): void {
    this.rosters.set(roster.groupId.value, roster);
  }

  async findById(id: GroupId): Promise<GroupRoster | null> {
    return this.rosters.get(id.value) ?? null;
  }

  async addMember(groupId: GroupId, membership: Membership): Promise<void> {
    const r = this.rosters.get(groupId.value);
    if (!r) return;
    this.put(new GroupRoster(r.groupId, r.name, r.kind, r.adminId, [...r.members, membership]));
  }
}

export class InMemoryChatRepository implements IChatRepository {
  readonly messages: ChatMessage[] = [];

  constructor(private readonly users?: InMemoryUserRepository) {}

  async add(message: ChatMessage): Promise<void> {
    this.messages.push(message);
  }

  async recent(groupId: GroupId, limit: number): Promise<ChatEntry[]> {
    const mine = this.messages.filter((m) => m.groupId.equals(groupId)).slice(-limit);
    return Promise.all(
      mine.map(async (message) => {
        const user = message.authorId ? await this.users?.findById(message.authorId) : null;
        return {
          message,
          author: user ? { displayName: user.displayName, username: user.username.value } : null,
        };
      }),
    );
  }
}

export class InMemoryFriendRepository implements IFriendRepository {
  private readonly pairs = new Set<string>();

  befriend(a: UserId, b: UserId): void {
    this.pairs.add(`${a.value}:${b.value}`);
    this.pairs.add(`${b.value}:${a.value}`);
  }

  async areFriends(a: UserId, b: UserId): Promise<boolean> {
    return this.pairs.has(`${a.value}:${b.value}`);
  }

  async friendsOf(userId: UserId): Promise<FriendView[]> {
    return [...this.pairs]
      .filter((p) => p.startsWith(`${userId.value}:`))
      .map((p) => ({ userId: p.split(':')[1]!, displayName: '', username: '' }));
  }
}

export class InMemoryGroupInviteRepository implements IGroupInviteRepository {
  private readonly invites = new Map<string, GroupInvite>();

  async findById(id: InviteId): Promise<GroupInvite | null> {
    return this.invites.get(id.value) ?? null;
  }

  async hasPending(groupId: GroupId, inviteeId: UserId): Promise<boolean> {
    return [...this.invites.values()].some(
      (i) => i.groupId.equals(groupId) && i.inviteeId.equals(inviteeId) && i.status === 'pending',
    );
  }

  async pendingFor(inviteeId: UserId): Promise<PendingInvite[]> {
    return [...this.invites.values()]
      .filter((i) => i.inviteeId.equals(inviteeId) && i.status === 'pending')
      .map((invite) => ({ invite, groupName: '', groupKind: 'book-club', inviterName: '' }));
  }

  async save(invite: GroupInvite): Promise<void> {
    this.invites.set(invite.id.value, invite);
  }
}

export class InMemoryBookClubRepository implements IBookClubRepository {
  private readonly clubs = new Map<string, BookClub>();

  async findById(id: GroupId): Promise<BookClub | null> {
    return this.clubs.get(id.value) ?? null;
  }

  async findByMember(userId: UserId): Promise<BookClub[]> {
    return [...this.clubs.values()].filter((c) => c.isMember(userId));
  }

  async save(club: BookClub): Promise<void> {
    this.clubs.set(club.id.value, club);
  }
}

export class InMemoryBookPollRepository implements IBookPollRepository {
  private readonly polls: BookPoll[] = [];

  async findCurrent(groupId: GroupId): Promise<BookPoll | null> {
    return (
      [...this.polls].reverse().find((p) => p.groupId.equals(groupId) && p.closedAt === null) ??
      null
    );
  }

  async save(poll: BookPoll): Promise<void> {
    if (!this.polls.includes(poll)) this.polls.push(poll);
  }
}
