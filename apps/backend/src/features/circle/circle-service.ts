import type { IFriendRepository } from '../friend/friend-repository.js';
import type { UserId } from '../user/user.js';
import type { CircleCommentView, CircleQuery, FriendReadingView } from './circle-query.js';

/** How many comments the Home feed shows by default, and the most a caller may ask for. */
export const CIRCLE_COMMENT_LIMIT = 5;
export const MAX_CIRCLE_COMMENT_LIMIT = 20;

/**
 * Application service for the Home circle sections. It asks the Friend feature who
 * the reader's friends are, and the Circle query for the read model, so the
 * friendship rules and the SQL stay in one place each.
 */
export class CircleService {
  constructor(
    private readonly circle: CircleQuery,
    private readonly friends: IFriendRepository,
  ) {}

  async friendsReading(userId: UserId): Promise<FriendReadingView[]> {
    const friends = await this.friends.friendsOf(userId);
    return this.circle.friendsReading(friends);
  }

  async comments(userId: UserId, limit?: number): Promise<CircleCommentView[]> {
    const size =
      Number.isInteger(limit) && limit !== undefined
        ? Math.min(Math.max(limit, 1), MAX_CIRCLE_COMMENT_LIMIT)
        : CIRCLE_COMMENT_LIMIT;
    return this.circle.comments(userId, size);
  }
}
