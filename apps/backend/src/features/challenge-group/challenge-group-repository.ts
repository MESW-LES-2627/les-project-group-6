import { desc, eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { challenges, groups, member } from '../../database/schema.js';
import { UserId } from '../user/user.js';
import {
  ChallengeGroup,
  ChallengePeriod,
  GroupId,
  GroupName,
  WinMetric,
  memberRoleOf,
} from './challenge-group.js';

export interface IChallengeGroupRepository {
  findById(id: GroupId): Promise<ChallengeGroup | null>;
  findByMember(userId: UserId): Promise<ChallengeGroup[]>;
  /** Stores a new group with its members and challenge, all or nothing. */
  add(group: ChallengeGroup): Promise<void>;
}

type GroupRow = typeof groups.$inferSelect;
type MemberRow = typeof member.$inferSelect;
type ChallengeRow = typeof challenges.$inferSelect;

// Data Mapper: the aggregate spans the groups, member and challenges tables.
function toDomain(row: GroupRow, members: MemberRow[], challenge: ChallengeRow): ChallengeGroup {
  return ChallengeGroup.reconstitute({
    id: GroupId.of(row.id),
    name: GroupName.of(row.name),
    description: row.description,
    adminId: UserId.of(row.adminId),
    members: members.map((m) => ({
      userId: UserId.of(m.userId),
      role: memberRoleOf(m.role),
      joinedAt: new Date(m.joinedAt),
    })),
    challenge: {
      period: ChallengePeriod.of(challenge.startDate, challenge.endDate),
      winMetric: WinMetric.of(challenge.winMetric),
      metricGoal: challenge.metricGoal,
    },
    createdAt: new Date(row.createdAt),
  });
}

export class DrizzleChallengeGroupRepository implements IChallengeGroupRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async findById(id: GroupId): Promise<ChallengeGroup | null> {
    const found = await this.load([id.value]);
    return found[0] ?? null;
  }

  async findByMember(userId: UserId): Promise<ChallengeGroup[]> {
    const rows = await this.db
      .select({ groupId: member.groupId })
      .from(member)
      .where(eq(member.userId, userId.value));
    return this.load(rows.map((r) => r.groupId));
  }

  async add(group: ChallengeGroup): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(groups).values({
        id: group.id.value,
        name: group.name.value,
        description: group.description,
        adminId: group.adminId.value,
        createdAt: group.createdAt.toISOString(),
      });
      await tx.insert(member).values(
        group.members.map((m) => ({
          groupId: group.id.value,
          userId: m.userId.value,
          role: m.role,
          joinedAt: m.joinedAt.toISOString(),
        })),
      );
      await tx.insert(challenges).values({
        groupId: group.id.value,
        startDate: group.challenge.period.startDate,
        endDate: group.challenge.period.endDate,
        winMetric: group.challenge.winMetric.value,
        metricGoal: group.challenge.metricGoal,
      });
    });
  }

  /** Loads groups that have a challenge; book clubs (no challenge row) are skipped. */
  private async load(ids: string[]): Promise<ChallengeGroup[]> {
    if (ids.length === 0) return [];

    const [groupRows, memberRows, challengeRows] = await Promise.all([
      this.db.select().from(groups).where(inArray(groups.id, ids)).orderBy(desc(groups.createdAt)),
      this.db.select().from(member).where(inArray(member.groupId, ids)),
      this.db
        .select()
        .from(challenges)
        .where(inArray(challenges.groupId, ids))
        .orderBy(desc(challenges.startDate)),
    ]);

    return groupRows.flatMap((row) => {
      // The latest challenge is the current one; earlier ones are history.
      const challenge = challengeRows.find((c) => c.groupId === row.id);
      if (!challenge) return [];
      return [
        toDomain(
          row,
          memberRows.filter((m) => m.groupId === row.id),
          challenge,
        ),
      ];
    });
  }
}
