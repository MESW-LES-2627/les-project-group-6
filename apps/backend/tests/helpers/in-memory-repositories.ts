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
import {
  GroupRoster,
  type GroupId,
  type MemberRole,
  type Membership,
} from '../../src/features/group/group.js';
import type { IGroupRosterRepository } from '../../src/features/group/group-roster-repository.js';
import type { BookClub } from '../../src/features/book-club/book-club.js';
import type { IBookClubRepository } from '../../src/features/book-club/book-club-repository.js';
import type { BookPoll } from '../../src/features/book-club/book-poll.js';
import type { IBookPollRepository } from '../../src/features/book-club/book-poll-repository.js';
import type { FriendView, IFriendRepository } from '../../src/features/friend/friend-repository.js';
import type { Friendship, FriendshipId } from '../../src/features/friend/friend.js';
import type { GroupInvite, InviteId } from '../../src/features/group-invite/group-invite.js';
import type {
  IGroupInviteRepository,
  PendingInvite,
} from '../../src/features/group-invite/group-invite-repository.js';
import { ChatMessage, type MessageId } from '../../src/features/group-chat/chat-message.js';
import type {
  IChatMessageRepository,
  MessageCursor,
} from '../../src/features/group-chat/chat-message-repository.js';
import type { GroupMembership } from '../../src/features/group-chat/group-membership-query.js';
import type { SystemMessages } from '../../src/features/group-chat/chat-service.js';
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

export class InMemoryFriendRepository implements IFriendRepository {
  private readonly pairs = new Set<string>();
  private readonly friendships = new Map<string, Friendship>();

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

  async findById(id: FriendshipId): Promise<Friendship | null> {
    return this.friendships.get(id.value) ?? null;
  }

  async findBetween(a: UserId, b: UserId): Promise<Friendship | null> {
    return (
      [...this.friendships.values()].find(
        (f) =>
          (f.requesterId.equals(a) && f.addresseeId.equals(b)) ||
          (f.requesterId.equals(b) && f.addresseeId.equals(a)),
      ) ?? null
    );
  }

  async save(friendship: Friendship): Promise<void> {
    this.friendships.set(friendship.id.value, friendship);
    if (friendship.status === 'accepted') {
      this.befriend(friendship.requesterId, friendship.addresseeId);
    } else {
      this.pairs.delete(`${friendship.requesterId.value}:${friendship.addresseeId.value}`);
      this.pairs.delete(`${friendship.addresseeId.value}:${friendship.requesterId.value}`);
    }
  }

  async delete(id: FriendshipId): Promise<void> {
    const f = this.friendships.get(id.value);
    if (f) {
      this.pairs.delete(`${f.requesterId.value}:${f.addresseeId.value}`);
      this.pairs.delete(`${f.addresseeId.value}:${f.requesterId.value}`);
    }
    this.friendships.delete(id.value);
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

/** Records the system messages other features post, instead of a chat. */
export class RecordingSystemMessages implements SystemMessages {
  readonly posts: { groupId: GroupId; text: string }[] = [];

  async postSystem(groupId: GroupId, text: string): Promise<void> {
    this.posts.push({ groupId, text });
  }

  get texts(): string[] {
    return this.posts.map((p) => p.text);
  }
}
