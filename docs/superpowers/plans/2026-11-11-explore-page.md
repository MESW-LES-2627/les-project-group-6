# Explore Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Explore page (story #126). It has a big book search, a "Trending" list (most readers who added a book in 7 days) and a "Most read this week" list (most counted minutes in 7 days).

**Architecture:** `GET /explore` is served by an `ExploreService` that asks the published read contracts (`ReadingActivityQuery.topBooks`, `ReadingProgressQuery.mostAdded`) for rankings and loads the books with `IBookRepository.findByIds`. The Vue `ExploreView` reuses the global classes and existing components. It searches inline with the existing `searchBooks()` and shows the lists in tabs.

**Tech Stack:** Express 5, Drizzle ORM and Postgres, `node:test` (backend); Vue 3, vue-router 5 and Vitest with `@vue/test-utils` (frontend).

**Spec:** [`docs/superpowers/specs/2026-11-11-explore-page-design.md`](../specs/2026-11-11-explore-page-design.md)

**Running things:**
- Backend tests: `pnpm --filter @bookmarked/backend test`. Integration tests need Postgres from the root `docker-compose.yml` (`docker compose up -d`) and migrations run with `pnpm --filter @bookmarked/backend db:migrate`.
- Frontend tests: `pnpm --filter @bookmarked/frontend test`.
- Lint and types: `make check`.

---

## File map

| File | Change |
|---|---|
| `apps/backend/src/database/schema.ts`, `schema.sql`, `migrations/0008_*.sql` | `reading_status.created_at` |
| `apps/backend/src/features/reading-session/reading-activity-query.ts` | `topBooks` |
| `apps/backend/src/features/reading-status/reading-progress-query.ts` | `mostAdded` |
| `apps/backend/src/features/book/book-repository.ts`, `tests/helpers/in-memory-repositories.ts` | `findByIds` |
| `apps/backend/src/features/explore/explore-service.ts` | new: builds the two lists |
| `apps/backend/src/features/explore/explore-routes.ts` | new: `GET /explore` |
| `apps/backend/src/api/router.ts`, `src/server.ts` | wiring |
| `apps/frontend/src/components/layout/PageHeader.vue` | moved from `groups/GroupsPageHeader.vue` |
| `apps/frontend/src/services/api.ts` | `ApiExplore`, `getExplore` |
| `apps/frontend/src/components/explore/{ExploreSearchBar,BookSearchResults,TrendingBookCard}.vue` | new |
| `apps/frontend/src/views/ExploreView.vue`, `router/index.ts`, `components/layout/AppHeader.vue` | page, route, nav link |
| `docs/architecture/api_routes.md`, `docs/iterations/2/log.md`, `docs/iterations/2/LLM_LOG.md` | docs |

---

### Task 1: `reading_status.created_at` (migration 0008)

**Files:**
- Modify: `apps/backend/src/database/schema.ts` (the `readingStatus` table)
- Modify: `apps/backend/src/database/schema.sql` (`CREATE TABLE reading_status`)
- Create: `apps/backend/src/database/migrations/0008_reading_status_created_at.sql` (generated, then edited)

- [ ] **Step 1: Add the column to the Drizzle schema.** In `readingStatus`, after `finishedOn`:

```ts
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
```

- [ ] **Step 2: Generate the migration.**

Run: `cd apps/backend && pnpm drizzle-kit generate --name reading_status_created_at`
Expected: `migrations/0008_reading_status_created_at.sql` with `ALTER TABLE "reading_status" ADD COLUMN "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL;`, plus a new snapshot and journal entry.

- [ ] **Step 3: Backfill existing rows.** Append to the generated SQL:

```sql
--> statement-breakpoint
UPDATE "reading_status" SET "created_at" = "updated_at";
```

This stops every existing row from counting as "added this week".

- [ ] **Step 4: Mirror the change in `schema.sql`.** After `finished_on DATE,` add:

```sql
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
```

- [ ] **Step 5: Apply the migration and run the tests.**

Run: `pnpm --filter @bookmarked/backend db:migrate && pnpm --filter @bookmarked/backend test`
Expected: the migration applies and all existing tests pass.

- [ ] **Step 6: Commit.**

```bash
git add apps/backend/src/database
git commit -m "feat: record when a book was added to a library"
```

---

### Task 2: `ReadingActivityQuery.topBooks`

**Files:**
- Modify: `apps/backend/src/features/reading-session/reading-activity-query.ts`
- Test: `apps/backend/tests/integration/reading-activity-query.test.ts`

- [ ] **Step 1: Write the failing tests.** Add them inside the existing `describe`. The `session` helper, `ANA`, `BEN`, `dune`, `emma`, `FROM` and `TO` already exist there.

```ts
  test('ranks books by counted minutes of all readers in the window', async () => {
    await session(ANA, dune, '2026-11-02T10:00:00Z', 30);
    await session(BEN, dune, '2026-11-03T10:00:00Z', 20);
    await session(ANA, emma, '2026-11-04T10:00:00Z', 40);
    await session(BEN, emma, null, 90);
    await session(BEN, emma, '2026-10-31T10:00:00Z', 90);

    const top = await activity.topBooks({ from: FROM, to: TO, limit: 10 });

    assert.deepEqual(top, [
      { bookId: dune.id.value, minutes: 50 },
      { bookId: emma.id.value, minutes: 40 },
    ]);
  });

  test('topBooks keeps only books with minutes and caps the list', async () => {
    await session(ANA, dune, '2026-11-02T10:00:00Z', 0);
    await session(ANA, emma, '2026-11-02T11:00:00Z', 5);

    assert.deepEqual(await activity.topBooks({ from: FROM, to: TO, limit: 10 }), [
      { bookId: emma.id.value, minutes: 5 },
    ]);
    assert.equal((await activity.topBooks({ from: FROM, to: TO, limit: 0 })).length, 0);
  });
```

- [ ] **Step 2: Run the tests to make sure they fail.**

Run: `pnpm --filter @bookmarked/backend test`
Expected: FAIL with `activity.topBooks is not a function`, or a type error.

- [ ] **Step 3: Implement `topBooks`.** Add the types and the method to the interface:

```ts
/** Counted minutes all readers read in one book. */
export interface BookMinutes {
  bookId: string;
  minutes: number;
}

export interface RankingWindow {
  /** Inclusive. */
  from: Date;
  /** Exclusive. */
  to: Date;
  limit: number;
}
```

