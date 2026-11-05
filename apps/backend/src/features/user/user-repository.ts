import { eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { users } from '../../database/schema.js';
import { BusinessRuleViolationError } from '../../utils/errors.js';
import { Email, User, UserId, Username, UsernameTakenError } from './user.js';

export interface IUserRepository {
  findById(id: UserId): Promise<User | null>;
  /** Matches ignoring case, since usernames are unique case-insensitively. */
  findByUsername(username: Username): Promise<User | null>;
  /** Inserts a new user only; throws if the id, username or email is already used. */
  add(user: User): Promise<void>;
  /** Inserts or updates; throws `UsernameTakenError` if another user holds the username. */
  save(user: User): Promise<void>;
}

/** Translates a unique violation on `users` into the matching domain error. */
function uniqueViolation(error: unknown): Error | null {
  const cause = (error as { cause?: unknown })?.cause ?? error;
  const { code, constraint } = (cause ?? {}) as { code?: string; constraint?: string };
  if (code !== '23505' || !constraint) return null;
  if (constraint.startsWith('users_username')) return new UsernameTakenError();
  if (constraint === 'users_email_key') {
    return new BusinessRuleViolationError('This email is already registered');
  }
  if (constraint === 'users_pkey')
    return new BusinessRuleViolationError('Your profile already exists');
  return null;
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
      .where(sql`lower(${users.username}) = lower(${username.value})`)
      .limit(1);
    const row = rows[0];
    return row ? toDomain(row) : null;
  }

  async add(user: User): Promise<void> {
    try {
      await this.db.insert(users).values(toRow(user));
    } catch (error) {
      throw uniqueViolation(error) ?? error;
    }
  }

  async save(user: User): Promise<void> {
    try {
      await this.upsert(toRow(user));
    } catch (error) {
      throw uniqueViolation(error) ?? error;
    }
  }

  private async upsert(row: typeof users.$inferInsert): Promise<void> {
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
