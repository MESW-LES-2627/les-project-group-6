import type { Clock } from '../../utils/clock.js';
import { BookId, type Book } from '../book/book.js';
import type { IBookRepository } from '../book/book-repository.js';
import type { ReadingActivityQuery } from '../reading-session/reading-activity-query.js';
import type { ReadingProgressQuery } from '../reading-status/reading-progress-query.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const EXPLORE_LIST_SIZE = 10;

/** A book and its score in one list: minutes read, or readers who added it. */
export interface RankedBook {
  book: Book;
  score: number;
}

export interface ExploreOverview {
  mostReadThisWeek: RankedBook[];
  trending: RankedBook[];
  /** Random books to show while nothing is trending; empty once something is. */
  suggestions: Book[];
}

/**
 * Application service for the Explore page (F-EXP-04). It asks the published read
 * contracts for their rankings, instead of reading `reading_sessions` and
 * `reading_status`, so the counted-minutes rule stays in Reading Session.
 */
export class ExploreService {
  constructor(
    private readonly activity: ReadingActivityQuery,
    private readonly progress: ReadingProgressQuery,
    private readonly books: IBookRepository,
    private readonly now: Clock = () => new Date(),
  ) {}

  async overview(): Promise<ExploreOverview> {
    const to = this.now();
    const window = { from: new Date(to.getTime() - WEEK_MS), to, limit: EXPLORE_LIST_SIZE };
    const [read, added] = await Promise.all([
      this.activity.topBooks(window),
      this.progress.mostAdded(window),
    ]);

    const ids = [...new Set([...read, ...added].map((row) => row.bookId))];
    const found = await this.books.findByIds(ids.map((id) => BookId.of(id)));
    const byId = new Map(found.map((book) => [book.id.value, book]));

    // A book deleted since it was read is dropped; equal scores read in title order.
    const rank = (rows: { bookId: string; score: number }[]): RankedBook[] =>
      rows
        .flatMap((row) => {
          const book = byId.get(row.bookId);
          return book ? [{ book, score: row.score }] : [];
        })
        .sort((a, b) => b.score - a.score || a.book.title.value.localeCompare(b.book.title.value));

    const trending = rank(added.map((r) => ({ bookId: r.bookId, score: r.readers })));
    // With no activity the Trending tab would be empty, so it offers a few books to start with.
    const suggestions = trending.length === 0 ? await this.books.random(EXPLORE_LIST_SIZE) : [];

    return {
      mostReadThisWeek: rank(read.map((r) => ({ bookId: r.bookId, score: r.minutes }))),
      trending,
      suggestions,
    };
  }
}