```ts
  /**
   * Books ranked by the counted minutes of all readers, with the same rule as
   * `countedMinutes`. Books with no counted minutes are left out.
   */
  topBooks(window: RankingWindow): Promise<BookMinutes[]>;
```

In `DrizzleReadingActivityQuery` (import `asc` and `desc` from `drizzle-orm`):

```ts
  async topBooks(window: RankingWindow): Promise<BookMinutes[]> {
    if (window.limit <= 0) return [];
    const minutes = sql<number>`sum(${readingSessions.countedMinutes})::int`;
    return this.db
      .select({ bookId: readingSessions.bookId, minutes })
      .from(readingSessions)
      .where(
        and(
          isNotNull(readingSessions.endedAt),
          gte(readingSessions.endedAt, window.from.toISOString()),
          lt(readingSessions.endedAt, window.to.toISOString()),
        ),
      )
      .groupBy(readingSessions.bookId)
      .having(sql`sum(${readingSessions.countedMinutes}) > 0`)
      .orderBy(desc(minutes), asc(readingSessions.bookId))
      .limit(window.limit);
  }
```

- [ ] **Step 4: Fix other implementers.** Search with `grep -rn "implements ReadingActivityQuery\|ReadingActivityQuery = {" apps/backend`. Add a `topBooks` that returns `[]` to any test fake the compiler flags.

- [ ] **Step 5: Run the tests to make sure they pass.**

Run: `pnpm --filter @bookmarked/backend test && pnpm --filter @bookmarked/backend typecheck`
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add apps/backend
git commit -m "feat: rank books by minutes read in a time window"
```

---

### Task 3: `ReadingProgressQuery.mostAdded`

**Files:**
- Modify: `apps/backend/src/features/reading-status/reading-progress-query.ts`
- Create: `apps/backend/tests/integration/reading-progress-query.test.ts`

- [ ] **Step 1: Write the failing test.**

```ts
import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../../src/database/pool.js';
import { DrizzleBookRepository } from '../../src/features/book/book-repository.js';
import { Book } from '../../src/features/book/book.js';
import { DrizzleReadingProgressQuery } from '../../src/features/reading-status/reading-progress-query.js';
import { DrizzleUserRepository } from '../../src/features/user/user-repository.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { createTestPool, truncateTables } from '../helpers/test-db.js';

const ANA = 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const BEN = 'b2eebc99-9c0b-4ef8-bb6d-6bb9bd380a22';
const CAL = 'c3eebc99-9c0b-4ef8-bb6d-6bb9bd380a33';
const FROM = new Date('2026-11-01T00:00:00Z');
const TO = new Date('2026-11-08T00:00:00Z');

describe('DrizzleReadingProgressQuery.mostAdded Integration', () => {
  const pool = createTestPool();
  const db = createDb(pool);
  const progress = new DrizzleReadingProgressQuery(db);
  let dune: Book;
  let emma: Book;

  const added = async (userId: string, book: Book, createdAt: string): Promise<void> => {
    await pool.query(
      `INSERT INTO reading_status (user_id, book_id, status, created_at, updated_at)
       VALUES ($1, $2, 'not-started', $3, $3)`,
      [userId, book.id.value, createdAt],
    );
  };

  beforeEach(async () => {
    await truncateTables(pool, ['users', 'books', 'reading_status']);
    const users = new DrizzleUserRepository(db);
    for (const [id, name] of [
      [ANA, 'ana'],
      [BEN, 'ben'],
      [CAL, 'cal'],
    ] as const) {
      await users.save(
        User.register({
          id: UserId.of(id),
          email: Email.of(`${name}@example.com`),
          username: Username.of(name),
          displayName: name,
        }),
      );
    }
    dune = Book.create({ title: 'Dune' });
    emma = Book.create({ title: 'Emma' });
    const books = new DrizzleBookRepository(db);
    await books.save(dune);
    await books.save(emma);
  });

  after(async () => {
    await truncateTables(pool, ['users', 'books', 'reading_status']);
    await pool.end();
  });

  test('ranks books by readers who added them in the window', async () => {
    await added(ANA, emma, '2026-11-02T10:00:00Z');
    await added(BEN, emma, '2026-11-03T10:00:00Z');
    await added(CAL, dune, '2026-11-07T23:59:59Z');
    await added(ANA, dune, '2026-10-31T23:59:59Z');
    await added(BEN, dune, '2026-11-08T00:00:00Z');

    assert.deepEqual(await progress.mostAdded({ from: FROM, to: TO, limit: 10 }), [
      { bookId: emma.id.value, readers: 2 },
      { bookId: dune.id.value, readers: 1 },
    ]);
  });

  test('caps the list and is empty without activity', async () => {
    assert.deepEqual(await progress.mostAdded({ from: FROM, to: TO, limit: 10 }), []);
    await added(ANA, emma, '2026-11-02T10:00:00Z');
    await added(ANA, dune, '2026-11-02T10:00:00Z');
    assert.equal((await progress.mostAdded({ from: FROM, to: TO, limit: 1 })).length, 1);
  });
});
```

- [ ] **Step 2: Run the test to make sure it fails.**

Run: `pnpm --filter @bookmarked/backend test`
Expected: FAIL with `progress.mostAdded is not a function`.

- [ ] **Step 3: Implement `mostAdded`.** In `reading-progress-query.ts` (import `asc`, `desc`, `gte`, `lt` and `sql` from `drizzle-orm`, and the `RankingWindow` type from `../reading-session/reading-activity-query.js`):

```ts
/** How many readers added one book to their library. */
export interface BookReaders {
  bookId: string;
  readers: number;
}
```

Add to the interface:

```ts
  /** Books ranked by how many readers added them to their library in [from, to). */
  mostAdded(window: RankingWindow): Promise<BookReaders[]>;
```

Add to the class:

```ts
  async mostAdded(window: RankingWindow): Promise<BookReaders[]> {
    if (window.limit <= 0) return [];
    const readers = sql<number>`count(distinct ${readingStatus.userId})::int`;
    return this.db
      .select({ bookId: readingStatus.bookId, readers })
      .from(readingStatus)
      .where(
        and(
          gte(readingStatus.createdAt, window.from.toISOString()),
          lt(readingStatus.createdAt, window.to.toISOString()),
        ),
      )
      .groupBy(readingStatus.bookId)
      .orderBy(desc(readers), asc(readingStatus.bookId))
      .limit(window.limit);
  }
