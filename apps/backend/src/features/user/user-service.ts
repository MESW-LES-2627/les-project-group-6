import {
  BusinessRuleViolationError,
  InvalidValueError,
  NotFoundError,
} from '../../utils/errors.js';
import type { AuthIdentity } from '../auth/auth-provider.js';
import type { IFriendRepository } from '../friend/friend-repository.js';
import type { IReadingSessionRepository } from '../reading-session/reading-session-repository.js';
import type { IUserRepository } from './user-repository.js';
import { User, UserId, Username, UsernameTakenError } from './user.js';

export interface CreateProfileInput {
  username: unknown;
  displayName: unknown;
  timezone?: unknown;
}

export interface UpdateProfileInput {
  displayName?: unknown;
  timezone?: unknown;
}

export type FriendshipStatusWithViewer =
  'self' | 'none' | 'friends' | 'pending_sent' | 'pending_received';

export interface UserProfileView {
  id: string;
  username: string;
  displayName: string;
  photoUrl: string | null;
  bio: string | null;
  timezone: string;
  profileVisibility: 'public' | 'private';
  createdAt: string;
  isSelf: boolean;
  isVisible: boolean;
  friendshipStatus: FriendshipStatusWithViewer;
  friendRequestId: string | null;
  currentStreak: number;
  longestStreak: number;
  totalMinutes: number;
  sessionsCount: number;
}

export interface UserSearchResultDto {
  id: string;
  username: string;
  displayName: string;
  photoUrl: string | null;
  bio: string | null;
  profileVisibility: 'public' | 'private';
}

const asText = (raw: unknown, field: string): string => {
  if (typeof raw !== 'string') throw new InvalidValueError(`${field} is required`);
  return raw;
};

// Application service for user profiles and identity (F-AUTH-01, F-PROF-02, F-SOC-02).
export class UserService {
  constructor(
    private readonly users: IUserRepository,
    private readonly friends?: IFriendRepository,
    private readonly sessions?: IReadingSessionRepository,
  ) {}

  /** Creates the `users` row the first time a Supabase account is used. */
  async createProfile(identity: AuthIdentity, input: CreateProfileInput): Promise<User> {
    if (!identity.email) {
      throw new InvalidValueError('Your account has no email address');
    }
    if (await this.users.findById(identity.userId)) {
      throw new BusinessRuleViolationError('Your profile already exists');
    }
    const username = Username.of(asText(input.username, 'Username').trim().replace(/^@/, ''));
    if (await this.users.findByUsername(username)) throw new UsernameTakenError();

    const user = User.register({
      id: identity.userId,
      email: identity.email,
      username,
      displayName: asText(input.displayName, 'Display name'),
      timezone: input.timezone === undefined ? undefined : asText(input.timezone, 'Timezone'),
    });
    // Insert-only: a concurrent request for the same account or username fails with 409.
    await this.users.add(user);
    return user;
  }

  async updateProfile(user: User, input: UpdateProfileInput): Promise<User> {
    if (input.displayName !== undefined) user.rename(asText(input.displayName, 'Display name'));
    if (input.timezone !== undefined) user.moveTo(asText(input.timezone, 'Timezone'));
    await this.users.save(user);
    return user;
  }

  /** Public check used by the sign-up form before the account is created. */
  async isUsernameAvailable(raw: unknown): Promise<boolean> {
    const username = Username.of(typeof raw === 'string' ? raw.trim().replace(/^@/, '') : raw);
    return (await this.users.findByUsername(username)) === null;
  }

  /**
   * Returns another user's profile by username, taking into account profile privacy
   * (F-PROF-02) and friendship status with the viewer (F-SOC-02).
   */
  async getProfileByUsername(rawUsername: unknown, viewerId: unknown): Promise<UserProfileView> {
    const viewer = UserId.of(viewerId);
    let username: Username;
    try {
      username = Username.of(
        typeof rawUsername === 'string' ? rawUsername.trim().replace(/^@/, '') : rawUsername,
      );
    } catch {
      throw new NotFoundError('User');
    }

    const target = await this.users.findByUsername(username);
    if (!target) {
      throw new NotFoundError('User');
    }

    const isSelf = target.id.equals(viewer);

    let friendshipStatus: FriendshipStatusWithViewer = isSelf ? 'self' : 'none';
    let friendRequestId: string | null = null;

    if (!isSelf && this.friends) {
      const friendship = await this.friends.findBetween(viewer, target.id);
      if (friendship) {
        if (friendship.status === 'accepted') {
          friendshipStatus = 'friends';
        } else if (friendship.status === 'pending') {
          if (friendship.requesterId.equals(viewer)) {
            friendshipStatus = 'pending_sent';
            friendRequestId = friendship.id.value;
          } else {
            friendshipStatus = 'pending_received';
            friendRequestId = friendship.id.value;
          }
        }
      }
    }

    const isVisible =
      isSelf || target.profileVisibility === 'public' || friendshipStatus === 'friends';

    let totalMinutes = 0;
    let sessionsCount = 0;
    if (isVisible && this.sessions) {
      const stats = await this.sessions.statsForUser(target.id);
      totalMinutes = stats.totalMinutes;
      sessionsCount = stats.sessionsCount;
    }

    return {
      id: target.id.value,
      username: target.username.value,
      displayName: target.displayName,
      photoUrl: target.photoUrl,
      bio: target.bio,
      timezone: target.timezone,
      profileVisibility: target.profileVisibility,
      createdAt: target.createdAt.toISOString(),
      isSelf,
      isVisible,
      friendshipStatus,
      friendRequestId,
      currentStreak: isVisible ? target.currentStreak : 0,
      longestStreak: isVisible ? target.longestStreak : 0,
      totalMinutes,
      sessionsCount,
    };
  }

  /**
   * Searches users by username or display name (F-SOC-02, F-EXP-01).
   * Strips any leading `@` and trims query. Returns empty array if query length < 2.
   */
  async searchUsers(rawQuery: string, limit = 20): Promise<UserSearchResultDto[]> {
    const query = rawQuery.trim().replace(/^@/, '');
    if (query.length < 2) return [];

    const found = await this.users.search(query, limit);
    return found.map((u) => ({
      id: u.id.value,
      username: u.username.value,
      displayName: u.displayName,
      photoUrl: u.photoUrl,
      bio: u.bio,
      profileVisibility: u.profileVisibility,
    }));
  }
}
