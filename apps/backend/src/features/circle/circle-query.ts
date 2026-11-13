import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  books,
  groupMessages,
  groups,
  member,
  readingSessions,
  readingStatus,
  users,
} from '../../database/schema.js';
import type { FriendView } from '../friend/friend-repository.js';
import type { UserId } from '../user/user.js';

// Read side (CQRS): the Home "circle" sections join friends, libraries, reading
// sessions, groups and messages, which does not fit one aggregate, so they are
// served by a query returning plain views.

/** The few book fields the Home cards show. */
export interface CircleBookView {
  id: string;
  title: string;
  coverUrl: string | null;
  pageCount: number | null;
}

/** The book a friend is reading, and whether a session is running right now. */
export interface FriendReadingView {
  userId: string;
  displayName: string;
  username: string;
  book: CircleBookView;
  currentPage: number;
  readingNow: boolean;
}

/** A recent comment in one of the reader's groups. */
export interface CircleCommentView {
  id: string;
  groupId: string;
  groupName: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface CircleQuery {
  /** One in-progress book per friend, the one with a running session first. */
  friendsReading(friends: readonly FriendView[]): Promise<FriendReadingView[]>;

  /** Newest text comments across the groups the reader belongs to. */
  comments(userId: UserId, limit: number): Promise<CircleCommentView[]>;
}

type StatusRow = {
  userId: string;
  currentPage: number;
  bookId: string;
  title: string;
  coverUrl: string | null;
  pageCount: number | null;
};

const IN_PROGRESS = 'in-progress';
const TEXT = 'text';

export class DrizzleCircleQuery implements CircleQuery {
  constructor(private readonly db: NodePgDatabase) {}

  async friendsReading(friends: readonly FriendView[]): Promise<FriendReadingView[]> {
    if (friends.length === 0) return [];
    const ids = friends.map((friend) => friend.userId);

    const [running, statuses] = await Promise.all([
      this.db
        .select({ userId: readingSessions.userId, bookId: readingSessions.bookId })
        .from(readingSessions)
        .where(and(inArray(readingSessions.userId, ids), isNull(readingSessions.endedAt)))
        .orderBy(desc(readingSessions.startedAt)),
      this.db
        .select({
          userId: readingStatus.userId,
          currentPage: readingStatus.currentPage,
          bookId: books.id,
          title: books.title,
          coverUrl: books.coverUrl,
          pageCount: books.pageCount,
        })
        .from(readingStatus)
        .innerJoin(books, eq(books.id, readingStatus.bookId))
        .where(and(inArray(readingStatus.userId, ids), eq(readingStatus.status, IN_PROGRESS)))
        .orderBy(desc(readingStatus.updatedAt)),
    ]);

    const runningBook = new Map<string, string>();
    for (const session of running) {
      if (!runningBook.has(session.userId)) runningBook.set(session.userId, session.bookId);
    }

    // Newest in-progress book per friend; the one with a running session wins even
    // when another book was updated more recently.
    const chosen = new Map<string, StatusRow>();
    for (const row of statuses) {
      if (runningBook.get(row.userId) === row.bookId || !chosen.has(row.userId)) {
        chosen.set(row.userId, row);
      }
    }

    // Walk the statuses in update order so the friends with no session stay sorted.
    const friendById = new Map(friends.map((friend) => [friend.userId, friend]));
    const views: FriendReadingView[] = [];
    const seen = new Set<string>();
    for (const row of statuses) {
      const friend = friendById.get(row.userId);
      if (!friend || seen.has(row.userId) || chosen.get(row.userId) !== row) continue;
      seen.add(row.userId);
      views.push({
        userId: friend.userId,
        displayName: friend.displayName,
        username: friend.username,
        book: {
          id: row.bookId,
          title: row.title,
          coverUrl: row.coverUrl,
          pageCount: row.pageCount,
        },
        currentPage: row.currentPage,
        readingNow: runningBook.get(row.userId) === row.bookId,
      });
    }

    // Reading right now first; the rest keep the most recently updated first.
    return views.sort((a, b) => Number(b.readingNow) - Number(a.readingNow));
  }

  async comments(userId: UserId, limit: number): Promise<CircleCommentView[]> {
    if (limit <= 0) return [];
    const rows = await this.db
      .select({
        id: groupMessages.id,
        groupId: groupMessages.groupId,
        groupName: groups.name,
        authorId: groupMessages.authorId,
        authorName: users.displayName,
        body: groupMessages.body,
        createdAt: groupMessages.createdAt,
      })
      .from(groupMessages)
      .innerJoin(groups, eq(groups.id, groupMessages.groupId))
      // Membership is shared by challenge groups and book clubs.
      .innerJoin(
        member,
        and(eq(member.groupId, groupMessages.groupId), eq(member.userId, userId.value)),
      )
      .leftJoin(users, eq(users.id, groupMessages.authorId))
      .where(and(eq(groupMessages.kind, TEXT), isNull(groupMessages.deletedAt)))
      .orderBy(desc(groupMessages.createdAt), desc(groupMessages.seq))
      .limit(limit);

    return rows.map((row) => ({
      id: row.id,
      groupId: row.groupId,
      groupName: row.groupName,
      authorId: row.authorId ?? '',
      authorName: row.authorName ?? 'A reader',
      body: row.body,
      createdAt: new Date(row.createdAt).toISOString(),
    }));
  }
}