```

- [ ] **Step 4: Fix other implementers.** Search with `grep -rn "ReadingProgressQuery" apps/backend/tests`. Add a `mostAdded` that returns `[]` to any fake the compiler flags.

- [ ] **Step 5: Run the tests to make sure they pass.**

Run: `pnpm --filter @bookmarked/backend test && pnpm --filter @bookmarked/backend typecheck`
Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add apps/backend
git commit -m "feat: rank books by readers who added them in a time window"
```

---

### Task 4: `IBookRepository.findByIds`

**Files:**
- Modify: `apps/backend/src/features/book/book-repository.ts`
- Modify: `apps/backend/tests/helpers/in-memory-repositories.ts` (`InMemoryBookRepository`)
- Test: `apps/backend/tests/integration/book-repository.test.ts`

- [ ] **Step 1: Write the failing test.** Add it inside the existing `describe` of `book-repository.test.ts`. It uses that file's repository variable; match its name.

```ts
  test('findByIds returns the books that exist and ignores unknown ids', async () => {
    const dune = Book.create({ title: 'Dune' });
    const emma = Book.create({ title: 'Emma' });
    await repository.save(dune);
    await repository.save(emma);

    const found = await repository.findByIds([dune.id, BookId.generate(), emma.id]);

    assert.deepEqual(found.map((b) => b.title.value).sort(), ['Dune', 'Emma']);
    assert.deepEqual(await repository.findByIds([]), []);
  });
```

- [ ] **Step 2: Run the test to make sure it fails.**

Run: `pnpm --filter @bookmarked/backend test`
Expected: FAIL with `findByIds is not a function`.

- [ ] **Step 3: Implement it.** In the interface:

```ts
  findByIds(ids: readonly BookId[]): Promise<Book[]>;
```

In `DrizzleBookRepository` (import `inArray`):

```ts
  async findByIds(ids: readonly BookId[]): Promise<Book[]> {
    if (ids.length === 0) return [];
    const rows = await this.db
      .select()
      .from(books)
      .where(inArray(books.id, ids.map((id) => id.value)));
    return rows.map(toDomain);
  }
```

In `InMemoryBookRepository`:

```ts
  async findByIds(ids: readonly BookId[]): Promise<Book[]> {
    return ids.flatMap((id) => this.books.get(id.value) ?? []);
  }
```

- [ ] **Step 4: Run the tests to make sure they pass.**

Run: `pnpm --filter @bookmarked/backend test && pnpm --filter @bookmarked/backend typecheck`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add apps/backend
git commit -m "feat: load several books by id"
```

---

### Task 5: `ExploreService`

**Files:**
- Create: `apps/backend/src/features/explore/explore-service.ts`
- Test: `apps/backend/tests/unit/explore-service.test.ts`

- [ ] **Step 1: Write the failing test.**

```ts
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Book } from '../../src/features/book/book.js';
import { ExploreService } from '../../src/features/explore/explore-service.js';
import type {
  BookMinutes,
  RankingWindow,
  ReadingActivityQuery,
} from '../../src/features/reading-session/reading-activity-query.js';
import type {
  BookReaders,
  ReadingProgressQuery,
} from '../../src/features/reading-status/reading-progress-query.js';
import { InMemoryBookRepository } from '../helpers/in-memory-repositories.js';

const NOW = new Date('2026-11-11T12:00:00Z');

function setup(minutes: BookMinutes[], readers: BookReaders[]) {
  const windows: RankingWindow[] = [];
  const activity: ReadingActivityQuery = {
    countedMinutes: async () => [],
    topBooks: async (w) => (windows.push(w), minutes),
  };
  const progress: ReadingProgressQuery = {
    progressOf: async () => [],
    mostAdded: async (w) => (windows.push(w), readers),
  };
  const books = new InMemoryBookRepository();
  const service = new ExploreService(activity, progress, books, () => NOW);
  return { service, books, windows };
}

describe('ExploreService', () => {
  test('asks both rankings for the last 7 days, 10 books each', async () => {
    const { service, windows } = setup([], []);

    await service.overview();

    assert.equal(windows.length, 2);
    for (const w of windows) {
      assert.deepEqual(w, { from: new Date('2026-11-04T12:00:00Z'), to: NOW, limit: 10 });
    }
  });

  test('keeps the ranking, orders ties by title and drops missing books', async () => {
    const dune = Book.create({ title: 'Dune' });
    const emma = Book.create({ title: 'Emma' });
    const circe = Book.create({ title: 'Circe' });
    const { service, books } = setup(
      [
        { bookId: emma.id.value, minutes: 30 },
        { bookId: dune.id.value, minutes: 30 },
        { bookId: circe.id.value, minutes: 10 },
        { bookId: 'f0000000-0000-4000-8000-000000000000', minutes: 5 },
      ],
      [{ bookId: circe.id.value, readers: 3 }],
    );
    await books.save(dune);
    await books.save(emma);
    await books.save(circe);

    const { mostReadThisWeek, trending } = await service.overview();

    assert.deepEqual(
      mostReadThisWeek.map((r) => [r.book.title.value, r.score]),
      [
        ['Dune', 30],
        ['Emma', 30],
        ['Circe', 10],
      ],
    );
    assert.deepEqual(
      trending.map((r) => [r.book.title.value, r.score]),
      [['Circe', 3]],
    );
  });

  test('gives empty lists when nobody read or added a book', async () => {
    const { service } = setup([], []);
    assert.deepEqual(await service.overview(), { mostReadThisWeek: [], trending: [] });
  });
});
```

- [ ] **Step 2: Run the test to make sure it fails.**

Run: `pnpm --filter @bookmarked/backend test`
Expected: FAIL with a module not found error for `explore-service.js`.

- [ ] **Step 3: Implement it.**

```ts
import type { Clock } from '../../utils/clock.js';
import { BookId, type Book } from '../book/book.js';
import type { IBookRepository } from '../book/book-repository.js';
import type { ReadingActivityQuery } from '../reading-session/reading-activity-query.js';
import type { ReadingProgressQuery } from '../reading-status/reading-progress-query.js';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const EXPLORE_LIST_SIZE = 10;

/** A book and its score in one list: minutes read or readers who added it. */
export interface RankedBook {
  book: Book;
  score: number;
}

export interface ExploreOverview {
  mostReadThisWeek: RankedBook[];
  trending: RankedBook[];
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

    const rank = (rows: { bookId: string; score: number }[]): RankedBook[] =>
      rows
        .flatMap((row) => {
          const book = byId.get(row.bookId);
          return book ? [{ book, score: row.score }] : [];
        })
        .sort((a, b) => b.score - a.score || a.book.title.value.localeCompare(b.book.title.value));

