import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { member } from '../../database/schema.js';
import { memberRoleOf, type GroupId, type MemberRole } from '../group/group.js';
import type { UserId } from '../user/user.js';

// Port: who belongs to a group, for any kind of group (challenge or book club).
// The chat only needs the role, so it does not load the whole group aggregate.
export interface GroupMembership {
  /** The member's role, or null when the user is not in the group. */
  roleOf(groupId: GroupId, userId: UserId): Promise<MemberRole | null>;
}

export class DrizzleGroupMembership implements GroupMembership {
  constructor(private readonly db: NodePgDatabase) {}

  async roleOf(groupId: GroupId, userId: UserId): Promise<MemberRole | null> {
    const [row] = await this.db
      .select({ role: member.role })
      .from(member)
      .where(and(eq(member.groupId, groupId.value), eq(member.userId, userId.value)));
    return row ? memberRoleOf(row.role) : null;
  }
}
