import { and, desc, eq, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { friendships, users } from '../../database/schema.js';
import { UserId } from '../user/user.js';
import {
  Friendship,
  FriendshipId,
  friendshipStatusOf,
} from './friend.js';

/** A friend as the invite list shows them. */
export interface FriendView {
  userId: string;
  displayName: string;
  username: string;
}

type FriendshipRow = typeof friendships.$inferSelect;
type FriendshipInsert = typeof friendships.$inferInsert;

function toDomain(row: FriendshipRow): Friendship {
  return Friendship.reconstitute({
    id: FriendshipId.of(row.id),
    requesterId: UserId.of(row.requesterId),
    addresseeId: UserId.of(row.addresseeId),
    status: friendshipStatusOf(row.status),
    createdAt: new Date(row.createdAt),
    respondedAt: row.respondedAt ? new Date(row.respondedAt) : null,
  });
}

function toRow(friendship: Friendship): FriendshipInsert {
  return {
    id: friendship.id.value,
    requesterId: friendship.requesterId.value,
    addresseeId: friendship.addresseeId.value,
    status: friendship.status,
    createdAt: friendship.createdAt.toISOString(),
    respondedAt: friendship.respondedAt ? friendship.respondedAt.toISOString() : null,
  };
}

export interface IFriendRepository {
  areFriends(a: UserId, b: UserId): Promise<boolean>;
  friendsOf(userId: UserId): Promise<FriendView[]>;
  findById(id: FriendshipId): Promise<Friendship | null>;
  findBetween(a: UserId, b: UserId): Promise<Friendship | null>;
  pendingFor(addresseeId: UserId): Promise<Friendship[]>;
  save(friendship: Friendship): Promise<void>;
  delete(id: FriendshipId): Promise<void>;
}

const ACCEPTED = 'accepted';

export class DrizzleFriendRepository implements IFriendRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async areFriends(a: UserId, b: UserId): Promise<boolean> {
    const rows = await this.db
      .select({ id: friendships.id })
      .from(friendships)
      .where(
        and(
          eq(friendships.status, ACCEPTED),
          or(
            and(eq(friendships.requesterId, a.value), eq(friendships.addresseeId, b.value)),
            and(eq(friendships.requesterId, b.value), eq(friendships.addresseeId, a.value)),
          ),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async friendsOf(userId: UserId): Promise<FriendView[]> {
    const rows = await this.db
      .select({
        requesterId: friendships.requesterId,
        addresseeId: friendships.addresseeId,
      })
      .from(friendships)
      .where(
        and(
          eq(friendships.status, ACCEPTED),
          or(eq(friendships.requesterId, userId.value), eq(friendships.addresseeId, userId.value)),
        ),
      );
    const ids = rows.map((r) => (r.requesterId === userId.value ? r.addresseeId : r.requesterId));
    if (ids.length === 0) return [];

    const people = await this.db
      .select({ userId: users.id, displayName: users.displayName, username: users.username })
      .from(users)
      .where(or(...ids.map((id) => eq(users.id, id))));
    return people.sort((x, y) => x.displayName.localeCompare(y.displayName));
  }

  async findById(id: FriendshipId): Promise<Friendship | null> {
    const rows = await this.db
      .select()
      .from(friendships)
      .where(eq(friendships.id, id.value))
      .limit(1);
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async findBetween(a: UserId, b: UserId): Promise<Friendship | null> {
    const rows = await this.db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.requesterId, a.value), eq(friendships.addresseeId, b.value)),
          and(eq(friendships.requesterId, b.value), eq(friendships.addresseeId, a.value)),
        ),
      )
      .orderBy(desc(friendships.createdAt))
      .limit(1);
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async pendingFor(addresseeId: UserId): Promise<Friendship[]> {
    const rows = await this.db
      .select()
      .from(friendships)
      .where(
        and(
          eq(friendships.addresseeId, addresseeId.value),
          eq(friendships.status, 'pending'),
        ),
      )
      .orderBy(desc(friendships.createdAt));
    return rows.map(toDomain);
  }

  async save(friendship: Friendship): Promise<void> {
    const row = toRow(friendship);
    await this.db
      .insert(friendships)
      .values(row)
      .onConflictDoUpdate({
        target: friendships.id,
        set: {
          status: row.status,
          respondedAt: row.respondedAt,
        },
      });
  }

  async delete(id: FriendshipId): Promise<void> {
    await this.db.delete(friendships).where(eq(friendships.id, id.value));
  }
}