    return {
      mostReadThisWeek: rank(read.map((r) => ({ bookId: r.bookId, score: r.minutes }))),
      trending: rank(added.map((r) => ({ bookId: r.bookId, score: r.readers }))),
    };
  }
}
```

- [ ] **Step 4: Run the tests to make sure they pass.**

Run: `pnpm --filter @bookmarked/backend test`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add apps/backend
git commit -m "feat: build the explore lists from the reading contracts"
```

---

### Task 6: `GET /explore` route and wiring

**Files:**
- Create: `apps/backend/src/features/explore/explore-routes.ts`
- Modify: `apps/backend/src/api/router.ts`
- Modify: `apps/backend/src/server.ts`
- Test: `apps/backend/tests/integration/explore-api.test.ts`

- [ ] **Step 1: Write the failing test.**

```ts
import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { createDb } from '../../src/database/pool.js';
import { DrizzleBookRepository } from '../../src/features/book/book-repository.js';
import { Book } from '../../src/features/book/book.js';
import { DrizzleReadingActivityQuery } from '../../src/features/reading-session/reading-activity-query.js';
import { DrizzleReadingProgressQuery } from '../../src/features/reading-status/reading-progress-query.js';
import { DrizzleUserRepository } from '../../src/features/user/user-repository.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { authHeader, FakeAuthProvider } from '../helpers/auth.js';
import { withApp } from '../helpers/http.js';
import { createTestPool, truncateTables } from '../helpers/test-db.js';

const USER_ID = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a41';
const TABLES = ['users', 'books', 'reading_status', 'reading_sessions'];

describe('Explore API', () => {
  const pool = createTestPool();
  const db = createDb(pool);
  const bookRepository = new DrizzleBookRepository(db);
  const userRepository = new DrizzleUserRepository(db);
  const app = createApp({
    authProvider: new FakeAuthProvider(),
    userRepository,
    bookRepository,
    readingActivityQuery: new DrizzleReadingActivityQuery(db),
    readingProgressQuery: new DrizzleReadingProgressQuery(db),
  });
  let dune: Book;

  beforeEach(async () => {
    await truncateTables(pool, TABLES);
    await userRepository.save(
      User.register({
        id: UserId.of(USER_ID),
        email: Email.of('explore@example.com'),
        username: Username.of('explorer'),
        displayName: 'Explorer',
      }),
    );
    dune = Book.create({ title: 'Dune' });
    await bookRepository.save(dune);
  });

  after(async () => {
    await truncateTables(pool, TABLES);
    await pool.end();
  });

  test('GET /explore needs a session', async () => {
    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/explore`);
      assert.equal(response.status, 401);
    });
  });

  test('GET /explore returns empty lists without activity', async () => {
    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/explore`, { headers: authHeader(USER_ID) });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { mostReadThisWeek: [], trending: [] });
    });
  });

  test('GET /explore returns this week\'s most read and trending books', async () => {
    await pool.query(
      `INSERT INTO reading_sessions (user_id, book_id, started_at, ended_at, duration_seconds, counted_minutes)
       VALUES ($1, $2, now() - interval '1 hour', now() - interval '30 minutes', 1800, 30)`,
      [USER_ID, dune.id.value],
    );
    await pool.query(
      `INSERT INTO reading_status (user_id, book_id, status) VALUES ($1, $2, 'in-progress')`,
      [USER_ID, dune.id.value],
    );

    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/explore`, { headers: authHeader(USER_ID) });
      const body = (await response.json()) as {
        mostReadThisWeek: { book: { title: string }; minutes: number }[];
        trending: { book: { title: string }; readers: number }[];
      };
      assert.deepEqual(
        body.mostReadThisWeek.map((e) => [e.book.title, e.minutes]),
        [['Dune', 30]],
      );
      assert.deepEqual(
        body.trending.map((e) => [e.book.title, e.readers]),
        [['Dune', 1]],
      );
    });
  });
});
```

- [ ] **Step 2: Run the test to make sure it fails.**

Run: `pnpm --filter @bookmarked/backend test`
Expected: FAIL. TypeScript rejects the unknown `readingActivityQuery` option, or the route answers 404.

- [ ] **Step 3: Write the route.**

```ts
import { Router } from 'express';
import { toBookDto } from '../book/book-dto.js';
import type { ExploreService } from './explore-service.js';

// F-EXP-04: the two weekly lists of the Explore page. No activity is an empty list, not an error.
export function exploreRoutes(explore: ExploreService): Router {
  const router = Router();

  router.get('/explore', async (_req, res) => {
    const { mostReadThisWeek, trending } = await explore.overview();
    res.status(200).json({
      mostReadThisWeek: mostReadThisWeek.map((r) => ({ book: toBookDto(r.book), minutes: r.score })),
      trending: trending.map((r) => ({ book: toBookDto(r.book), readers: r.score })),
    });
  });

  return router;
}
```

- [ ] **Step 4: Wire it in `router.ts`.**
  - Add the imports: `exploreRoutes`, `ExploreService`, and the `ReadingActivityQuery` and `ReadingProgressQuery` types.
  - Add `readingActivityQuery?: ReadingActivityQuery;` and `readingProgressQuery?: ReadingProgressQuery;` to `ApiDependencies`, and add both to the destructuring.
  - Before `return router;`:

```ts
  if (bookRepository && readingActivityQuery && readingProgressQuery) {
    router.use(
      exploreRoutes(new ExploreService(readingActivityQuery, readingProgressQuery, bookRepository)),
    );
  }
```

- [ ] **Step 5: Wire it in `server.ts`.** Import `DrizzleReadingActivityQuery` and `DrizzleReadingProgressQuery`, and pass them to `createApp`:

```ts
  readingActivityQuery: new DrizzleReadingActivityQuery(db),
  readingProgressQuery: new DrizzleReadingProgressQuery(db),
