import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { User, type IUserRepository } from '../../domain/user.js';
import { users } from '../database/schema.js';

export class DrizzleUserRepository implements IUserRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async findById(id: string): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    const row = rows[0];
    if (!row) return null;
    return this.mapToDomain(row);
  }

  async findByUsername(username: string): Promise<User | null> {
    const rows = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    const row = rows[0];
    if (!row) return null;
    return this.mapToDomain(row);
  }

  async save(user: User): Promise<void> {
    await this.db
      .insert(users)
      .values({
        id: user.id,
        email: user.email,
        username: user.username,
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
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          displayName: user.displayName,
          photoUrl: user.photoUrl,
          bio: user.bio,
          timezone: user.timezone,
          profileVisibility: user.profileVisibility,
          currentStreak: user.currentStreak,
          longestStreak: user.longestStreak,
          hitStreak: user.hitStreak,
        },
      });
  }

  // Explicit mapping from raw DB row to pure Domain Entity
  private mapToDomain(row: typeof users.$inferSelect): User {
    return new User({
      id: row.id,
      email: row.email,
      username: row.username,
      displayName: row.displayName,
      photoUrl: row.photoUrl,
      bio: row.bio,
      timezone: row.timezone,
      profileVisibility: (row.profileVisibility as 'private' | 'public') ?? 'private',
      streakType: row.streakType,
      currentStreak: row.currentStreak,
      longestStreak: row.longestStreak,
      hitStreak: row.hitStreak,
      createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
    });
  }
}
