# Rate and Review a Book Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a reader rate a book 1 to 5 with an optional comment, edit and delete it, and see their own, their friends' and public reviews on the book page and their reviews on the profile (story #122, F-LIB-02).

**Architecture:** A new `features/review/` backend module over the existing `reviews` table: a `Review` entity with `Rating` and `ReviewComment` value objects, a Drizzle repository (upsert on `(user_id, book_id)`), a read-side `ReviewQuery` for the book page and profile lists, a `ReviewService` that gates writes on the reader's `ReadingState`, and Express routes. The Vue book page and profile call four new API functions instead of mock data.

**Tech Stack:** TypeScript, Express 5, Drizzle ORM on PostgreSQL, `node:test` via `tsx` (backend); Vue 3, Vitest, Vue Test Utils (frontend).

**Spec:** [2026-11-13-rate-review-book-design.md](../specs/2026-11-13-rate-review-book-design.md)

---

## File map

Backend (`apps/backend/`):

| File | Change | Responsibility |
|---|---|---|
| `src/database/schema.ts` | Modify | `reviews.updated_at`, unique `(user_id, book_id)`, index `(book_id, created_at)` |
| `src/database/migrations/0010_review_per_book.sql` (+ snapshot, journal) | Create | The same in SQL, deduplicating first |
| `src/database/schema.sql` | Modify | Reference DDL kept in sync |
| `src/features/reading-status/reading-state.ts` | Modify | `allowsReview` on each state |
| `src/features/reading-status/reading-status.ts` | Modify | `allowsReview` getter |
| `src/features/review/review.ts` | Create | `Rating`, `ReviewComment`, `ReviewId`, `Review`, errors |
| `src/features/review/review-repository.ts` | Create | `IReviewRepository` and the Drizzle mapper |
| `src/features/review/review-query.ts` | Create | Book page and profile read models |
| `src/features/review/review-service.ts` | Create | Use cases: write, remove, list for book, list for profile |
| `src/features/review/review-dto.ts` | Create | Wire shape of a saved review |
| `src/features/review/review-routes.ts` | Create | HTTP |
| `src/api/router.ts`, `src/server.ts` | Modify | Wiring |
| `tests/helpers/in-memory-repositories.ts` | Modify | `InMemoryReviewRepository`, `InMemoryReviewQuery` |
| `tests/unit/review.test.ts`, `tests/unit/review-service.test.ts` | Create | Domain and service |
| `tests/unit/reading-status.test.ts` | Modify | `allowsReview` |
| `tests/integration/review-api.test.ts` | Create | Routes, query visibility, acceptance scenarios |

Frontend (`apps/frontend/src/`):

| File | Change | Responsibility |
|---|---|---|
| `services/api.ts` | Modify | `ApiReview*` types, `saveReview`, `deleteReview`, `getBookReviews`, `getUserReviews` |
| `components/library/BookThoughtsPanel.vue` | Rewrite script and template | My review form, gating, save, delete |
| `components/library/ReviewItem.vue` | Modify | Optional quote |
| `views/BookDetailView.vue` | Modify | Real friend and public lists and average |
| `components/profile/ReviewList.vue` | Create | Profile "Reviews" section |
| `views/ProfileView.vue` | Modify | Loads and shows reviews |
| `types/library.ts`, `mocks/library.ts` | Modify | Drop mock review fields |
| `components/library/__tests__/BookThoughtsPanel.spec.ts` | Create | Panel tests |
| `views/__tests__/BookDetailView.spec.ts`, `views/__tests__/ProfileView.spec.ts` | Modify | View tests |

Docs: `apps/backend/README.md`, `docs/iterations/2/log.md`, `docs/iterations/2/LLM_LOG.md`.

Commands (from the repository root): backend tests `pnpm --filter @bookmarked/backend test`, frontend tests `pnpm --filter @bookmarked/frontend test`, everything `make check`. Backend integration tests need the local database (`docker compose up -d`) with migrations applied (`pnpm --filter @bookmarked/backend db:migrate`).

---

### Task 1: Migration — one review per reader per book

**Files:**
- Modify: `apps/backend/src/database/schema.ts` (the `reviews` table)
- Create: `apps/backend/src/database/migrations/0010_review_per_book.sql` (generated, then edited)
- Modify: `apps/backend/src/database/schema.sql` (the `reviews` table)

- [ ] **Step 1: Change the Drizzle schema**

In `schema.ts`, replace the `reviews` table with:

```ts
export const reviews = pgTable(
  'reviews',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    bookId: uuid('book_id').notNull(),
    rating: integer().notNull(),
    comment: text(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'reviews_user_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [books.id],
      name: 'reviews_book_id_fkey',
    }).onDelete('cascade'),
    check('reviews_rating_check', sql`(rating >= 1) AND (rating <= 5)`),
    // F-LIB-02: one review per reader per book; saving again replaces it.
    unique('reviews_user_id_book_id_key').on(table.userId, table.bookId),
    index('reviews_book_id_created_at_idx').on(table.bookId, table.createdAt.desc()),
  ],
);
```

- [ ] **Step 2: Generate the migration**

Run: `cd apps/backend && pnpm drizzle-kit generate --name review_per_book`
Expected: `0010_review_per_book.sql`, `meta/0010_snapshot.json` and a journal entry are created.

- [ ] **Step 3: Deduplicate before the unique constraint**

Put this at the top of `0010_review_per_book.sql`, before the generated `ALTER TABLE` statements (same approach as `0001`):

```sql
-- Keep only the newest review per (user_id, book_id) before enforcing uniqueness.
DELETE FROM "reviews" a
USING "reviews" b
WHERE a."user_id" = b."user_id"
  AND a."book_id" = b."book_id"
  AND (a."created_at", a."id") < (b."created_at", b."id");--> statement-breakpoint
```

The generated part must add `updated_at`, the unique constraint and the index. Check that it has nothing else.

- [ ] **Step 4: Keep `schema.sql` in sync**

In the `CREATE TABLE reviews` block of `schema.sql`, add `updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP` and `CONSTRAINT reviews_user_id_book_id_key UNIQUE (user_id, book_id)`, and after the table:

```sql
CREATE INDEX reviews_book_id_created_at_idx ON reviews (book_id, created_at DESC);
```

- [ ] **Step 5: Apply it**

Run: `pnpm --filter @bookmarked/backend db:migrate`
Expected: `Migrations applied successfully!`

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/database
git commit -m "feat: keep one review per reader and book"
```

---

### Task 2: Reading states say whether a review is allowed

**Files:**
- Modify: `apps/backend/src/features/reading-status/reading-state.ts`
- Modify: `apps/backend/src/features/reading-status/reading-status.ts`
- Test: `apps/backend/tests/unit/reading-status.test.ts`

- [ ] **Step 1: Write the failing test** (append inside the file's top-level `describe`, or as a new `describe`)

```ts
describe('ReadingState.allowsReview (F-LIB-02)', () => {
  const cases = [
    ['not-started', false],
    ['in-progress', true],
    ['finished', true],
    ['did-not-finish', true],
  ] as const;
  for (const [type, expected] of cases) {
    test(`${type} ${expected ? 'allows' : 'does not allow'} a review`, () => {
      assert.equal(ReadingState.of(type).allowsReview, expected);
    });
  }
});
```

Import `ReadingState` from `../../src/features/reading-status/reading-state.js` if the file does not already.

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @bookmarked/backend exec tsx --test tests/unit/reading-status.test.ts`
Expected: FAIL, `allowsReview` is `undefined`.

- [ ] **Step 3: Implement**

In `reading-state.ts`, under `tracksProgress` in the abstract class:

```ts
  /** Whether the reader can rate and review the book in this state (F-LIB-02). */
  abstract readonly allowsReview: boolean;
```

Then add `readonly allowsReview = false;` to `NotStarted` and `readonly allowsReview = true;` to `InProgress`, `Finished` and `DidNotFinish`.

In `reading-status.ts`, under `get tracksProgress()`:

```ts
  get allowsReview(): boolean {
    return this.state.allowsReview;
  }
```

- [ ] **Step 4: Run it to see it pass**

Same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/features/reading-status apps/backend/tests/unit/reading-status.test.ts
git commit -m "feat: let each reading state say if it allows a review"
```

---

### Task 3: Review domain model

**Files:**
- Create: `apps/backend/src/features/review/review.ts`
- Test: `apps/backend/tests/unit/review.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  InvalidRatingError,
  Rating,
  Review,
  ReviewComment,
} from '../../src/features/review/review.js';
import { BookId } from '../../src/features/book/book.js';
import { UserId } from '../../src/features/user/user.js';
import { InvalidValueError } from '../../src/utils/errors.js';

