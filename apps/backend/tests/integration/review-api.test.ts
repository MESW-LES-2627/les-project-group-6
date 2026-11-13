import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { createDb } from '../../src/database/pool.js';
import { Book } from '../../src/features/book/book.js';
import { DrizzleBookRepository } from '../../src/features/book/book-repository.js';
import { DrizzleFriendRepository } from '../../src/features/friend/friend-repository.js';
import { Friendship } from '../../src/features/friend/friend.js';
import type { ReadingStatusType } from '../../src/features/reading-status/reading-state.js';
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

interface ReviewBody {
  rating: number;
  comment: string | null;
  author: { username: string };
}

interface BookReviewsBody {
  mine: ReviewBody | null;
  friends: ReviewBody[];
  publicReviews: ReviewBody[];
  publicAverage: number | null;
  publicCount: number;
}

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

  const bookReviews = async (url: string, as = READER) =>
    (await (
      await call(url, 'GET', `/book/${dune.id.value}/reviews`, as)
    ).json()) as BookReviewsBody;

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

  const shelve = async (userId: string, status: ReadingStatusType) => {
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
      const saved = (await put.json()) as { rating: number };
      assert.equal(saved.rating, 4);

      const page = await bookReviews(url);
      assert.equal(page.mine?.rating, 4);
      assert.equal(page.mine?.comment, 'Great world building');

      const profile = (await (
        await call(url, 'GET', `/users/${READER}/reviews`, READER)
      ).json()) as {
        book: { title: string };
        rating: number;
      }[];
      assert.deepEqual(
        profile.map((r) => [r.book.title, r.rating]),
        [['Dune', 4]],
      );
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
      const body = (await res.json()) as { error: string };
      assert.equal(body.error, 'Start reading this book before reviewing it');
    });
  });

  test('editing shows only the new rating and text', async () => {
    await shelve(READER, 'finished');
    await withApp(app, async (url) => {
      const path = `/book/${dune.id.value}/review`;
      await call(url, 'PUT', path, READER, { rating: 4, comment: 'Good' });
      await call(url, 'PUT', path, READER, { rating: 5, comment: 'Superb' });
      const page = await bookReviews(url);
      assert.equal(page.mine?.rating, 5);
      assert.equal(page.mine?.comment, 'Superb');
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
        const body = (await res.json()) as { error: string };
        assert.equal(body.error, 'Rating must be between 1 and 5');
      });
    });
  }

  test('deleting leaves no rating or review from me', async () => {
    await shelve(READER, 'finished');
    await withApp(app, async (url) => {
      await call(url, 'PUT', `/book/${dune.id.value}/review`, READER, { rating: 4 });
      const del = await call(url, 'DELETE', `/book/${dune.id.value}/review`, READER);
      assert.equal(del.status, 204);
      assert.equal((await bookReviews(url)).mine, null);
    });
  });

  test('book page splits friends and public reviews and averages public profiles only', async () => {
    for (const id of [READER, FRIEND, PUBLIC_READER, PRIVATE_STRANGER])
      await shelve(id, 'finished');
    await withApp(app, async (url) => {
      const path = `/book/${dune.id.value}/review`;
      await call(url, 'PUT', path, READER, { rating: 5 });
      await call(url, 'PUT', path, FRIEND, { rating: 2, comment: 'Slow' });
      await call(url, 'PUT', path, PUBLIC_READER, { rating: 4 });
      await call(url, 'PUT', path, PRIVATE_STRANGER, { rating: 1 });

      const page = await bookReviews(url);
      assert.equal(page.mine?.rating, 5);
      assert.deepEqual(
        page.friends.map((r) => r.author.username),
        ['friend'],
      );
      assert.deepEqual(
        page.publicReviews.map((r) => r.author.username),
        ['public_reader'],
      );
      // Only PUBLIC_READER has a public profile.
      assert.equal(page.publicAverage, 4);
      assert.equal(page.publicCount, 1);

      // A stranger sees the public review only.
      const strangers = await bookReviews(url, PRIVATE_STRANGER);
      assert.equal(strangers.friends.length, 0);
      assert.deepEqual(
        strangers.publicReviews.map((r) => r.author.username),
        ['public_reader'],
      );
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
