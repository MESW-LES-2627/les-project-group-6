import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { users } from '../../database/schema.js';
import { Email, User, UserId, Username } from './user.js';

export interface IUserRepository {
  findById(id: UserId): Promise<User | null>;
  findByUsername(username: Username): Promise<User | null>;
  save(user: User): Promise<void>;
}

type UserRow = typeof users.$inferSelect;

// Data Mapper: the only place that knows both the users row and the User entity.
function toDomain(row: UserRow): User {
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
}

function toRow(user: User): typeof users.$inferInsert {
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
}

export class DrizzleUserRepository implements IUserRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async findById(id: UserId): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, id.value)).limit(1);
    const row = rows[0];
    return row ? toDomain(row) : null;
  }

  async findByUsername(username: Username): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username.value))
      .limit(1);
    const row = rows[0];
    return row ? toDomain(row) : null;
  }

  async save(user: User): Promise<void> {
    const row = toRow(user);
    await this.db
      .insert(users)
      .values(row)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          displayName: row.displayName,
          photoUrl: row.photoUrl,
          bio: row.bio,
          timezone: row.timezone,
          profileVisibility: row.profileVisibility,
          currentStreak: row.currentStreak,
          longestStreak: row.longestStreak,
          hitStreak: row.hitStreak,
        },
      });
  }
}
