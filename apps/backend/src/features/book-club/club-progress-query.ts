import { eq, inArray } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { books, users } from '../../database/schema.js';
import { authorNamesByBook } from '../book/book-authors-query.js';
import {
  DrizzleReadingActivityQuery,
  type ReadingActivityQuery,
} from '../reading-session/reading-activity-query.js';
import {
  DrizzleReadingProgressQuery,
  type ReadingProgressQuery,
} from '../reading-status/reading-progress-query.js';
import type { BookClub, Round } from './book-club.js';

// Read side (CQRS): a round's progress joins members, users, reading sessions and
// reading statuses, which does not fit one aggregate. Minutes and progress come
// from the reading-session and reading-status contracts, not from their tables.
export interface ClubStandingView {
  userId: string;
  displayName: string;
  username: string;
  role: string;
  /** Counted minutes of finished sessions on the round book, inside the round. */
  minutes: number;
  currentPage: number;
  /** 0 to 100; 100 once finished. */
  percent: number;
  finished: boolean;
}

export interface ClubBookView {
  id: string;
  title: string;
  authors: string[];
  pageCount: number | null;
  coverUrl: string | null;
}

export class ClubProgressQuery {
  constructor(
    private readonly db: NodePgDatabase,
    private readonly activity: ReadingActivityQuery = new DrizzleReadingActivityQuery(db),
    private readonly progress: ReadingProgressQuery = new DrizzleReadingProgressQuery(db),
  ) {}

  /** Every member of the club on `round`, most counted minutes first. */
  async standings(club: BookClub, round: Round): Promise<ClubStandingView[]> {
    const ids = club.members.map((m) => m.userId.value);
    const bookId = round.bookId.value;

    const [people, minutes, statuses, book] = await Promise.all([
      this.db
        .select({ id: users.id, displayName: users.displayName, username: users.username })
        .from(users)
        .where(inArray(users.id, ids)),
      this.activity.countedMinutes({
        userIds: ids,
        bookId,
        from: round.period.startsAt,
        to: round.period.endsAt,
      }),
      this.progress.progressOf(ids, bookId),
      this.db.select({ pageCount: books.pageCount }).from(books).where(eq(books.id, bookId)),
    ]);

    const pages = book[0]?.pageCount ?? null;
    const views = club.members.map((m) => {
      const id = m.userId.value;
      const person = people.find((p) => p.id === id);
      const status = statuses.find((s) => s.userId === id);
      const finished = status?.finished ?? false;
      const currentPage = status?.currentPage ?? 0;
      const percent = finished
        ? 100
        : pages
          ? Math.min(100, Math.round((currentPage / pages) * 100))
          : 0;
      return {
        userId: id,
        displayName: person?.displayName ?? 'Unknown reader',
        username: person?.username ?? '',
        role: m.role,
        minutes: minutes.find((r) => r.userId === id)?.minutes ?? 0,
        currentPage,
        percent,
        finished,
      };
    });
    return views.sort((a, b) => b.minutes - a.minutes);
  }

  async books(ids: string[]): Promise<ClubBookView[]> {
    if (ids.length === 0) return [];
    const rows = await this.db
      .select({
        id: books.id,
        title: books.title,
        pageCount: books.pageCount,
        coverUrl: books.coverUrl,
      })
      .from(books)
      .where(inArray(books.id, [...new Set(ids)]));
    const authorsByBook = await authorNamesByBook(
      this.db,
      rows.map((row) => row.id),
    );
    return rows.map((row) => ({ ...row, authors: authorsByBook.get(row.id) ?? [] }));
  }

  /** Display names by user id. */
  async names(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const rows = await this.db
      .select({ id: users.id, displayName: users.displayName })
      .from(users)
      .where(inArray(users.id, [...new Set(ids)]));
    return new Map(rows.map((r) => [r.id, r.displayName]));
  }
}