```

- [ ] **Step 6: Run the tests, lint and typecheck.**

Run: `pnpm --filter @bookmarked/backend test && pnpm --filter @bookmarked/backend typecheck && pnpm --filter @bookmarked/backend lint`
Expected: PASS.

- [ ] **Step 7: Commit.**

```bash
git add apps/backend
git commit -m "feat: add the explore endpoint with trending and most read books"
```

---

### Task 7: Move the page header to `layout/PageHeader`

**Files:**
- Move: `apps/frontend/src/components/groups/GroupsPageHeader.vue` → `apps/frontend/src/components/layout/PageHeader.vue`
- Modify: `apps/frontend/src/views/CreateGroupView.vue`

- [ ] **Step 1: Move the file.** `git mv apps/frontend/src/components/groups/GroupsPageHeader.vue apps/frontend/src/components/layout/PageHeader.vue`
- [ ] **Step 2: Update `CreateGroupView.vue`.** Change the import to `import PageHeader from '@/components/layout/PageHeader.vue';` and rename both the `<GroupsPageHeader` and `</GroupsPageHeader>` tags to `PageHeader`.
- [ ] **Step 3: Run the tests.**

Run: `pnpm --filter @bookmarked/frontend test -- CreateGroupView && pnpm --filter @bookmarked/frontend typecheck`
Expected: PASS.

- [ ] **Step 4: Commit.**

```bash
git add apps/frontend
git commit -m "refactor: share the page header outside the groups pages"
```

---

### Task 8: `getExplore` API client

**Files:**
- Modify: `apps/frontend/src/services/api.ts` (after `searchBooks`)

- [ ] **Step 1: Add the type and the function.**

```ts
/** The two weekly lists of the Explore page (F-EXP-04). */
export interface ApiExplore {
  mostReadThisWeek: { book: ApiBook; minutes: number }[];
  trending: { book: ApiBook; readers: number }[];
}

export async function getExplore(): Promise<ApiExplore> {
  return getJson<ApiExplore>('/explore', 'Failed to load Explore');
}
```

- [ ] **Step 2: Typecheck.** Run `pnpm --filter @bookmarked/frontend typecheck`. Expected: PASS. The view tests in Task 12 cover the function.
- [ ] **Step 3: Commit.**

```bash
git add apps/frontend/src/services/api.ts
git commit -m "feat: add the explore api client"
```

---

### Task 9: `ExploreSearchBar`

**Files:**
- Create: `apps/frontend/src/components/explore/ExploreSearchBar.vue`
- Test: `apps/frontend/src/components/explore/__tests__/ExploreSearchBar.spec.ts`

- [ ] **Step 1: Write the failing test.**

```ts
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ExploreSearchBar from '../ExploreSearchBar.vue';

