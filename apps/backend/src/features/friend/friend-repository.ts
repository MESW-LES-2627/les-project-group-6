import { and, eq, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { friendships, users } from '../../database/schema.js';
import type { UserId } from '../user/user.js';

/** A friend as the invite list shows them. */
export interface FriendView {
  userId: string;
  displayName: string;
  username: string;
}

// Friendships are created by the friends feature (#33); groups only read the
// accepted ones, in either direction.
export interface IFriendRepository {
  areFriends(a: UserId, b: UserId): Promise<boolean>;
  friendsOf(userId: UserId): Promise<FriendView[]>;
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
}
