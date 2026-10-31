import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../../src/database/pool.js';
import { DrizzleBookRepository } from '../../src/features/book/book-repository.js';
import { DrizzleReadingSessionRepository } from '../../src/features/reading-session/reading-session-repository.js';
import { ReadingSessionService } from '../../src/features/reading-session/reading-session-service.js';
import { DrizzleUserRepository } from '../../src/features/user/user-repository.js';
import { Book } from '../../src/features/book/book.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { createTestPool, truncateTables } from '../helpers/test-db.js';

const USER_ID = UserId.of('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a61');

describe('DrizzleReadingSessionRepository Integration', () => {
  const pool = createTestPool();
  const db = createDb(pool);
  const sessions = new DrizzleReadingSessionRepository(db);
  const service = new ReadingSessionService(sessions, new DrizzleBookRepository(db));
  let dune: Book;
  let emma: Book;

  const runningSessions = async (): Promise<number> => {
    const { rows } = await pool.query(
      'SELECT count(*)::int AS running FROM reading_sessions WHERE ended_at IS NULL',
    );
    return rows[0].running;
  };

  beforeEach(async () => {
    await truncateTables(pool, ['users', 'books', 'reading_sessions']);
    await new DrizzleUserRepository(db).save(
      User.register({
        id: USER_ID,
        email: Email.of('r@example.com'),
        username: Username.of('reader'),
        displayName: 'R',
      }),
    );
    dune = Book.create({ title: 'Dune', pageCount: 688 });
    emma = Book.create({ title: 'Emma', pageCount: 474 });
    const books = new DrizzleBookRepository(db);
    await books.save(dune);
    await books.save(emma);
  });

  after(async () => {
    await truncateTables(pool, ['users', 'books', 'reading_sessions']);
    await pool.end();
  });

  test('concurrent starts on one book leave a single running session', async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        service.start({ userId: USER_ID.value, bookId: dune.id.value }),
      ),
    );

    assert.strictEqual(await runningSessions(), 1);
    assert.strictEqual(new Set(results.map((s) => s.id.value)).size, 1);
  });

  test('concurrent starts on different books let only one win', async () => {
    const results = await Promise.allSettled(
      Array.from({ length: 10 }, (_, i) =>
        service.start({ userId: USER_ID.value, bookId: (i % 2 ? dune : emma).id.value }),
      ),
    );

    assert.strictEqual(await runningSessions(), 1);
    assert.ok(results.some((r) => r.status === 'fulfilled'));
    assert.ok(results.some((r) => r.status === 'rejected'));
  });
});
