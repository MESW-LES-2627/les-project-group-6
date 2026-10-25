import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { User } from '../../domain/user/user.js';
import type { UserId } from '../../domain/user/user-id.js';
import type { IUserRepository } from '../../domain/user/user-repository.js';
import type { Username } from '../../domain/user/username.js';
import { users } from '../database/schema.js';
import { UserMapper } from '../persistence/user-mapper.js';

export class DrizzleUserRepository implements IUserRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async findById(id: UserId): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, id.value)).limit(1);
    const row = rows[0];
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByUsername(username: Username): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username.value))
      .limit(1);
    const row = rows[0];
    return row ? UserMapper.toDomain(row) : null;
  }

  async save(user: User): Promise<void> {
    const row = UserMapper.toPersistence(user);
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