describe('ExploreSearchBar', () => {
  it('submits the trimmed query', async () => {
    const wrapper = mount(ExploreSearchBar, { props: { modelValue: '' } });

    await wrapper.get('input[type="search"]').setValue('  Dune  ');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.get('label').text()).toBe('Search books');
    expect(wrapper.emitted('submit')).toEqual([['Dune']]);
    expect(wrapper.emitted('update:modelValue')!.at(-1)).toEqual(['  Dune  ']);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails.** Run `pnpm --filter @bookmarked/frontend test -- ExploreSearchBar`. Expected: FAIL (file not found).
- [ ] **Step 3: Implement it.**

```vue
<script setup lang="ts">
// The big search field of the Explore page (F-EXP-01). It searches books by title.
const query = defineModel<string>({ default: '' });
const emit = defineEmits<{ submit: [query: string] }>();
</script>

<template>
  <form class="panel search-panel" role="search" @submit.prevent="emit('submit', query.trim())">
    <label for="explore-search" class="label">Search books</label>
    <div class="row">
      <input
        id="explore-search"
        v-model="query"
        class="field-input"
        type="search"
        placeholder="Search by title"
        autocomplete="off"
      />
      <button type="submit" class="button">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        Search
      </button>
    </div>
    <p class="muted hint">Book title</p>
  </form>
</template>

<style scoped>
.label {
  display: block;
  margin-bottom: var(--space-2);
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.row {
  display: flex;
  gap: var(--space-3);
}

.row .field-input {
  flex: 1;
  min-width: 0;
}

.hint {
  margin: var(--space-2) 0 0;
  font-size: var(--font-size-xs);
}
</style>
```

- [ ] **Step 4: Run it to make sure it passes.** Run `pnpm --filter @bookmarked/frontend test -- ExploreSearchBar`. Expected: PASS.
- [ ] **Step 5: Commit.**

```bash
git add apps/frontend/src/components/explore
git commit -m "feat: add the explore search bar"
```

---

### Task 10: `BookSearchResults`

**Files:**
- Create: `apps/frontend/src/components/explore/BookSearchResults.vue`
- Test: `apps/frontend/src/components/explore/__tests__/BookSearchResults.spec.ts`

- [ ] **Step 1: Write the failing test.**

```ts
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it } from 'vitest';
import { mapApiBookToLibraryBook } from '@/services/api';
import BookSearchResults from '../BookSearchResults.vue';

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<p />' } },
    { path: '/library/:bookId', name: 'book-detail', component: { template: '<p />' } },
  ],
});

const dune = mapApiBookToLibraryBook({
  id: 'b1',
  title: 'Dune',
  description: null,
  isbn13: null,
  pageCount: 688,
  coverUrl: null,
});

function mountResults(props: Partial<InstanceType<typeof BookSearchResults>['$props']> = {}) {
  return mount(BookSearchResults, {
    props: { query: 'Dune', books: [dune], loading: false, error: false, ...props },
    global: { plugins: [router] },
  });
}

describe('BookSearchResults', () => {
  it('lists the books with a link to each book page', async () => {
    const wrapper = mountResults();

    expect(wrapper.get('h2').text()).toBe('Books');
    expect(wrapper.text()).toContain('1 result');
    expect(wrapper.get('li').text()).toContain('Dune');
    expect(wrapper.get('li a').attributes('href')).toBe('/library/b1');

    await wrapper.get('.link-button').trigger('click');
    expect(wrapper.emitted('clear')).toHaveLength(1);
  });

  it('says when nothing matches, and when search fails', () => {
    expect(mountResults({ books: [] }).text()).toContain('No books match "Dune".');
    expect(mountResults({ error: true }).text()).toContain('Search is unavailable right now.');
    expect(mountResults({ loading: true }).text()).toContain('Searching…');
  });
});
```

- [ ] **Step 2: Run it to make sure it fails.** Run `pnpm --filter @bookmarked/frontend test -- BookSearchResults`. Expected: FAIL.
- [ ] **Step 3: Implement it.**

```vue
<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import BookCoverImage from '@/components/library/BookCoverImage.vue';
import type { LibraryBook } from '@/types/library';

const props = defineProps<{
  query: string;
  books: LibraryBook[];
  loading: boolean;
  error: boolean;
}>();
const emit = defineEmits<{ clear: [] }>();

const countLabel = computed(() =>
  props.books.length === 1 ? '1 result' : `${props.books.length} results`,
);
</script>

<template>
  <section class="panel results" aria-labelledby="results-title">
    <div class="section-heading">
      <h2 id="results-title" class="panel-heading">Books</h2>
      <p class="section-meta">
        <template v-if="!loading && !error">{{ countLabel }} · </template>
        <button type="button" class="link-button" @click="emit('clear')">Clear</button>
      </p>
    </div>

    <p v-if="loading" class="muted state">Searching…</p>
    <p v-else-if="error" class="muted state">Search is unavailable right now.</p>
    <p v-else-if="books.length === 0" class="muted state">No books match "{{ query }}".</p>
    <ul v-else class="rows">
      <li v-for="book in books" :key="book.id" class="row">
        <div class="thumb"><BookCoverImage :src="book.detailCover" :title="book.title" /></div>
        <div class="info">
          <p class="title">{{ book.title }}</p>
          <p class="muted author">{{ book.author }}</p>
        </div>
        <RouterLink
          class="button-outline button-small"
          :to="{ name: 'book-detail', params: { bookId: book.id } }"
          :aria-label="`View ${book.title}`"
        >
          View
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.section-meta {
  margin: 0;
}

.state {
  margin: var(--space-4) 0 0;
}

.rows {
  margin: var(--space-4) 0 0;
  padding: 0;
  list-style: none;
}

.row {
  display: flex;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-3) 0;
}

.row + .row {
  border-top: 1px solid var(--color-border);
}

.thumb {
  flex: none;
  width: 48px;
}

.info {
  flex: 1;
  min-width: 0;
}

.title {
  margin: 0;
  font-weight: 600;
}

.author {
  margin: 2px 0 0;
  font-size: var(--font-size-sm);
}
</style>
```

- [ ] **Step 4: Run it to make sure it passes.** Run `pnpm --filter @bookmarked/frontend test -- BookSearchResults`. Expected: PASS.
- [ ] **Step 5: Commit.**

```bash
git add apps/frontend/src/components/explore
git commit -m "feat: add the explore book search results"
```

---

### Task 11: `TrendingBookCard`

**Files:**
- Create: `apps/frontend/src/components/explore/TrendingBookCard.vue`
- Test: `apps/frontend/src/components/explore/__tests__/TrendingBookCard.spec.ts`

- [ ] **Step 1: Write the failing test.**

```ts
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it } from 'vitest';
import { mapApiBookToLibraryBook } from '@/services/api';
import TrendingBookCard from '../TrendingBookCard.vue';

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<p />' } },
    { path: '/library/:bookId', name: 'book-detail', component: { template: '<p />' } },
  ],
});

const emma = mapApiBookToLibraryBook({
  id: 'b2',
  title: 'Emma',
  description: null,
  isbn13: null,
  pageCount: 474,
  coverUrl: null,
});

describe('TrendingBookCard', () => {
  it('shows the book, its metric and a link to the book page', () => {
    const wrapper = mount(TrendingBookCard, {
      props: { book: emma, metric: '4 readers added it', rankLabel: '#1 Trending' },
      global: { plugins: [router] },
    });

    expect(wrapper.get('h3').text()).toBe('Emma');
    expect(wrapper.text()).toContain('4 readers added it');
    expect(wrapper.get('.tag-highlight').text()).toBe('#1 Trending');
    expect(wrapper.get('a').attributes('href')).toBe('/library/b2');
  });

  it('has no rank label unless given one', () => {
    const wrapper = mount(TrendingBookCard, {
      props: { book: emma, metric: '12 min read' },
      global: { plugins: [router] },
    });
    expect(wrapper.find('.tag-highlight').exists()).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to make sure it fails.** Run `pnpm --filter @bookmarked/frontend test -- TrendingBookCard`. Expected: FAIL.
- [ ] **Step 3: Implement it.**

```vue
<script setup lang="ts">
import { RouterLink } from 'vue-router';
import BookCoverImage from '@/components/library/BookCoverImage.vue';
import type { LibraryBook } from '@/types/library';

// One book of an Explore list (F-EXP-04). The reader adds it from the book page.
defineProps<{ book: LibraryBook; metric: string; rankLabel?: string }>();
</script>

<template>
  <article class="panel card">
    <div class="cover"><BookCoverImage :src="book.detailCover" :title="book.title" /></div>
    <div class="body">
      <span v-if="rankLabel" class="tag tag-highlight">{{ rankLabel }}</span>
      <h3 class="title">{{ book.title }}</h3>
      <p class="muted author">{{ book.author }}</p>
      <p class="metric">{{ metric }}</p>
      <RouterLink
        class="button-outline button-small"
        :to="{ name: 'book-detail', params: { bookId: book.id } }"
        :aria-label="`View ${book.title}`"
      >
        View book
      </RouterLink>
    </div>
  </article>
</template>

<style scoped>
.card {
  display: flex;
  gap: var(--space-4);
  height: 100%;
  padding: var(--space-4);
  box-sizing: border-box;
}

.cover {
  flex: none;
  width: 96px;
}

.body {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-1);
  min-width: 0;
}

.title {
  margin: var(--space-1) 0 0;
  font-size: var(--font-size-lg);
  line-height: 1.2;
}

.author {
  margin: 0;
  font-size: var(--font-size-sm);
}

.metric {
  margin: 0 0 var(--space-2);
  color: var(--color-copper);
  font-size: var(--font-size-sm);
}
</style>
```

- [ ] **Step 4: Run it to make sure it passes.** Run `pnpm --filter @bookmarked/frontend test -- TrendingBookCard`. Expected: PASS.
- [ ] **Step 5: Commit.**

```bash
git add apps/frontend/src/components/explore
git commit -m "feat: add the explore trending book card"
```

---

### Task 12: `ExploreView`, route and header link

**Files:**
- Create: `apps/frontend/src/views/ExploreView.vue`
- Modify: `apps/frontend/src/router/index.ts`
- Modify: `apps/frontend/src/components/layout/AppHeader.vue`
- Test: `apps/frontend/src/views/__tests__/ExploreView.spec.ts`
- Test: `apps/frontend/src/components/layout/__tests__/AppHeader.spec.ts`

- [ ] **Step 1: Write the failing view test.**

```ts
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiBook } from '@/services/api';
import ExploreView from '../ExploreView.vue';

const api = vi.hoisted(() => ({ getExplore: vi.fn(), searchBooks: vi.fn() }));
vi.mock('@/services/api', async (original) => ({
  ...(await original<typeof import('@/services/api')>()),
  ...api,
}));

const book = (id: string, title: string): ApiBook => ({
  id,
  title,
  description: null,
  isbn13: null,
  pageCount: 300,
  coverUrl: null,
});

async function mountView(path = '/explore') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/explore', name: 'explore', component: ExploreView },
      { path: '/library/:bookId', name: 'book-detail', component: { template: '<p />' } },
    ],
  });
  await router.push(path);
  const wrapper = mount({ template: '<RouterView />' }, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}

