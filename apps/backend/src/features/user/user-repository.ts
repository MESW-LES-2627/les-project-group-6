import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { user } from '../../database/schema.js';
import { Email, User, UserId, Username } from './user.js';

export interface IUserRepository {
  findById(id: UserId): Promise<User | null>;
  findByUsername(username: Username): Promise<User | null>;
  save(user: User): Promise<void>;
}

type UserRow = typeof user.$inferSelect;

// Data Mapper: the only place that knows both the user row and the User entity.
function toDomain(row: UserRow): User {
  return User.reconstitute({
    id: UserId.of(row.id),
    email: Email.of(row.email),
    username: Username.of(row.username),
    displayName: row.displayName,
    photoUrl: row.photoUrl,
    profileDescription: row.profileDescription,
    timezone: row.timezone,
    profileVisibility: row.profileVisibility,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  });
}

function toRow(entity: User): typeof user.$inferInsert {
  return {
    id: entity.id.value,
    email: entity.email.value,
    username: entity.username.value,
    displayName: entity.displayName,
    photoUrl: entity.photoUrl,
    profileDescription: entity.profileDescription,
    timezone: entity.timezone,
    profileVisibility: entity.profileVisibility,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

export class DrizzleUserRepository implements IUserRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async findById(id: UserId): Promise<User | null> {
    const rows = await this.db.select().from(user).where(eq(user.id, id.value)).limit(1);
    const row = rows[0];
    return row ? toDomain(row) : null;
  }

  async findByUsername(username: Username): Promise<User | null> {
    const rows = await this.db
      .select()
      .from(user)
      .where(eq(user.username, username.value))
      .limit(1);
    const row = rows[0];
    return row ? toDomain(row) : null;
  }

  async save(entity: User): Promise<void> {
    const row = toRow(entity);
    await this.db
      .insert(user)
      .values(row)
      .onConflictDoUpdate({
        target: user.id,
        set: {
          displayName: row.displayName,
          photoUrl: row.photoUrl,
          profileDescription: row.profileDescription,
          timezone: row.timezone,
          profileVisibility: row.profileVisibility,
          updatedAt: row.updatedAt,
        },
      });
  }
}
