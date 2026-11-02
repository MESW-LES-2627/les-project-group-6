import { and, eq, gte, inArray, isNotNull, lt, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { books, readingSessions, users } from '../../database/schema.js';
import type { ChallengeGroup, WinMetricType } from './challenge-group.js';

// Read side (CQRS): the leaderboard joins members, users, reading sessions and
// books, which does not fit one aggregate, so it is served by a query returning views.
export interface BookMinutesView {
  bookId: string;
  title: string;
  minutes: number;
}

export interface StandingView {
  userId: string;
  displayName: string;
  username: string;
  role: string;
  /** Null when the metric is not tracked yet (only minutes is). */
  score: number | null;
  /** What the score was read in, most minutes first. Empty when not tracked. */
  books: BookMinutesView[];
}

/** How one win metric scores a challenge; a new metric (pages, books, streak) is a new class. */
export interface ScoreStrategy {
  /** What each member read in the challenge period, per book, keyed by user id. */
  byBook(group: ChallengeGroup, memberIds: string[]): Promise<Map<string, BookMinutesView[]>>;
}

export class StandingsQuery {
  constructor(
    private readonly db: NodePgDatabase,
    private readonly strategies: Partial<Record<WinMetricType, ScoreStrategy>> = {
      minutes: new CountedMinutesScore(db),
    },
  ) {}

  async forGroup(group: ChallengeGroup): Promise<StandingView[]> {
    const ids = group.members.map((m) => m.userId.value);
    const people = await this.db
      .select({ id: users.id, displayName: users.displayName, username: users.username })
      .from(users)
      .where(inArray(users.id, ids));

    const strategy = this.strategies[group.challenge.winMetric.value];
    const scored = strategy ? await strategy.byBook(group, ids) : null;

    const views = group.members.map((m) => {
      const person = people.find((p) => p.id === m.userId.value);
      const read = scored?.get(m.userId.value) ?? [];
      return {
        userId: m.userId.value,
        displayName: person?.displayName ?? 'Unknown reader',
        username: person?.username ?? '',
        role: m.role,
        score: scored ? read.reduce((sum, b) => sum + b.minutes, 0) : null,
        books: read,
      };
    });
    return views.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
  }
}

export class CountedMinutesScore implements ScoreStrategy {
  constructor(private readonly db: NodePgDatabase) {}

  /**
   * Counted minutes of sessions finished inside the challenge period, per member
   * and book: a reader can read several books in the same challenge.
   */
  async byBook(group: ChallengeGroup, ids: string[]): Promise<Map<string, BookMinutesView[]>> {
    const { period } = group.challenge;
    const rows = await this.db
      .select({
        userId: readingSessions.userId,
        bookId: books.id,
        title: books.title,
        minutes: sql<number>`coalesce(sum(${readingSessions.countedMinutes}), 0)::int`,
      })
      .from(readingSessions)
      .innerJoin(books, eq(readingSessions.bookId, books.id))
      .where(
        and(
          inArray(readingSessions.userId, ids),
          isNotNull(readingSessions.endedAt),
          gte(readingSessions.endedAt, period.startsAt.toISOString()),
          lt(readingSessions.endedAt, period.endsAt.toISOString()),
        ),
      )
      .groupBy(readingSessions.userId, books.id, books.title);

    const byUser = new Map<string, BookMinutesView[]>();
    for (const row of rows) {
      const list = byUser.get(row.userId) ?? [];
      list.push({ bookId: row.bookId, title: row.title, minutes: row.minutes });
      byUser.set(row.userId, list);
    }
    for (const list of byUser.values()) list.sort((a, b) => b.minutes - a.minutes);
    return byUser;
  }
}