const tab = (wrapper: Awaited<ReturnType<typeof mountView>>['wrapper'], label: string) =>
  wrapper.findAll('.page-tab').find((t) => t.text() === label)!;

describe('ExploreView', () => {
  beforeEach(() => {
    api.getExplore.mockReset().mockResolvedValue({
      trending: [
        { book: book('b1', 'Circe'), readers: 3 },
        { book: book('b2', 'Emma'), readers: 1 },
      ],
      mostReadThisWeek: [{ book: book('b3', 'Dune'), minutes: 320 }],
    });
    api.searchBooks.mockReset().mockResolvedValue([book('b3', 'Dune')]);
  });

  it('shows trending books first and most read on the other tab', async () => {
    const { wrapper } = await mountView();

    expect(wrapper.get('h1').text()).toBe('Follow your curiosity.');
    expect(wrapper.findAll('.cards h3').map((h) => h.text())).toEqual(['Circe', 'Emma']);
    expect(wrapper.text()).toContain('3 readers added it');
    expect(wrapper.text()).toContain('1 reader added it');
    expect(wrapper.get('.tag-highlight').text()).toBe('#1 Trending');
    expect(wrapper.get('.cards a').attributes('href')).toBe('/library/b1');

    await tab(wrapper, 'Most read this week').trigger('click');

    expect(wrapper.findAll('.cards h3').map((h) => h.text())).toEqual(['Dune']);
    expect(wrapper.text()).toContain('320 min read');
    expect(wrapper.get('.tag-highlight').text()).toBe('#1 This week');
  });

  it('shows empty states when nobody read or added a book', async () => {
    api.getExplore.mockResolvedValue({ trending: [], mostReadThisWeek: [] });
    const { wrapper } = await mountView();

    expect(wrapper.text()).toContain('No books added this week yet.');
    await tab(wrapper, 'Most read this week').trigger('click');
    expect(wrapper.text()).toContain('No reading logged this week yet.');
  });

  it('offers to try again when the lists fail to load', async () => {
    api.getExplore.mockRejectedValueOnce(new Error('down'));
    const { wrapper } = await mountView();

    expect(wrapper.text()).toContain("Couldn't load trending books.");
    await wrapper.findAll('button').find((b) => b.text() === 'Try again')!.trigger('click');
    await flushPromises();

    expect(api.getExplore).toHaveBeenCalledTimes(2);
    expect(wrapper.findAll('.cards h3')).toHaveLength(2);
  });

  it('searches from the bar, keeps the query in the URL and clears it', async () => {
    const { wrapper, router } = await mountView();

    await wrapper.get('input[type="search"]').setValue('Dune');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(router.currentRoute.value.query.q).toBe('Dune');
    expect(api.searchBooks).toHaveBeenCalledWith('Dune');
    expect(wrapper.get('.results').text()).toContain('Dune');
    expect(wrapper.find('.cards').exists()).toBe(true);

    await wrapper.get('.results .link-button').trigger('click');
    await flushPromises();

    expect(router.currentRoute.value.query.q).toBeUndefined();
    expect(wrapper.find('.results').exists()).toBe(false);
  });

  it('runs the search from the URL on load', async () => {
    const { wrapper } = await mountView('/explore?q=Dune');

    expect(api.searchBooks).toHaveBeenCalledWith('Dune');
    expect((wrapper.get('input[type="search"]').element as HTMLInputElement).value).toBe('Dune');
  });
});
```

- [ ] **Step 2: Add the header test.** Add a second `it` to `AppHeader.spec.ts`:

```ts
  it('links Explore to the explore page', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:any(.*)*', component: { template: '<p />' } }],
    });
    const wrapper = mount(AppHeader, {
      props: { initials: 'EW', unreadNotifications: 0 },
      global: { plugins: [router] },
    });

    const explore = wrapper.findAll('.nav-link').find((l) => l.text() === 'Explore')!;
    expect(explore.attributes('href')).toBe('/explore');
  });
```

- [ ] **Step 3: Run the tests to make sure they fail.** Run `pnpm --filter @bookmarked/frontend test -- ExploreView AppHeader`. Expected: FAIL. The view is missing and the Explore href is `#`.

- [ ] **Step 4: Implement the view.**

