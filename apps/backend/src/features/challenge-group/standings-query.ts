import { and, gte, inArray, isNotNull, lt, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { readingSessions, users } from '../../database/schema.js';
import type { ChallengeGroup } from './challenge-group.js';

// Read side (CQRS): the leaderboard joins members, users and reading sessions,
// which does not fit one aggregate, so it is served by a query returning views.
export interface StandingView {
  userId: string;
  displayName: string;
  username: string;
  role: string;
  /** Null when the metric is not tracked yet (only minutes is). */
  score: number | null;
}

export interface StandingsQuery {
  forGroup(group: ChallengeGroup): Promise<StandingView[]>;
}

export class DrizzleStandingsQuery implements StandingsQuery {
  constructor(private readonly db: NodePgDatabase) {}

  async forGroup(group: ChallengeGroup): Promise<StandingView[]> {
    const ids = group.members.map((m) => m.userId.value);
    const people = await this.db
      .select({ id: users.id, displayName: users.displayName, username: users.username })
      .from(users)
      .where(inArray(users.id, ids));

    const minutes =
      group.challenge.winMetric.value === 'minutes' ? await this.minutesFor(group, ids) : null;

    const views = group.members.map((m) => {
      const person = people.find((p) => p.id === m.userId.value);
      return {
        userId: m.userId.value,
        displayName: person?.displayName ?? 'Unknown reader',
        username: person?.username ?? '',
        role: m.role,
        score: minutes ? (minutes.get(m.userId.value) ?? 0) : null,
      };
    });
    return views.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }

  /** Counted minutes of sessions finished inside the challenge period. */
  private async minutesFor(group: ChallengeGroup, ids: string[]): Promise<Map<string, number>> {
    const { period } = group.challenge;
    const rows = await this.db
      .select({
        userId: readingSessions.userId,
        minutes: sql<number>`coalesce(sum(${readingSessions.countedMinutes}), 0)::int`,
      })
      .from(readingSessions)
      .where(
        and(
          inArray(readingSessions.userId, ids),
          isNotNull(readingSessions.endedAt),
          gte(readingSessions.endedAt, period.startsAt.toISOString()),
          lt(readingSessions.endedAt, period.endsAt.toISOString()),
        ),
      )
      .groupBy(readingSessions.userId);
    return new Map(rows.map((r) => [r.userId, r.minutes]));
  }
}
