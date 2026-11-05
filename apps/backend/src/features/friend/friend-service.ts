import type { Clock } from '../../utils/clock.js';
import { InvalidValueError } from '../../utils/errors.js';
import type { IUserRepository } from '../user/user-repository.js';
import { UserId } from '../user/user.js';
import {
  CannotFriendSelfError,
  Friendship,
  FriendshipId,
  FriendshipNotFoundError,
} from './friend.js';
import type { FriendView, IFriendRepository } from './friend-repository.js';

export type FriendRequestOutcome = 'ok' | 'no_changes';

export interface FriendRequestResult {
  outcome: FriendRequestOutcome;
  friendship: Friendship;
}

export class FriendService {
  constructor(
    private readonly friends: IFriendRepository,
    private readonly users: IUserRepository,
    private readonly now: Clock = () => new Date(),
  ) {}

  /**
   * Creates a new friendship request in the database according to requesterId and targetUserId.
   * - Outcome 'ok' on successful creation of a pending request.
   * - Throws InvalidValueError if requesterId equals targetUserId, or if either user does not exist.
   * - Outcome 'no_changes' if a pending or accepted friendship already exists between them.
   */
  async request(requesterId: unknown, targetUserId: unknown): Promise<FriendRequestResult> {
    const requester = UserId.of(requesterId);
    const target = UserId.of(targetUserId);

    if (requester.equals(target)) {
      throw new CannotFriendSelfError();
    }

    const [requesterUser, targetUser] = await Promise.all([
      this.users.findById(requester),
      this.users.findById(target),
    ]);

    if (!requesterUser || !targetUser) {
      throw new InvalidValueError('One or both user IDs are not valid users');
    }

    const existing = await this.friends.findBetween(requester, target);
    if (existing && (existing.status === 'pending' || existing.status === 'accepted')) {
      return { outcome: 'no_changes', friendship: existing };
    }

    const friendship = Friendship.request(requester, target, this.now());
    await this.friends.save(friendship);
    return { outcome: 'ok', friendship };
  }

  /**
   * Accepts a pending friendship request between two users (or by friendship id).
   * Verifies that the friendship is pending and the user accepting is the requested user.
   */
  async accept(byUserId: unknown, targetOrFriendshipId: unknown): Promise<Friendship> {
    const by = UserId.of(byUserId);
    const friendship = await this.resolvePendingFriendship(by, targetOrFriendshipId);

    friendship.accept(by, this.now());
    await this.friends.save(friendship);
    return friendship;
  }

  /**
   * Declines a pending friendship request between two users (or by friendship id).
   * Verifies that the friendship is pending and the user declining is the requested user.
   */
  async decline(byUserId: unknown, targetOrFriendshipId: unknown): Promise<Friendship> {
    const by = UserId.of(byUserId);
    const friendship = await this.resolvePendingFriendship(by, targetOrFriendshipId);

    friendship.decline(by, this.now());
    await this.friends.save(friendship);
    return friendship;
  }

  async friendsOf(userId: unknown): Promise<FriendView[]> {
    return this.friends.friendsOf(UserId.of(userId));
  }

  async areFriends(a: unknown, b: unknown): Promise<boolean> {
    return this.friends.areFriends(UserId.of(a), UserId.of(b));
  }

  /**
   * Returns all pending friend requests where this user is the requested one.
   */
  async pendingRequestsFor(userId: unknown): Promise<Friendship[]> {
    return this.friends.pendingFor(UserId.of(userId));
  }

  /**
   * Removes a friendship between two users using their user IDs.
   * Deletes the friendship record. Throws FriendshipNotFoundError if they are not friends.
   */
  async removeFriend(userId: unknown, friendUserId: unknown): Promise<void> {
    const current = UserId.of(userId);
    const friend = UserId.of(friendUserId);

    if (current.equals(friend)) {
      throw new FriendshipNotFoundError();
    }

    const existing = await this.friends.findBetween(current, friend);
    if (!existing || existing.status !== 'accepted') {
      throw new FriendshipNotFoundError();
    }

    await this.friends.delete(existing.id);
  }

  private async resolvePendingFriendship(by: UserId, targetOrFriendshipId: unknown): Promise<Friendship> {
    // Try to resolve as FriendshipId first
    try {
      const friendshipId = FriendshipId.of(targetOrFriendshipId);
      const found = await this.friends.findById(friendshipId);
      if (found) return found;
    } catch {
      // not a friendship id or not found, try as user id
    }

    // Try finding by the other user's ID
    const otherUser = UserId.of(targetOrFriendshipId);
    const foundBetween = await this.friends.findBetween(by, otherUser);
    if (!foundBetween) {
      throw new FriendshipNotFoundError();
    }
    return foundBetween;
  }
}