```vue
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import BookSearchResults from '@/components/explore/BookSearchResults.vue';
import ExploreSearchBar from '@/components/explore/ExploreSearchBar.vue';
import TrendingBookCard from '@/components/explore/TrendingBookCard.vue';
import PageHeader from '@/components/layout/PageHeader.vue';
import { getExplore, mapApiBookToLibraryBook, searchBooks, type ApiExplore } from '@/services/api';
import type { LibraryBook } from '@/types/library';

type TabId = 'trending' | 'most-read';

const TABS: { id: TabId; label: string; rankLabel: string; emptyText: string }[] = [
  {
    id: 'trending',
    label: 'Trending',
    rankLabel: '#1 Trending',
    emptyText: 'No books added this week yet.',
  },
  {
    id: 'most-read',
    label: 'Most read this week',
    rankLabel: '#1 This week',
    emptyText: 'No reading logged this week yet.',
  },
];

const route = useRoute();
const router = useRouter();

// F-EXP-04: the two weekly lists.
const overview = ref<ApiExplore | null>(null);
const loading = ref(true);
const loadError = ref(false);
const activeTab = ref<TabId>('trending');
const tab = computed(() => TABS.find((t) => t.id === activeTab.value)!);

async function loadOverview() {
  loading.value = true;
  loadError.value = false;
  try {
    overview.value = await getExplore();
  } catch {
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

onMounted(loadOverview);

const cards = computed<{ book: LibraryBook; metric: string }[]>(() => {
  if (!overview.value) return [];
  if (activeTab.value === 'trending') {
    return overview.value.trending.map((entry) => ({
      book: mapApiBookToLibraryBook(entry.book),
      metric: entry.readers === 1 ? '1 reader added it' : `${entry.readers} readers added it`,
    }));
  }
  return overview.value.mostReadThisWeek.map((entry) => ({
    book: mapApiBookToLibraryBook(entry.book),
    metric: `${entry.minutes} min read`,
  }));
});

// F-EXP-01: the search lives in `?q=`, so reload and back keep it.
const query = computed(() => (typeof route.query.q === 'string' ? route.query.q.trim() : ''));
const draft = ref(query.value);
const results = ref<LibraryBook[]>([]);
const searching = ref(false);
const searchError = ref(false);
let latestSearch = 0;

watch(
  query,
  async (q) => {
    draft.value = q;
    results.value = [];
    searchError.value = false;
    if (!q) return;
    const id = ++latestSearch;
    searching.value = true;
    try {
      const found = await searchBooks(q);
      if (id === latestSearch) results.value = found.map((b) => mapApiBookToLibraryBook(b));
    } catch {
      if (id === latestSearch) searchError.value = true;
    } finally {
      if (id === latestSearch) searching.value = false;
    }
  },
  { immediate: true },
);

function search(q: string) {
  void router.push({ name: 'explore', query: q ? { q } : {} });
}
</script>

<template>
  <main class="page-column explore">
    <PageHeader
      eyebrow="Discover something good"
      title="Follow your curiosity."
      subtitle="Your next favorite book might be one search away."
    />

    <ExploreSearchBar v-model="draft" @submit="search" />

    <BookSearchResults
      v-if="query"
      :query="query"
      :books="results"
      :loading="searching"
      :error="searchError"
      @clear="search('')"
    />

    <section class="trending" aria-labelledby="trending-title">
      <h2 id="trending-title" class="trending-title">A good time to pick these up.</h2>
      <div class="page-tabs" role="group" aria-label="Book lists">
        <button
          v-for="t in TABS"
          :key="t.id"
          type="button"
          :class="['page-tab', { active: activeTab === t.id }]"
          :aria-pressed="activeTab === t.id"
          @click="activeTab = t.id"
        >
          {{ t.label }}
        </button>
      </div>

      <p v-if="loading" class="muted state">Loading…</p>
      <div v-else-if="loadError" class="state">
        <p class="muted">Couldn't load trending books.</p>
        <button type="button" class="button-outline button-small" @click="loadOverview">
          Try again
        </button>
      </div>
      <p v-else-if="cards.length === 0" class="muted state">{{ tab.emptyText }}</p>
      <ul v-else class="cards">
        <li v-for="(card, index) in cards" :key="card.book.id">
          <TrendingBookCard
            :book="card.book"
            :metric="card.metric"
            :rank-label="index === 0 ? tab.rankLabel : undefined"
          />
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.explore {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding-top: var(--space-8);
  padding-bottom: var(--space-8);
}

.trending-title {
  margin: var(--space-4) 0 var(--space-2);
  font-size: var(--font-size-xl);
}

.state {
  margin-top: var(--space-6);
}

.state p {
  margin: 0 0 var(--space-3);
}

.cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-4);
  margin: var(--space-6) 0 0;
  padding: 0;
  list-style: none;
}

@media (max-width: 899px) {
  .cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 599px) {
  .cards {
    grid-template-columns: 1fr;
  }
}
</style>
```

Note: `PageHeader` already gives `h1` its size and `padding-bottom`. Check that the tokens `--space-8` and `--font-size-xl` exist in `assets/styles/tokens.css`, and use the nearest existing token if not.

- [ ] **Step 5: Add the route.** In `router/index.ts`, after the `groups/:groupId` route:

```ts
    {
      path: '/explore',
      name: 'explore',
      component: () => import('../views/ExploreView.vue'),
    },
```

- [ ] **Step 6: Link the header.** In `AppHeader.vue`, replace the `navItems` block (and its "Explore has no route yet" comment) with:

```ts
const navItems = [
  { label: 'Home', to: '/home' },
  { label: 'Library', to: '/library' },
  { label: 'Groups', to: '/groups' },
  { label: 'Explore', to: '/explore' },
  { label: 'Profile', to: '/profile' },
];
```

Every item now has a route, so the nav template becomes:

```vue
        <RouterLink
          v-for="item in navItems"
          :key="item.label"
          :to="item.to"
          class="nav-link"
          active-class="active"
        >
          {{ item.label }}
        </RouterLink>
```

- [ ] **Step 7: Run the frontend checks.**

Run: `pnpm --filter @bookmarked/frontend test && pnpm --filter @bookmarked/frontend typecheck && pnpm --filter @bookmarked/frontend lint`
Expected: PASS.

- [ ] **Step 8: Check it in the browser.** Run the backend and frontend (`make dev`), sign in, and open `/explore`. Check the hero, the search with "Dune", Clear, both tabs, the empty states and a book link. Check it at about 375px wide too.

- [ ] **Step 9: Commit.**

```bash
git add apps/frontend
git commit -m "feat: add the explore page with search and trending books"
```

---

### Task 13: Docs

**Files:**
- Modify: `docs/architecture/api_routes.md`
- Modify: `docs/iterations/2/log.md`
- Modify: `docs/iterations/2/LLM_LOG.md`

- [ ] **Step 1: API routes.** After the Library section of `api_routes.md`, add:

```markdown
### Explore (`features/explore/explore-routes.ts`)

| Method | Path | Description |
|---|---|---|
| GET | `/explore` | The Explore lists (F-EXP-04): `mostReadThisWeek` (top 10 books by counted minutes of sessions that ended in the last 7 days) and `trending` (top 10 books by readers who added them to their library in the last 7 days). Empty lists when there is no activity. |
```

- [ ] **Step 2: Iteration log.** Add a `### 2026-11-11: Explore page built (#126)` entry with:
  - The commits.
  - Migration 0008, which runs with the CD on merge.
  - The new contract methods.
  - The test counts (backend and frontend).
  - That `GroupsPageHeader` became `layout/PageHeader`.

  Also update the Status table (add an `Explore (F-EXP-04)` row).

- [ ] **Step 3: LLM log.** Add an entry for the implementation, with the prompt `implement the spec` and a short result.

- [ ] **Step 4: Commit.**

```bash
git add docs
git commit -m "docs: log the explore page"
```

---

## Self-review against the spec

| Spec item | Task |
|---|---|
| Migration 0008 with backfill | 1 |
| `topBooks` with the ended-in-window rule | 2 |
| `mostAdded` | 3 |
| `findByIds` | 4 |
| `ExploreService` (7-day window, limit 10, ties by title, drop missing books) | 5 |
| `GET /explore`, auth, empty `200` | 6 |
| Move `PageHeader` | 7 |
| `getExplore` | 8 |
| Search bar, results panel, trending card | 9, 10, 11 |
| View: tabs, states, `?q=`, results above trending, header link | 12 |
| `api_routes.md`, logs | 13 |
