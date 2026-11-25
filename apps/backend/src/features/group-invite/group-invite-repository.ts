import { and, desc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { groupInvites, groups, users } from '../../database/schema.js';
import { GroupId, groupKindOf, type GroupKind } from '../group/group.js';
import { UserId } from '../user/user.js';
import { GroupInvite, InviteId, inviteStatusOf } from './group-invite.js';

/** A pending invite with what the invitee needs to decide. */
export interface PendingInvite {
  invite: GroupInvite;
  groupName: string;
  groupKind: GroupKind;
  inviterName: string;
}

export interface IGroupInviteRepository {
  findById(id: InviteId): Promise<GroupInvite | null>;
  hasPending(groupId: GroupId, inviteeId: UserId): Promise<boolean>;
  pendingFor(inviteeId: UserId): Promise<PendingInvite[]>;
  /** The invites of one group that are still waiting for an answer. */
  pendingForGroup(groupId: GroupId): Promise<GroupInvite[]>;
  save(invite: GroupInvite): Promise<void>;
}

type InviteRow = typeof groupInvites.$inferSelect;

function toDomain(row: InviteRow): GroupInvite {
  return GroupInvite.reconstitute({
    id: InviteId.of(row.id),
    groupId: GroupId.of(row.groupId),
    inviteeId: UserId.of(row.inviteeId),
    inviterId: UserId.of(row.inviterId),
    status: inviteStatusOf(row.status),
    createdAt: new Date(row.createdAt),
    respondedAt: row.respondedAt ? new Date(row.respondedAt) : null,
  });
}

export class DrizzleGroupInviteRepository implements IGroupInviteRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async findById(id: InviteId): Promise<GroupInvite | null> {
    const rows = await this.db.select().from(groupInvites).where(eq(groupInvites.id, id.value));
    return rows[0] ? toDomain(rows[0]) : null;
  }

  async hasPending(groupId: GroupId, inviteeId: UserId): Promise<boolean> {
    const rows = await this.db
      .select({ id: groupInvites.id })
      .from(groupInvites)
      .where(
        and(
          eq(groupInvites.groupId, groupId.value),
          eq(groupInvites.inviteeId, inviteeId.value),
          eq(groupInvites.status, 'pending'),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  async pendingFor(inviteeId: UserId): Promise<PendingInvite[]> {
    const rows = await this.db
      .select({
        invite: groupInvites,
        groupName: groups.name,
        groupKind: groups.kind,
        inviterName: users.displayName,
      })
      .from(groupInvites)
      .innerJoin(groups, eq(groupInvites.groupId, groups.id))
      .innerJoin(users, eq(groupInvites.inviterId, users.id))
      .where(and(eq(groupInvites.inviteeId, inviteeId.value), eq(groupInvites.status, 'pending')))
      .orderBy(desc(groupInvites.createdAt));

    return rows.map((row) => ({
      invite: toDomain(row.invite),
      groupName: row.groupName,
      groupKind: groupKindOf(row.groupKind),
      inviterName: row.inviterName,
    }));
  }

  async pendingForGroup(groupId: GroupId): Promise<GroupInvite[]> {
    const rows = await this.db
      .select()
      .from(groupInvites)
      .where(and(eq(groupInvites.groupId, groupId.value), eq(groupInvites.status, 'pending')))
      .orderBy(desc(groupInvites.createdAt));
    return rows.map(toDomain);
  }

  async save(invite: GroupInvite): Promise<void> {
    await this.db
      .insert(groupInvites)
      .values({
        id: invite.id.value,
        groupId: invite.groupId.value,
        inviteeId: invite.inviteeId.value,
        inviterId: invite.inviterId.value,
        status: invite.status,
        createdAt: invite.createdAt.toISOString(),
        respondedAt: invite.respondedAt?.toISOString() ?? null,
      })
      .onConflictDoUpdate({
        target: groupInvites.id,
        set: { status: invite.status, respondedAt: invite.respondedAt?.toISOString() ?? null },
      });
  }
}
