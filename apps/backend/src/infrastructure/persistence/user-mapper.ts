import { Email } from '../../domain/user/email.js';
import { User } from '../../domain/user/user.js';
import { UserId } from '../../domain/user/user-id.js';
import { Username } from '../../domain/user/username.js';
import type { users } from '../database/schema.js';

// Data Mapper: the only place that knows both the users row and the User entity.
export const UserMapper = {
  toDomain(row: typeof users.$inferSelect): User {
    return User.reconstitute({
      id: UserId.of(row.id),
      email: Email.of(row.email),
      username: Username.of(row.username),
      displayName: row.displayName,
      photoUrl: row.photoUrl,
      bio: row.bio,
      timezone: row.timezone,
      profileVisibility: row.profileVisibility === 'public' ? 'public' : 'private',
      streakType: row.streakType,
      currentStreak: row.currentStreak,
      longestStreak: row.longestStreak,
      hitStreak: row.hitStreak,
      createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
    });
  },

  toPersistence(user: User): typeof users.$inferInsert {
    return {
      id: user.id.value,
      email: user.email.value,
      username: user.username.value,
      displayName: user.displayName,
      photoUrl: user.photoUrl,
      bio: user.bio,
      timezone: user.timezone,
      profileVisibility: user.profileVisibility,
      streakType: user.streakType,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      hitStreak: user.hitStreak,
      createdAt: user.createdAt.toISOString(),
    };
  },
};