const USER = UserId.of('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
const BOOK = BookId.of('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21');

describe('Rating', () => {
  test('accepts 1 to 5', () => {
    assert.equal(Rating.of(1).value, 1);
    assert.equal(Rating.of(5).value, 5);
  });

  for (const raw of [0, 6, 2.5, '4', null, undefined]) {
    test(`rejects ${String(raw)}`, () => {
      assert.throws(() => Rating.of(raw), (e: unknown) => {
        assert.ok(e instanceof InvalidRatingError);
        assert.equal((e as Error).message, 'Rating must be between 1 and 5');
        return true;
      });
    });
  }
});

describe('ReviewComment', () => {
  test('trims the text', () => {
    assert.equal(ReviewComment.of('  Great world building ').text, 'Great world building');
  });

  test('maps empty, missing and null to null', () => {
    assert.equal(ReviewComment.of('   ').text, null);
    assert.equal(ReviewComment.of(undefined).text, null);
    assert.equal(ReviewComment.of(null).text, null);
  });

  test('accepts 2000 characters and rejects 2001', () => {
    assert.equal(ReviewComment.of('a'.repeat(2000)).text?.length, 2000);
    assert.throws(
      () => ReviewComment.of('a'.repeat(2001)),
      (e: unknown) =>
        e instanceof InvalidValueError &&
        e.message === 'Comment must be at most 2000 characters',
    );
  });

  test('rejects a non-string', () => {
    assert.throws(() => ReviewComment.of(42), InvalidValueError);
  });
});

describe('Review', () => {
  test('write sets both dates and revise changes the text and updatedAt only', () => {
    const written = new Date('2026-11-01T10:00:00Z');
    const review = Review.write(USER, BOOK, Rating.of(4), ReviewComment.of('Good'), written);
    assert.equal(review.rating.value, 4);
    assert.equal(review.comment.text, 'Good');
    assert.deepEqual(review.createdAt, written);

    const later = new Date('2026-11-02T10:00:00Z');
    review.revise(Rating.of(5), ReviewComment.of(''), later);
    assert.equal(review.rating.value, 5);
    assert.equal(review.comment.text, null);
    assert.deepEqual(review.createdAt, written);
    assert.deepEqual(review.updatedAt, later);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @bookmarked/backend exec tsx --test tests/unit/review.test.ts`
Expected: FAIL, cannot find module `review.js`.

- [ ] **Step 3: Implement `review.ts`**

```ts
import crypto from 'node:crypto';
import { BusinessRuleViolationError, InvalidValueError } from '../../utils/errors.js';
import { Uuid } from '../../utils/uuid.js';
import type { BookId } from '../book/book.js';
import type { UserId } from '../user/user.js';

export class InvalidRatingError extends InvalidValueError {
  constructor() {
    super('Rating must be between 1 and 5');
  }
}

export class ReviewNotAllowedError extends BusinessRuleViolationError {
  constructor() {
    super('Start reading this book before reviewing it');
  }
}

/** A star rating from 1 to 5 (F-LIB-02 rule 1). */
export class Rating {
  private constructor(readonly value: number) {}

  static of(raw: unknown): Rating {
    if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 1 || raw > 5) {
      throw new InvalidRatingError();
    }
    return new Rating(raw);
  }
}

export const MAX_COMMENT_LENGTH = 2000;

/** The optional text of a review: trimmed, and `null` when empty. */
export class ReviewComment {
  private constructor(readonly text: string | null) {}

  static of(raw: unknown): ReviewComment {
    if (raw === undefined || raw === null) return new ReviewComment(null);
    if (typeof raw !== 'string') throw new InvalidValueError('Comment must be text');
    const text = raw.trim();
    if (text.length > MAX_COMMENT_LENGTH) {
      throw new InvalidValueError(`Comment must be at most ${MAX_COMMENT_LENGTH} characters`);
    }
    return new ReviewComment(text === '' ? null : text);
  }
}

export class ReviewId extends Uuid {
  declare private readonly brand: 'ReviewId';

  static of(raw: unknown): ReviewId {
    return new ReviewId(Uuid.parse(raw, 'review id'));
  }

  static generate(): ReviewId {
    return new ReviewId(crypto.randomUUID());
  }
}

export interface ReviewState {
  id: ReviewId;
  userId: UserId;
  bookId: BookId;
  rating: Rating;
  comment: ReviewComment;
  createdAt: Date;
  updatedAt: Date;
}

// Aggregate root: one reader's opinion of one book. References both by ID only.
export class Review {
  readonly id: ReviewId;
  readonly userId: UserId;
  readonly bookId: BookId;
  readonly createdAt: Date;
  private _rating: Rating;
  private _comment: ReviewComment;
  private _updatedAt: Date;

  private constructor(state: ReviewState) {
    this.id = state.id;
    this.userId = state.userId;
    this.bookId = state.bookId;
    this.createdAt = state.createdAt;
    this._rating = state.rating;
    this._comment = state.comment;
    this._updatedAt = state.updatedAt;
  }

  static write(
    userId: UserId,
    bookId: BookId,
    rating: Rating,
    comment: ReviewComment,
    now: Date = new Date(),
  ): Review {
    return new Review({
      id: ReviewId.generate(),
      userId,
      bookId,
      rating,
      comment,
      createdAt: now,
      updatedAt: now,
    });
  }

  /** Rebuilds a stored review (used by the repository). */
  static reconstitute(state: ReviewState): Review {
    return new Review(state);
  }

  get rating(): Rating {
    return this._rating;
  }

  get comment(): ReviewComment {
    return this._comment;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /** Replaces the rating and comment; only the new ones are kept (story #122, "Edit my review"). */
  revise(rating: Rating, comment: ReviewComment, now: Date = new Date()): void {
    this._rating = rating;
    this._comment = comment;
    this._updatedAt = now;
  }
}
```

- [ ] **Step 4: Run it to see it pass**

Same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/features/review/review.ts apps/backend/tests/unit/review.test.ts
git commit -m "feat: add the review domain model"
```

---

### Task 4: Repository, query contract and in-memory doubles

**Files:**
- Create: `apps/backend/src/features/review/review-repository.ts`
- Create: `apps/backend/src/features/review/review-query.ts` (views and interface only in this task; Drizzle implementation in Task 6)
- Modify: `apps/backend/tests/helpers/in-memory-repositories.ts`

- [ ] **Step 1: Write `review-repository.ts`**

```ts
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { reviews } from '../../database/schema.js';
import { BookId } from '../book/book.js';
import { UserId } from '../user/user.js';
import { Rating, Review, ReviewComment, ReviewId } from './review.js';

export interface IReviewRepository {
  findByUserAndBook(userId: UserId, bookId: BookId): Promise<Review | null>;
  /** Inserts, or replaces the rating and comment of the reader's review of that book. */
  save(review: Review): Promise<void>;
  delete(userId: UserId, bookId: BookId): Promise<boolean>;
}

type ReviewRow = typeof reviews.$inferSelect;

// Data Mapper: the only place that knows both the reviews row and the aggregate.
function toDomain(row: ReviewRow): Review {
  return Review.reconstitute({
    id: ReviewId.of(row.id),
    userId: UserId.of(row.userId),
    bookId: BookId.of(row.bookId),
    rating: Rating.of(row.rating),
    comment: ReviewComment.of(row.comment),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  });
}

export class DrizzleReviewRepository implements IReviewRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async findByUserAndBook(userId: UserId, bookId: BookId): Promise<Review | null> {
    const rows = await this.db
      .select()
      .from(reviews)
      .where(and(eq(reviews.userId, userId.value), eq(reviews.bookId, bookId.value)))
      .limit(1);
    const row = rows[0];
    return row ? toDomain(row) : null;
  }

  async save(review: Review): Promise<void> {
    await this.db
      .insert(reviews)
      .values({
        id: review.id.value,
        userId: review.userId.value,
        bookId: review.bookId.value,
        rating: review.rating.value,
        comment: review.comment.text,
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString(),
      })
      .onConflictDoUpdate({
        target: [reviews.userId, reviews.bookId],
        set: {
          rating: review.rating.value,
          comment: review.comment.text,
          updatedAt: review.updatedAt.toISOString(),
        },
      });
  }

  async delete(userId: UserId, bookId: BookId): Promise<boolean> {
    const result = await this.db
      .delete(reviews)
      .where(and(eq(reviews.userId, userId.value), eq(reviews.bookId, bookId.value)))
      .returning({ id: reviews.id });
    return result.length > 0;
  }
}
```

- [ ] **Step 2: Write the query contract in `review-query.ts`**

```ts
import type { BookId } from '../book/book.js';
import type { UserId } from '../user/user.js';

// Read side (CQRS): review lists join reviews, users, friendships and books.
export interface ReviewAuthorView {
  id: string;
  username: string;
  displayName: string;
  photoUrl: string | null;
}

export interface ReviewView {
  id: string;
  bookId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  author: ReviewAuthorView;
}

export interface BookReviewsView {
  mine: ReviewView | null;
  friends: ReviewView[];
  publicReviews: ReviewView[];
  /** Average over public-profile authors, one decimal; `null` when there are none. */
  publicAverage: number | null;
  publicCount: number;
}

export interface ProfileReviewView {
  book: { id: string; title: string; coverUrl: string | null };
  rating: number;
  comment: string | null;
  updatedAt: string;
}

export const PUBLIC_REVIEWS_PAGE = 10;

export interface ReviewQuery {
  forBook(bookId: BookId, viewerId: UserId): Promise<BookReviewsView>;
  /** Every review the user wrote, newest first. Access is checked by the service. */
  forUser(userId: UserId): Promise<ProfileReviewView[]>;
}
```

- [ ] **Step 3: Add the in-memory doubles** to `tests/helpers/in-memory-repositories.ts`

Imports at the top:

```ts
import type { Review } from '../../src/features/review/review.js';
import type { IReviewRepository } from '../../src/features/review/review-repository.js';
import type {
  BookReviewsView,
  ProfileReviewView,
  ReviewQuery,
} from '../../src/features/review/review-query.js';
```

Classes at the end:

```ts
export class InMemoryReviewRepository implements IReviewRepository {
  private readonly reviews = new Map<string, Review>();

  async findByUserAndBook(userId: UserId, bookId: BookId): Promise<Review | null> {
    return this.reviews.get(`${userId.value}:${bookId.value}`) ?? null;
  }

  async save(review: Review): Promise<void> {
    this.reviews.set(`${review.userId.value}:${review.bookId.value}`, review);
  }

  async delete(userId: UserId, bookId: BookId): Promise<boolean> {
    return this.reviews.delete(`${userId.value}:${bookId.value}`);
  }
}

/** Records the calls; the visibility rules are covered by the integration tests. */
export class InMemoryReviewQuery implements ReviewQuery {
  readonly profileCalls: string[] = [];

  async forBook(): Promise<BookReviewsView> {
    return { mine: null, friends: [], publicReviews: [], publicAverage: null, publicCount: 0 };
  }

  async forUser(userId: UserId): Promise<ProfileReviewView[]> {
    this.profileCalls.push(userId.value);
    return [];
  }
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @bookmarked/backend typecheck`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/features/review apps/backend/tests/helpers/in-memory-repositories.ts
git commit -m "feat: add the review repository and query contract"
```

---

### Task 5: Review service

**Files:**
- Create: `apps/backend/src/features/review/review-service.ts`
- Test: `apps/backend/tests/unit/review-service.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Book } from '../../src/features/book/book.js';
import { ReadingStatus } from '../../src/features/reading-status/reading-status.js';
import { ReviewService } from '../../src/features/review/review-service.js';
import {
  InvalidRatingError,
  ReviewNotAllowedError,
} from '../../src/features/review/review.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { ForbiddenError, NotFoundError } from '../../src/utils/errors.js';
import {
  InMemoryBookRepository,
  InMemoryFriendRepository,
  InMemoryReadingStatusRepository,
  InMemoryReviewQuery,
  InMemoryReviewRepository,
  InMemoryUserRepository,
} from '../helpers/in-memory-repositories.js';

const READER = 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const FRIEND = 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
const STRANGER = 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';

describe('ReviewService', () => {
  let books: InMemoryBookRepository;
  let statuses: InMemoryReadingStatusRepository;
  let reviews: InMemoryReviewRepository;
  let users: InMemoryUserRepository;
  let friends: InMemoryFriendRepository;
  let query: InMemoryReviewQuery;
  let service: ReviewService;
  let dune: Book;

  const shelve = async (status: 'not-started' | 'in-progress' | 'finished' | 'did-not-finish') => {
    const entry = ReadingStatus.create(UserId.of(READER), dune.id);
    // DNF is only reachable from In progress.
    if (status === 'did-not-finish') entry.startReading();
    entry.changeStatus(status, dune.pageCount);
    await statuses.save(entry);
  };

  const register = async (id: string, name: string) => {
    await users.save(
      User.register({
        id: UserId.of(id),
        email: Email.of(`${name}@example.com`),
        username: Username.of(name),
        displayName: name,
      }),
    );
  };

  beforeEach(async () => {
    books = new InMemoryBookRepository();
    statuses = new InMemoryReadingStatusRepository();
    reviews = new InMemoryReviewRepository();
    users = new InMemoryUserRepository();
    friends = new InMemoryFriendRepository();
    query = new InMemoryReviewQuery();
    service = new ReviewService(reviews, statuses, books, users, friends, query);
    dune = Book.create({ title: 'Dune', pageCount: 688 });
    await books.save(dune);
    await register(READER, 'reader');
    await register(FRIEND, 'friend');
    await register(STRANGER, 'stranger');
    friends.befriend(UserId.of(READER), UserId.of(FRIEND));
  });

  for (const status of ['in-progress', 'finished', 'did-not-finish'] as const) {
    test(`writes a review while ${status}`, async () => {
      await shelve(status);
      const review = await service.write({
        userId: READER,
        bookId: dune.id.value,
        rating: 4,
        comment: 'Great world building',
      });
      assert.equal(review.rating.value, 4);
      assert.equal(review.comment.text, 'Great world building');
    });
  }

  test('refuses a book that is not started', async () => {
    await shelve('not-started');
    await assert.rejects(
      service.write({ userId: READER, bookId: dune.id.value, rating: 4 }),
      ReviewNotAllowedError,
    );
  });

  test('refuses a book that is not in the library', async () => {
    await assert.rejects(
      service.write({ userId: READER, bookId: dune.id.value, rating: 4 }),
      ReviewNotAllowedError,
    );
  });

  test('refuses an unknown book', async () => {
    await assert.rejects(
      service.write({ userId: READER, bookId: 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', rating: 4 }),
      NotFoundError,
    );
  });

  test('rejects a rating out of range', async () => {
    await shelve('finished');
    await assert.rejects(
      service.write({ userId: READER, bookId: dune.id.value, rating: 6 }),
      InvalidRatingError,
    );
  });

  test('editing keeps one review with only the new values', async () => {
    await shelve('finished');
    const first = await service.write({ userId: READER, bookId: dune.id.value, rating: 4, comment: 'Good' });
    const second = await service.write({ userId: READER, bookId: dune.id.value, rating: 5, comment: 'Better' });
    assert.ok(second.id.equals(first.id));
    const stored = await reviews.findByUserAndBook(UserId.of(READER), dune.id);
    assert.equal(stored?.rating.value, 5);
    assert.equal(stored?.comment.text, 'Better');
  });

  test('remove deletes the review and is idempotent', async () => {
    await shelve('finished');
    await service.write({ userId: READER, bookId: dune.id.value, rating: 4 });
    await service.remove(READER, dune.id.value);
    await service.remove(READER, dune.id.value);
    assert.equal(await reviews.findByUserAndBook(UserId.of(READER), dune.id), null);
  });

  test('forBook refuses an unknown book', async () => {
    await assert.rejects(
      service.forBook('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', READER),
      NotFoundError,
    );
  });

  test('profile reviews: the owner and a friend can see a private profile', async () => {
    await service.forProfile(READER, READER);
    await service.forProfile(READER, FRIEND);
    assert.deepEqual(query.profileCalls, [READER, READER]);
  });

  test('profile reviews: a stranger cannot see a private profile', async () => {
    await assert.rejects(service.forProfile(READER, STRANGER), ForbiddenError);
  });

  test('profile reviews: anyone can see a public profile', async () => {
    const reader = await users.findById(UserId.of(READER));
    reader!.makeProfilePublic();
    await users.save(reader!);
    await service.forProfile(READER, STRANGER);
    assert.deepEqual(query.profileCalls, [READER]);
  });

  test('profile reviews: unknown user', async () => {
    await assert.rejects(
      service.forProfile('c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', READER),
      NotFoundError,
    );
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @bookmarked/backend exec tsx --test tests/unit/review-service.test.ts`
Expected: FAIL, cannot find module `review-service.js`.

- [ ] **Step 3: Implement `review-service.ts`**

```ts
import { ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { BookId } from '../book/book.js';
import type { IBookRepository } from '../book/book-repository.js';
import type { IFriendRepository } from '../friend/friend-repository.js';
import type { IReadingStatusRepository } from '../reading-status/reading-status-repository.js';
import { UserId } from '../user/user.js';
import type { IUserRepository } from '../user/user-repository.js';
import { Rating, Review, ReviewComment, ReviewNotAllowedError } from './review.js';
import type { IReviewRepository } from './review-repository.js';
import type { BookReviewsView, ProfileReviewView, ReviewQuery } from './review-query.js';

export interface WriteReviewCommand {
  userId: unknown;
  bookId: unknown;
  rating: unknown;
  comment?: unknown;
}

// Application service: one method per review use case (F-LIB-02).
export class ReviewService {
  constructor(
    private readonly reviews: IReviewRepository,
    private readonly readingStatuses: IReadingStatusRepository,
    private readonly books: IBookRepository,
    private readonly users: IUserRepository,
    private readonly friends: IFriendRepository,
    private readonly query: ReviewQuery,
  ) {}

  /** Creates or replaces the reader's review; only books they have started can be reviewed. */
  async write(command: WriteReviewCommand): Promise<Review> {
    const userId = UserId.of(command.userId);
    const bookId = BookId.of(command.bookId);
    const rating = Rating.of(command.rating);
    const comment = ReviewComment.of(command.comment);

    if (!(await this.books.findById(bookId))) throw new NotFoundError('Book');
    const status = await this.readingStatuses.findByUserAndBook(userId, bookId);
    if (!status?.allowsReview) throw new ReviewNotAllowedError();

    const existing = await this.reviews.findByUserAndBook(userId, bookId);
    const review = existing ?? Review.write(userId, bookId, rating, comment);
    if (existing) existing.revise(rating, comment);

    await this.reviews.save(review);
    return review;
  }

  /** Deletes the reader's review; deleting one that does not exist is not an error. */
  async remove(userId: unknown, bookId: unknown): Promise<void> {
    await this.reviews.delete(UserId.of(userId), BookId.of(bookId));
  }

  async forBook(bookId: unknown, viewerId: unknown): Promise<BookReviewsView> {
    const id = BookId.of(bookId);
    if (!(await this.books.findById(id))) throw new NotFoundError('Book');
    return this.query.forBook(id, UserId.of(viewerId));
  }

  /** A profile's reviews follow the profile: public for everyone, private for the owner and friends. */
  async forProfile(profileUserId: unknown, viewerId: unknown): Promise<ProfileReviewView[]> {
    const ownerId = UserId.of(profileUserId);
    const viewer = UserId.of(viewerId);
    const owner = await this.users.findById(ownerId);
    if (!owner) throw new NotFoundError('User');

    const allowed =
      ownerId.equals(viewer) ||
      owner.profileVisibility === 'public' ||
      (await this.friends.areFriends(ownerId, viewer));
    if (!allowed) throw new ForbiddenError('This profile is private');

    return this.query.forUser(ownerId);
  }
}
```

- [ ] **Step 4: Run it to see it pass**

Same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/features/review/review-service.ts apps/backend/tests/unit/review-service.test.ts
git commit -m "feat: add the review service"
```

---

### Task 6: Drizzle review query, DTO, routes and wiring

**Files:**
- Modify: `apps/backend/src/features/review/review-query.ts` (add `DrizzleReviewQuery`)
- Create: `apps/backend/src/features/review/review-dto.ts`
- Create: `apps/backend/src/features/review/review-routes.ts`
- Modify: `apps/backend/src/api/router.ts`, `apps/backend/src/server.ts`
- Test: `apps/backend/tests/integration/review-api.test.ts`

- [ ] **Step 1: Write the failing integration test**

```ts
import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { createDb } from '../../src/database/pool.js';
import { Book } from '../../src/features/book/book.js';
import { DrizzleBookRepository } from '../../src/features/book/book-repository.js';
import { DrizzleFriendRepository } from '../../src/features/friend/friend-repository.js';
import { Friendship } from '../../src/features/friend/friend.js';
import { DrizzleReadingStatusRepository } from '../../src/features/reading-status/reading-status-repository.js';
import { ReadingStatus } from '../../src/features/reading-status/reading-status.js';
import { DrizzleReviewQuery } from '../../src/features/review/review-query.js';
import { DrizzleReviewRepository } from '../../src/features/review/review-repository.js';
import { DrizzleUserRepository } from '../../src/features/user/user-repository.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { authHeader, FakeAuthProvider } from '../helpers/auth.js';
import { withApp } from '../helpers/http.js';
import { createTestPool, truncateTables } from '../helpers/test-db.js';

const READER = 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const FRIEND = 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
const PUBLIC_READER = 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';
const PRIVATE_STRANGER = 'd1eebc99-9c0b-4ef8-bb6d-6bb9bd380a14';
const TABLES = ['users', 'books', 'reading_status', 'reviews', 'friendships'];

describe('Review API (F-LIB-02)', () => {
  const pool = createTestPool();
  const db = createDb(pool);
  const bookRepository = new DrizzleBookRepository(db);
  const readingStatusRepository = new DrizzleReadingStatusRepository(db);
  const userRepository = new DrizzleUserRepository(db);
  const friendRepository = new DrizzleFriendRepository(db);
  const app = createApp({
    authProvider: new FakeAuthProvider(),
    userRepository,
    bookRepository,
    readingStatusRepository,
    friendRepository,
    reviewRepository: new DrizzleReviewRepository(db),
    reviewQuery: new DrizzleReviewQuery(db),
  });
  let dune: Book;

  const call = (url: string, method: string, path: string, as: string, body?: object) =>
    fetch(`${url}${path}`, {
      method,
      headers: { ...authHeader(as), 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });

  const register = async (id: string, name: string, isPublic = false) => {
    const user = User.register({
      id: UserId.of(id),
      email: Email.of(`${name}@example.com`),
      username: Username.of(name),
      displayName: name,
    });
    if (isPublic) user.makeProfilePublic();
    await userRepository.save(user);
  };

  const shelve = async (userId: string, status: 'not-started' | 'finished' | 'in-progress' | 'did-not-finish') => {
    const entry = ReadingStatus.create(UserId.of(userId), dune.id);
    // DNF is only reachable from In progress.
    if (status === 'did-not-finish') entry.startReading();
    entry.changeStatus(status, dune.pageCount);
    await readingStatusRepository.save(entry);
  };

  beforeEach(async () => {
    await truncateTables(pool, TABLES);
    await register(READER, 'reader');
    await register(FRIEND, 'friend');
    await register(PUBLIC_READER, 'public_reader', true);
    await register(PRIVATE_STRANGER, 'private_stranger');
    const request = Friendship.request(UserId.of(READER), UserId.of(FRIEND), new Date());
    request.accept(UserId.of(FRIEND), new Date());
    await friendRepository.save(request);
    dune = Book.create({ title: 'Dune', pageCount: 688 });
    await bookRepository.save(dune);
  });

  after(async () => {
    await truncateTables(pool, TABLES);
    await pool.end();
  });

  test('rate and review a finished book, then see it on the book page and profile', async () => {
    await shelve(READER, 'finished');
    await withApp(app, async (url) => {
      const put = await call(url, 'PUT', `/book/${dune.id.value}/review`, READER, {
        rating: 4,
        comment: 'Great world building',
      });
      assert.equal(put.status, 200);
      const saved = (await put.json()) as { rating: number; comment: string };
      assert.equal(saved.rating, 4);

      const page = (await (await call(url, 'GET', `/book/${dune.id.value}/reviews`, READER)).json()) as {
        mine: { rating: number; comment: string } | null;
      };
      assert.equal(page.mine?.rating, 4);
      assert.equal(page.mine?.comment, 'Great world building');

      const profile = (await (await call(url, 'GET', `/users/${READER}/reviews`, READER)).json()) as {
        book: { title: string };
        rating: number;
      }[];
      assert.deepEqual(profile.map((r) => [r.book.title, r.rating]), [['Dune', 4]]);
    });
  });

  for (const status of ['in-progress', 'did-not-finish'] as const) {
    test(`can review while ${status}`, async () => {
      await shelve(READER, status);
      await withApp(app, async (url) => {
        const res = await call(url, 'PUT', `/book/${dune.id.value}/review`, READER, { rating: 3 });
        assert.equal(res.status, 200);
      });
    });
  }

  test('cannot review a book not started', async () => {
    await shelve(READER, 'not-started');
    await withApp(app, async (url) => {
      const res = await call(url, 'PUT', `/book/${dune.id.value}/review`, READER, { rating: 4 });
      assert.equal(res.status, 409);
      assert.deepEqual(await res.json(), { error: 'Start reading this book before reviewing it' });
    });
  });

  test('editing shows only the new rating and text', async () => {
    await shelve(READER, 'finished');
    await withApp(app, async (url) => {
      await call(url, 'PUT', `/book/${dune.id.value}/review`, READER, { rating: 4, comment: 'Good' });
      await call(url, 'PUT', `/book/${dune.id.value}/review`, READER, { rating: 5, comment: 'Superb' });
      const page = (await (await call(url, 'GET', `/book/${dune.id.value}/reviews`, READER)).json()) as {
        mine: { rating: number; comment: string };
      };
      assert.equal(page.mine.rating, 5);
      assert.equal(page.mine.comment, 'Superb');
      const { rows } = await pool.query('SELECT count(*)::int AS n FROM reviews');
      assert.equal(rows[0].n, 1);
    });
  });

  for (const rating of [0, 6]) {
    test(`rejects a rating of ${rating}`, async () => {
      await shelve(READER, 'finished');
      await withApp(app, async (url) => {
        const res = await call(url, 'PUT', `/book/${dune.id.value}/review`, READER, { rating });
        assert.equal(res.status, 400);
        assert.deepEqual(await res.json(), { error: 'Rating must be between 1 and 5' });
      });
    });
  }

  test('deleting leaves no rating or review from me', async () => {
    await shelve(READER, 'finished');
    await withApp(app, async (url) => {
      await call(url, 'PUT', `/book/${dune.id.value}/review`, READER, { rating: 4 });
      const del = await call(url, 'DELETE', `/book/${dune.id.value}/review`, READER);
      assert.equal(del.status, 204);
      const page = (await (await call(url, 'GET', `/book/${dune.id.value}/reviews`, READER)).json()) as {
        mine: unknown;
      };
      assert.equal(page.mine, null);
    });
  });

  test('book page splits friends and public reviews and averages public profiles only', async () => {
    for (const id of [READER, FRIEND, PUBLIC_READER, PRIVATE_STRANGER]) await shelve(id, 'finished');
    await withApp(app, async (url) => {
      await call(url, 'PUT', `/book/${dune.id.value}/review`, READER, { rating: 5 });
      await call(url, 'PUT', `/book/${dune.id.value}/review`, FRIEND, { rating: 2, comment: 'Slow' });
      await call(url, 'PUT', `/book/${dune.id.value}/review`, PUBLIC_READER, { rating: 4 });
      await call(url, 'PUT', `/book/${dune.id.value}/review`, PRIVATE_STRANGER, { rating: 1 });

      const page = (await (await call(url, 'GET', `/book/${dune.id.value}/reviews`, READER)).json()) as {
        mine: { rating: number };
        friends: { author: { username: string } }[];
        publicReviews: { author: { username: string } }[];
        publicAverage: number | null;
        publicCount: number;
      };
      assert.equal(page.mine.rating, 5);
      assert.deepEqual(page.friends.map((r) => r.author.username), ['friend']);
      assert.deepEqual(page.publicReviews.map((r) => r.author.username), ['public_reader']);
      // Only PUBLIC_READER has a public profile.
      assert.equal(page.publicAverage, 4);
      assert.equal(page.publicCount, 1);
    });
  });

  test('a private profile hides its reviews from strangers', async () => {
    await withApp(app, async (url) => {
      const res = await call(url, 'GET', `/users/${READER}/reviews`, PRIVATE_STRANGER);
      assert.equal(res.status, 403);
      const asFriend = await call(url, 'GET', `/users/${READER}/reviews`, FRIEND);
      assert.equal(asFriend.status, 200);
    });
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @bookmarked/backend exec tsx --test tests/integration/review-api.test.ts`
Expected: FAIL, `DrizzleReviewQuery` not exported / `reviewRepository` not a dependency.

- [ ] **Step 3: Add `DrizzleReviewQuery` to `review-query.ts`**

Add imports at the top:

```ts
import { and, avg, count, desc, eq, inArray, notInArray, or } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { books, friendships, reviews, users } from '../../database/schema.js';
```

And at the end:

```ts
const reviewColumns = {
  id: reviews.id,
  bookId: reviews.bookId,
  rating: reviews.rating,
  comment: reviews.comment,
  createdAt: reviews.createdAt,
  updatedAt: reviews.updatedAt,
  authorId: users.id,
  username: users.username,
  displayName: users.displayName,
  photoUrl: users.photoUrl,
};

type ReviewRowView = {
  id: string;
  bookId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  username: string;
  displayName: string;
  photoUrl: string | null;
};

function toView(row: ReviewRowView): ReviewView {
  return {
    id: row.id,
    bookId: row.bookId,
    rating: row.rating,
    comment: row.comment,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    author: {
      id: row.authorId,
      username: row.username,
      displayName: row.displayName,
      photoUrl: row.photoUrl,
    },
  };
}

export class DrizzleReviewQuery implements ReviewQuery {
  constructor(private readonly db: NodePgDatabase) {}

  async forBook(bookId: BookId, viewerId: UserId): Promise<BookReviewsView> {
    const friendIds = await this.friendIdsOf(viewerId);
    const close = [viewerId.value, ...friendIds];

    const closeRows = await this.db
      .select(reviewColumns)
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(and(eq(reviews.bookId, bookId.value), inArray(reviews.userId, close)))
      .orderBy(desc(reviews.createdAt));

    const publicRows = await this.db
      .select(reviewColumns)
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(
        and(
          eq(reviews.bookId, bookId.value),
          eq(users.profileVisibility, 'public'),
          notInArray(reviews.userId, close),
        ),
      )
      .orderBy(desc(reviews.createdAt))
      .limit(PUBLIC_REVIEWS_PAGE);

    // F-LIB-02 rule 5 and Q4: only public profiles count in the average.
    const [stats] = await this.db
      .select({ average: avg(reviews.rating), total: count() })
      .from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(and(eq(reviews.bookId, bookId.value), eq(users.profileVisibility, 'public')));

    const mine = closeRows.find((r) => r.authorId === viewerId.value);
    return {
      mine: mine ? toView(mine) : null,
      friends: closeRows.filter((r) => r.authorId !== viewerId.value).map(toView),
      publicReviews: publicRows.map(toView),
      publicAverage: stats?.average != null ? Math.round(Number(stats.average) * 10) / 10 : null,
      publicCount: stats?.total ?? 0,
    };
  }

  async forUser(userId: UserId): Promise<ProfileReviewView[]> {
    const rows = await this.db
      .select({
        bookId: books.id,
        title: books.title,
        coverUrl: books.coverUrl,
        rating: reviews.rating,
        comment: reviews.comment,
        updatedAt: reviews.updatedAt,
      })
      .from(reviews)
      .innerJoin(books, eq(reviews.bookId, books.id))
      .where(eq(reviews.userId, userId.value))
      .orderBy(desc(reviews.updatedAt));

    return rows.map((row) => ({
      book: { id: row.bookId, title: row.title, coverUrl: row.coverUrl },
      rating: row.rating,
      comment: row.comment,
      updatedAt: new Date(row.updatedAt).toISOString(),
    }));
  }

  private async friendIdsOf(userId: UserId): Promise<string[]> {
    const rows = await this.db
      .select({ requesterId: friendships.requesterId, addresseeId: friendships.addresseeId })
      .from(friendships)
      .where(
        and(
          eq(friendships.status, 'accepted'),
          or(eq(friendships.requesterId, userId.value), eq(friendships.addresseeId, userId.value)),
        ),
      );
    return rows.map((r) => (r.requesterId === userId.value ? r.addresseeId : r.requesterId));
  }
}
```

- [ ] **Step 4: Write `review-dto.ts`**

```ts
import type { Review } from './review.js';

// Shape of a saved review on the wire. The author is the caller, so it is not repeated.
export interface ReviewDto {
  id: string;
  bookId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toReviewDto(review: Review): ReviewDto {
  return {
    id: review.id.value,
    bookId: review.bookId.value,
    rating: review.rating.value,
    comment: review.comment.text,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  };
}
```

- [ ] **Step 5: Write `review-routes.ts`**

```ts
import { Router } from 'express';
import { currentUserId } from '../../middleware/auth.js';
import { toReviewDto } from './review-dto.js';
import type { ReviewService } from './review-service.js';

// Mounted behind `authenticate` + `requireUser`: the reader always comes from the token.
export function reviewRoutes(reviews: ReviewService): Router {
  const router = Router();

  router.put('/book/:bookId/review', async (req, res) => {
    const { rating, comment } = req.body ?? {};
    const review = await reviews.write({
      userId: currentUserId(res),
      bookId: req.params.bookId,
      rating,
      comment,
    });
    res.status(200).json(toReviewDto(review));
  });

  router.delete('/book/:bookId/review', async (req, res) => {
    await reviews.remove(currentUserId(res), req.params.bookId);
    res.status(204).end();
  });

  router.get('/book/:bookId/reviews', async (req, res) => {
    res.status(200).json(await reviews.forBook(req.params.bookId, currentUserId(res)));
  });

  router.get('/users/:userId/reviews', async (req, res) => {
    res.status(200).json(await reviews.forProfile(req.params.userId, currentUserId(res)));
  });

  return router;
}
```

- [ ] **Step 6: Wire it in `router.ts`**

Imports:

```ts
import type { IReviewRepository } from '../features/review/review-repository.js';
import type { ReviewQuery } from '../features/review/review-query.js';
import { reviewRoutes } from '../features/review/review-routes.js';
import { ReviewService } from '../features/review/review-service.js';
```

In `ApiDependencies`: `reviewRepository?: IReviewRepository;` and `reviewQuery?: ReviewQuery;`. Destructure both in `apiRouter`, and after the reading-status routes:

```ts
  if (
    bookRepository &&
    readingStatusRepository &&
    userRepository &&
    friendRepository &&
    reviewRepository &&
    reviewQuery
  ) {
    router.use(
      reviewRoutes(
        new ReviewService(
          reviewRepository,
          readingStatusRepository,
          bookRepository,
          userRepository,
          friendRepository,
          reviewQuery,
        ),
      ),
    );
  }
```

In `server.ts`, import `DrizzleReviewRepository` and `DrizzleReviewQuery` and pass `reviewRepository: new DrizzleReviewRepository(db)` and `reviewQuery: new DrizzleReviewQuery(db)` to `createApp`.

- [ ] **Step 7: Run it to see it pass**

Same command as Step 2. Expected: PASS. Then the whole backend: `pnpm --filter @bookmarked/backend test` and `pnpm --filter @bookmarked/backend typecheck`, both clean.

- [ ] **Step 8: Commit**

```bash
git add apps/backend
git commit -m "feat: add review routes for books and profiles"
```

---

### Task 7: Frontend API client

**Files:**
- Modify: `apps/frontend/src/services/api.ts` (new section after "Books catalog")

- [ ] **Step 1: Add the types and functions**

```ts
// ---------------------------------------------------------------------------
// Ratings and reviews (F-LIB-02)
// ---------------------------------------------------------------------------

export interface ApiReviewAuthor {
  id: string;
  username: string;
  displayName: string;
  photoUrl: string | null;
}

export interface ApiReview {
  id: string;
  bookId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
  author: ApiReviewAuthor;
}

export interface ApiBookReviews {
  mine: ApiReview | null;
  friends: ApiReview[];
  publicReviews: ApiReview[];
  publicAverage: number | null;
  publicCount: number;
}

export interface ApiProfileReview {
  book: { id: string; title: string; coverUrl: string | null };
  rating: number;
  comment: string | null;
  updatedAt: string;
}

/** Creates or replaces my rating and comment for a book. */
export async function saveReview(
  bookId: string,
  review: { rating: number; comment: string },
): Promise<void> {
  await sendJson<unknown>('PUT', `/book/${id(bookId)}/review`, review, 'Failed to save your review');
}

export async function deleteReview(bookId: string): Promise<void> {
  await ensureOk(
    await apiFetch(`/book/${id(bookId)}/review`, { method: 'DELETE' }),
    'Failed to delete your review',
  );
}

/** My review, my friends' reviews, the newest public reviews and the public average. */
export async function getBookReviews(bookId: string): Promise<ApiBookReviews> {
  return getJson<ApiBookReviews>(`/book/${id(bookId)}/reviews`, 'Failed to load reviews');
}

/** The reviews on a profile; rejects with status 403 for a private profile of a stranger. */
export async function getUserReviews(userId: string): Promise<ApiProfileReview[]> {
  return getJson<ApiProfileReview[]>(`/users/${id(userId)}/reviews`, 'Failed to load reviews');
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @bookmarked/frontend typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/frontend/src/services/api.ts
git commit -m "feat: add review calls to the api client"
```

---

### Task 8: Book thoughts panel

**Files:**
- Modify: `apps/frontend/src/components/library/BookThoughtsPanel.vue`
- Test: `apps/frontend/src/components/library/__tests__/BookThoughtsPanel.spec.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiReview } from '@/services/api';
import { ApiError } from '@/services/api';
import BookThoughtsPanel from '../BookThoughtsPanel.vue';

const api = vi.hoisted(() => ({
  saveReview: vi.fn<(bookId: string, review: { rating: number; comment: string }) => Promise<void>>(),
  deleteReview: vi.fn<(bookId: string) => Promise<void>>(),
}));
vi.mock('@/services/api', async (original) => ({
  ...(await original<typeof import('@/services/api')>()),
  ...api,
}));

const review: ApiReview = {
  id: 'r1',
  bookId: 'b1',
  rating: 4,
  comment: 'Great world building',
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-01T00:00:00Z',
  author: { id: 'u1', username: 'me', displayName: 'Me', photoUrl: null },
};

const mountPanel = (status = 'finished', current: ApiReview | null = null) =>
  mount(BookThoughtsPanel, { props: { bookId: 'b1', status, review: current } });

describe('BookThoughtsPanel', () => {
  afterEach(() => vi.clearAllMocks());

  it('disables the controls with a hint when the book is not started', () => {
    const wrapper = mountPanel('not-started');
    expect(wrapper.text()).toContain('Start reading this book to rate and review it.');
    expect(wrapper.findAll('.star').every((s) => s.attributes('disabled') !== undefined)).toBe(true);
    expect(wrapper.get('textarea').attributes('disabled')).toBeDefined();
    expect(wrapper.get('.save-button').attributes('disabled')).toBeDefined();
  });

  it('saves the rating and comment and tells the page', async () => {
    api.saveReview.mockResolvedValueOnce();
    const wrapper = mountPanel('finished');
    await wrapper.findAll('.star')[3]!.trigger('click');
    await wrapper.get('textarea').setValue('Great world building');
    await wrapper.get('.save-button').trigger('click');
    await flushPromises();
    expect(api.saveReview).toHaveBeenCalledWith('b1', { rating: 4, comment: 'Great world building' });
    expect(wrapper.emitted('changed')).toHaveLength(1);
  });

  it('starts from my existing review and saves the edit', async () => {
    api.saveReview.mockResolvedValueOnce();
    const wrapper = mountPanel('in-progress', review);
    expect(wrapper.get('textarea').element.value).toBe('Great world building');
    await wrapper.findAll('.star')[4]!.trigger('click');
    await wrapper.get('.save-button').trigger('click');
    await flushPromises();
    expect(api.saveReview).toHaveBeenCalledWith('b1', { rating: 5, comment: 'Great world building' });
  });

  it('deletes my review after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    api.deleteReview.mockResolvedValueOnce();
    const wrapper = mountPanel('finished', review);
    await wrapper.get('.delete-button').trigger('click');
    await flushPromises();
    expect(api.deleteReview).toHaveBeenCalledWith('b1');
    expect(wrapper.emitted('changed')).toHaveLength(1);
  });

  it('shows the server message when saving fails', async () => {
    api.saveReview.mockRejectedValueOnce(new ApiError('Rating must be between 1 and 5', 400));
    const wrapper = mountPanel('finished', review);
    await wrapper.get('.save-button').trigger('click');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toBe('Rating must be between 1 and 5');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @bookmarked/frontend exec vitest run src/components/library/__tests__/BookThoughtsPanel.spec.ts`
Expected: FAIL (the panel still expects a `detail` prop).

- [ ] **Step 3: Replace the script and template**

```vue
<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { deleteReview, saveReview, type ApiReview } from '@/services/api';
import type { ReadingStatus } from '@/types/library';

const props = defineProps<{ bookId: string; status: ReadingStatus; review: ApiReview | null }>();
const emit = defineEmits<{ changed: [] }>();

const rating = ref(0);
const comment = ref('');
const busy = ref(false);
const error = ref('');
const stars = [1, 2, 3, 4, 5];

// F-LIB-02: In progress, Finished and Did not finish can be reviewed; Not started cannot.
const canReview = computed(() => props.status !== 'not-started');

watch(
  () => props.review,
  (review) => {
    rating.value = review?.rating ?? 0;
    comment.value = review?.comment ?? '';
  },
  { immediate: true },
);

async function run(action: () => Promise<void>) {
  busy.value = true;
  error.value = '';
  try {
    await action();
    emit('changed');
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Something went wrong';
  } finally {
    busy.value = false;
  }
}

function save() {
  void run(() => saveReview(props.bookId, { rating: rating.value, comment: comment.value }));
}

function remove() {
  if (!window.confirm('Delete your rating and review?')) return;
  void run(() => deleteReview(props.bookId));
}
</script>

<template>
  <section class="thoughts-panel" aria-labelledby="thoughts-title">
    <h2 id="thoughts-title" class="panel-title">Your thoughts</h2>
    <p v-if="canReview" class="helper">
      You can review a book while <strong>In progress</strong>, <strong>Finished</strong>, or
      <strong>Did not finish</strong>.
    </p>
    <p v-else class="helper start-hint">Start reading this book to rate and review it.</p>

    <div class="stars" role="group" aria-label="Your rating">
      <button
        v-for="star in stars"
        :key="star"
        type="button"
        :class="['star', { empty: star > rating }]"
        :aria-label="`Rate ${star} out of 5`"
        :aria-pressed="rating === star"
        :disabled="!canReview || busy"
        @click="rating = star"
      >
        ★
      </button>
    </div>
    <p class="rating-copy">{{ rating > 0 ? `${rating} of 5` : 'Pick a rating' }}</p>

    <label class="field-label" for="thought-comment">Comment</label>
    <textarea
      id="thought-comment"
      v-model="comment"
      class="comment"
      rows="2"
      maxlength="2000"
      placeholder="What stayed with you?"
      :disabled="!canReview || busy"
    ></textarea>

    <div class="privacy-note">
      <svg
        class="lock"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <rect x="5" y="10" width="14" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
      <div>
        <p class="privacy-title">Follows your profile</p>
        <p class="privacy-copy">
          On a public profile everyone sees your review and it counts in the public average. On a
          private one only accepted friends see it.
        </p>
      </div>
    </div>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <div class="actions">
      <button
        type="button"
        class="save-button"
        :disabled="!canReview || busy || rating === 0"
        @click="save"
      >
        {{ busy ? 'Saving…' : 'Save rating & comment' }}
      </button>
      <button v-if="review" type="button" class="delete-button" :disabled="busy" @click="remove">
        Delete review
      </button>
    </div>
  </section>
</template>
```

In `<style scoped>`: delete the `.audience` and `.audience:hover` rules; add:

```css
.star:disabled,
.comment:disabled,
.save-button:disabled,
.delete-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.start-hint {
  color: var(--color-primary);
}

.error {
  margin: 12px 0 0;
  color: var(--color-primary);
  font-size: var(--font-size-xs);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-top: 16px;
}

.actions .save-button {
  margin-top: 0;
}

.delete-button {
  min-height: 38px;
  padding: 0 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: var(--font-size-xs);
  cursor: pointer;
}

.delete-button:hover {
  border-color: var(--color-primary);
}
```

and guard the existing hover rules so disabled buttons do not react: `.star:not(:disabled):hover` and `.save-button:not(:disabled):hover`.

- [ ] **Step 4: Run it to see it pass**

Same command. Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/frontend/src/components/library
git commit -m "feat: save, edit and delete my review from the book page"
```

---

### Task 9: Book page lists, average and mock cleanup

**Files:**
- Modify: `apps/frontend/src/views/BookDetailView.vue`
- Modify: `apps/frontend/src/components/library/ReviewItem.vue`
- Modify: `apps/frontend/src/types/library.ts`, `apps/frontend/src/mocks/library.ts`
- Test: `apps/frontend/src/views/__tests__/BookDetailView.spec.ts`

- [ ] **Step 1: Rewrite the view test**

```ts
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import router from '@/router';
import type { ApiBookReviews, ApiReview } from '@/services/api';
import BookDetailView from '../BookDetailView.vue';

const api = vi.hoisted(() => ({
  getBookReviews: vi.fn<(bookId: string) => Promise<ApiBookReviews>>(),
  getUserLibrary: vi.fn(async () => []),
  getBook: vi.fn(async () => {
    throw new Error('offline');
  }),
}));
vi.mock('@/services/api', async (original) => ({
  ...(await original<typeof import('@/services/api')>()),
  ...api,
}));

const review = (id: string, name: string, rating: number, comment: string | null): ApiReview => ({
  id,
  bookId: 'emma',
  rating,
  comment,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-02T00:00:00Z',
  author: { id: `u-${id}`, username: name.toLowerCase(), displayName: name, photoUrl: null },
});

async function mountView(bookId = 'emma') {
  const wrapper = mount(BookDetailView, { props: { bookId }, global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

describe('BookDetailView', () => {
  afterEach(() => vi.clearAllMocks());

  it('shows the reading, edition and club content for a book', async () => {
    api.getBookReviews.mockRejectedValueOnce(new Error('offline'));
    const wrapper = await mountView();

    expect(wrapper.get('h1').text()).toBe('Emma');
    expect(wrapper.get('.subtitle').text()).toContain('Jane Austen');
    expect(wrapper.get('.reading-panel').text()).toContain('Page 294 of 474 • 62% complete');
    expect(wrapper.get('.start-session').attributes('href')).toBe('/session/emma');
    expect(wrapper.get('.edition-panel').text()).toContain('Published 1815');
    expect(wrapper.get('.club-panel').text()).toContain('Classics • October');
  });

  it('shows friend reviews, public reviews and the public average from the API', async () => {
    api.getBookReviews.mockResolvedValueOnce({
      mine: null,
      friends: [review('f1', 'Maya Laurent', 5, 'Loved it')],
      publicReviews: [review('p1', 'Sam Reed', 3, null)],
      publicAverage: 3.5,
      publicCount: 2,
    });
    const wrapper = await mountView();

    expect(api.getBookReviews).toHaveBeenCalledWith('emma');
    expect(wrapper.get('.friends-panel').text()).toContain('Maya Laurent');
    expect(wrapper.get('.friends-panel').text()).toContain('Loved it');
    expect(wrapper.get('.reviews-panel').text()).toContain('Sam Reed');
    expect(wrapper.get('.big-rating').text()).toBe('3.5 / 5');
    expect(wrapper.get('.rating-count').text()).toBe('2 public ratings');
    expect(wrapper.find('.read-more').exists()).toBe(false);
    expect(wrapper.find('select').exists()).toBe(false);
  });

  it('shows the empty states when nobody has reviewed the book', async () => {
    api.getBookReviews.mockResolvedValueOnce({
      mine: null,
      friends: [],
      publicReviews: [],
      publicAverage: null,
      publicCount: 0,
    });
    const wrapper = await mountView('circe');

    expect(wrapper.get('h1').text()).toBe('Circe');
    expect(wrapper.get('.friends-panel').text()).toContain('No friend reviews yet.');
    expect(wrapper.get('.big-rating').text()).toBe('— / 5');
    expect(wrapper.get('.rating-count').text()).toBe('No public ratings yet');
    expect(wrapper.find('.club-panel').exists()).toBe(false);
  });

  it('passes my review to the thoughts panel', async () => {
    api.getBookReviews.mockResolvedValueOnce({
      mine: review('m1', 'Me', 4, 'Great world building'),
      friends: [],
      publicReviews: [],
      publicAverage: null,
      publicCount: 0,
    });
    const wrapper = await mountView();
    expect(
      (wrapper.get('.thoughts-panel textarea').element as HTMLTextAreaElement).value,
    ).toBe('Great world building');
  });

  it('shows a friendly message for an unknown book id', async () => {
    api.getBookReviews.mockRejectedValueOnce(new Error('offline'));
    const wrapper = await mountView('missing-book');

    expect(wrapper.get('h1').text()).toBe('Book not found');
    expect(wrapper.get('.missing-link').attributes('href')).toBe('/library');
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @bookmarked/frontend exec vitest run src/views/__tests__/BookDetailView.spec.ts`
Expected: FAIL (the view still reads mock reviews).

- [ ] **Step 3: Make `ReviewItem.vue`'s quote optional**

Change the prop to `quote: string | null;` and the paragraph to `<p v-if="quote" class="quote">“{{ quote }}”</p>`.

- [ ] **Step 4: Update `BookDetailView.vue`**

Script: add `getBookReviews` and `type ApiBookReviews, type ApiReview` to the `@/services/api` import, then:

```ts
const reviews = ref<ApiBookReviews | null>(null);

async function loadReviews() {
  try {
    reviews.value = await getBookReviews(props.bookId);
  } catch {
    // Mock or unknown books have no reviews on the server; show the empty states.
    reviews.value = null;
  }
}

const friendReviews = computed(() => reviews.value?.friends ?? []);
const publicReviews = computed(() => reviews.value?.publicReviews ?? []);
const publicRating = computed(() => reviews.value?.publicAverage?.toFixed(1) ?? '—');
const publicRatingCount = computed(() => {
  const count = reviews.value?.publicCount ?? 0;
  if (count === 0) return 'No public ratings yet';
  return `${count.toLocaleString('en-US')} public rating${count === 1 ? '' : 's'}`;
});

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');

const reviewDate = (review: ApiReview) =>
  new Date(review.updatedAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
```

Call `void loadReviews()` next to `void fetchBookData()` in both `onMounted` and the `watch`. Replace the old `friendCount`, `publicRating` and `publicRatingCount` computeds with the ones above (`friendCount` becomes `friendReviews.value.length`).

Template:
- The friends list iterates `friendReviews` with `:key="review.id" :initials="initials(review.author.displayName)" :name="review.author.displayName" :rating="review.rating" :meta="reviewDate(review)" :quote="review.comment"`; the `v-if`s use `friendReviews.length`. The note under it reads: "Friends' reviews show whatever their profile setting. Only public profiles count in the public average."
- The public list does the same over `publicReviews`, with `:meta="`Public review • ${reviewDate(review)}`"`.
- Delete the `<label class="sort-control">…</label>` block and the `read-more` button, and their CSS rules (`.sort-control`, `.sort-label`, `.sort-select*`, `.read-more*`).
- The rail renders `<BookThoughtsPanel :book-id="bookId" :status="book.status" :review="reviews?.mine ?? null" @changed="loadReviews" />`.

- [ ] **Step 5: Drop the mock review fields**

In `types/library.ts` delete `ReviewAudience`, `FriendReview`, `PublicReview` and, from `BookDetail`, the fields `friends`, `friendCount`, `publicRating`, `publicRatingCount`, `publicReviews` and `thoughts`. In `mocks/library.ts` delete the same fields from every `BookDetail` object and the fallback in `getBookDetail`. Then:

Run: `pnpm --filter @bookmarked/frontend typecheck`
Expected: no errors (fix any remaining reference it reports).

- [ ] **Step 6: Run the view and panel tests**

Run: `pnpm --filter @bookmarked/frontend exec vitest run src/views/__tests__/BookDetailView.spec.ts src/components/library`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/frontend/src
git commit -m "feat: show real friend and public reviews on the book page"
```

---

### Task 10: Reviews on the profile

**Files:**
- Create: `apps/frontend/src/components/profile/ReviewList.vue`
- Modify: `apps/frontend/src/views/ProfileView.vue`
- Test: `apps/frontend/src/views/__tests__/ProfileView.spec.ts`

- [ ] **Step 1: Add the failing tests** to `ProfileView.spec.ts`

Extend the hoisted mocks:

```ts
const api = vi.hoisted(() => ({
  getMe: vi.fn(async () => ({ id: 'me-id' })),
  getUserReviews: vi.fn<(userId: string) => Promise<ApiProfileReview[]>>(async () => []),
}));
```

and spread `...api` into the `vi.mock` factory next to `getReadingStats`; import `ApiError` and `type ApiProfileReview` from `@/services/api`. Then:

```ts
describe('ProfileView reviews', () => {
  afterEach(() => vi.clearAllMocks());

  it('lists the books I reviewed with their rating', async () => {
    getReadingStats.mockResolvedValueOnce({ totalMinutes: 0, sessionsCount: 0 });
    api.getUserReviews.mockResolvedValueOnce([
      {
        book: { id: 'b1', title: 'Dune', coverUrl: null },
        rating: 4,
        comment: 'Great world building',
        updatedAt: '2026-11-13T00:00:00Z',
      },
    ]);
    const wrapper = mountView();
    await flushPromises();

    expect(api.getUserReviews).toHaveBeenCalledWith('me-id');
    const section = wrapper.get('.profile-reviews');
    expect(section.text()).toContain('Dune');
    expect(section.text()).toContain('Great world building');
    expect(section.get('.stars').attributes('aria-label')).toBe('4 out of 5');
  });

  it('hides the section when the reviews cannot be loaded', async () => {
    getReadingStats.mockResolvedValueOnce({ totalMinutes: 0, sessionsCount: 0 });
    api.getUserReviews.mockRejectedValueOnce(new ApiError('This profile is private', 403));
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.find('.profile-reviews').exists()).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm --filter @bookmarked/frontend exec vitest run src/views/__tests__/ProfileView.spec.ts`
Expected: FAIL, `.profile-reviews` not found.

- [ ] **Step 3: Write `ReviewList.vue`**

```vue
<script setup lang="ts">
import { RouterLink } from 'vue-router';

import type { ApiProfileReview } from '@/services/api';

defineProps<{ reviews: ApiProfileReview[] }>();

const stars = [1, 2, 3, 4, 5];
</script>

<template>
  <section class="profile-reviews" aria-labelledby="profile-reviews-title">
    <h2 id="profile-reviews-title" class="title">Reviews</h2>
    <p v-if="reviews.length === 0" class="empty">No reviews yet.</p>
    <ul v-else class="list">
      <li v-for="review in reviews" :key="review.book.id" class="item">
        <img
          class="cover"
          :src="review.book.coverUrl || '/placeholder-cover.png'"
          :alt="`Cover of ${review.book.title}`"
        />
        <div class="body">
          <RouterLink
            class="book-title"
            :to="{ name: 'book-detail', params: { bookId: review.book.id } }"
          >
            {{ review.book.title }}
          </RouterLink>
          <span class="stars" :aria-label="`${review.rating} out of 5`">
            <span v-for="star in stars" :key="star" :class="{ empty: star > review.rating }">★</span>
          </span>
          <p v-if="review.comment" class="comment">“{{ review.comment }}”</p>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.profile-reviews {
  padding: 32px 0;
}

.title {
  margin: 0 0 18px;
  font-size: 1.125rem;
  font-weight: var(--font-weight-semibold);
}

.empty {
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.list {
  display: grid;
  gap: 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.item {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}

.cover {
  width: 44px;
  height: 66px;
  border-radius: 4px;
  object-fit: cover;
  background: var(--color-surface-muted);
}

.body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.book-title {
  color: var(--color-text);
  font-weight: var(--font-weight-semibold);
  text-decoration: none;
}

.book-title:hover {
  color: var(--color-primary);
}

.stars {
  color: var(--color-accent);
  font-size: 0.75rem;
}

.stars .empty {
  color: var(--color-track);
}

.comment {
  margin: 4px 0 0;
  font-size: var(--font-size-xs);
  line-height: 1.45;
  overflow-wrap: anywhere;
}
</style>
```

- [ ] **Step 4: Load it in `ProfileView.vue`**

Import `ReviewList` and `getMe, getUserReviews, type ApiProfileReview`; add:

```ts
// F-LIB-02: my rated books. `null` (hidden) when the API cannot be reached or refuses.
const reviews = ref<ApiProfileReview[] | null>(null);

async function loadReviews() {
  try {
    const me = await getMe();
    reviews.value = await getUserReviews(me.id);
  } catch {
    reviews.value = null;
  }
}
```

Call `void loadReviews();` at the start of the existing `onMounted`. In the template, after `<FolderList …/>`: `<ReviewList v-if="reviews" class="top-rule" :reviews="reviews" />`.

- [ ] **Step 5: Run it to see it pass**

Same command. Expected: PASS, including the three existing reading-time tests.

- [ ] **Step 6: Commit**

```bash
git add apps/frontend/src
git commit -m "feat: list my rated books on the profile"
```

---

### Task 11: Full check and docs

**Files:**
- Modify: `apps/backend/README.md` (routes list)
- Modify: `docs/iterations/2/log.md`, `docs/iterations/2/LLM_LOG.md`

- [ ] **Step 1: Run everything**

Run: `make check`
Expected: lint, typecheck, format check, tests and builds all pass. Fix and re-run until green (`make format` for formatting).

- [ ] **Step 2: Document the routes** in `apps/backend/README.md`, next to the other feature routes:

```markdown
- `PUT /book/:bookId/review` `{ rating, comment? }`: create or replace my review (1 to 5 stars, comment up to 2,000 characters). Only for books In progress, Finished or Did not finish (409 otherwise).
- `DELETE /book/:bookId/review`: delete my review (204, also when there was none).
- `GET /book/:bookId/reviews`: my review, my friends' reviews, the 10 newest public reviews and the public average (public profiles only).
- `GET /users/:userId/reviews`: a profile's reviews; 403 for a private profile unless you are the owner or a friend.
```

- [ ] **Step 3: Log the work**

Add a `### 2026-11-13: Rate and review a book (#122)` entry to `docs/iterations/2/log.md`: what was built, the decisions (one review per book; visibility follows the profile; audience selector removed; first page of public reviews only), and links to the spec, this plan and the issue. Update its Status table and Next steps. Add an `LLM_LOG.md` entry following that file's template (date, author, model, tool, domain, prompt, explanation).

- [ ] **Step 4: Commit**

```bash
git add apps/backend/README.md docs/iterations/2
git commit -m "docs: log rate and review a book"
```

---

## Spec coverage

| Spec item | Task |
|---|---|
| Migration (unique, `updated_at`, index) | 1 |
| `allowsReview` on reading states | 2 |
| `Rating`, `ReviewComment`, `Review`, errors | 3 |
| Repository upsert | 4 |
| Service gating, edit, idempotent delete, profile access | 5 |
| Query (mine, friends, public page, public average), routes | 6 |
| API client | 7 |
| Panel: disabled with hint, save, edit, delete, error, no audience | 8 |
| Book page lists, average, no sort or read more, no helpful count | 9 |
| Profile Reviews section, hidden on 403 | 10 |
| Docs and logs | 11 |

Deviation from the spec, recorded here and in the spec: `PUT` returns the saved review without `author` (the caller is the author), and access to profile reviews is checked in `ReviewService`, not in the query.
