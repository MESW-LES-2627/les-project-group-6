import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { bookClubs, groups, member } from '../../database/schema.js';
import { UserId } from '../user/user.js';
import { GroupId, GroupRoster, memberRoleOf, type Membership } from './group.js';

export interface IGroupRosterRepository {
  findById(id: GroupId): Promise<GroupRoster | null>;
  addMember(groupId: GroupId, membership: Membership): Promise<void>;
}

export class DrizzleGroupRosterRepository implements IGroupRosterRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async findById(id: GroupId): Promise<GroupRoster | null> {
    const [rows, members] = await Promise.all([
      this.db
        .select({ name: groups.name, adminId: groups.adminId, clubId: bookClubs.groupId })
        .from(groups)
        .leftJoin(bookClubs, eq(bookClubs.groupId, groups.id))
        .where(eq(groups.id, id.value))
        .limit(1),
      this.db.select().from(member).where(eq(member.groupId, id.value)),
    ]);
    const row = rows[0];
    if (!row) return null;
    return new GroupRoster(
      id,
      row.name,
      row.clubId ? 'book-club' : 'challenge',
      UserId.of(row.adminId),
      members.map((m) => ({
        userId: UserId.of(m.userId),
        role: memberRoleOf(m.role),
        joinedAt: new Date(m.joinedAt),
      })),
    );
  }

  async addMember(groupId: GroupId, membership: Membership): Promise<void> {
    await this.db
      .insert(member)
      .values({
        groupId: groupId.value,
        userId: membership.userId.value,
        role: membership.role,
        joinedAt: membership.joinedAt.toISOString(),
      })
      .onConflictDoNothing();
  }
}
