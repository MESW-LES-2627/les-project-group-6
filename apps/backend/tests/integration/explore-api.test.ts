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

  test("GET /explore returns this week's most read and trending books", async () => {
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
      assert.equal(response.status, 200);
      const body = (await response.json()) as {
        mostReadThisWeek: { book: { id: string; title: string }; minutes: number }[];
        trending: { book: { id: string; title: string }; readers: number }[];
      };
      assert.deepEqual(
        body.mostReadThisWeek.map((e) => [e.book.title, e.minutes]),
        [['Dune', 30]],
      );
      assert.deepEqual(
        body.trending.map((e) => [e.book.id, e.readers]),
        [[dune.id.value, 1]],
      );
    });
  });
});
