import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../../src/infrastructure/database/pool.js';
import { DrizzleBookRepository } from '../../src/infrastructure/repositories/drizzle-book-repository.js';
import { DrizzleReadingStatusRepository } from '../../src/infrastructure/repositories/drizzle-reading-status-repository.js';
import { DrizzleUserRepository } from '../../src/infrastructure/repositories/drizzle-user-repository.js';
import { Book } from '../../src/domain/book.js';
import { ReadingStatus } from '../../src/domain/reading-status.js';
import { User } from '../../src/domain/user.js';
import { createTestPool, truncateTables } from '../helpers/test-db.js';

const USER_ID = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a51';
const BOOK_ID = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a52';

describe('DrizzleReadingStatusRepository Integration', () => {
  const pool = createTestPool();
  const db = createDb(pool);
  const repo = new DrizzleReadingStatusRepository(db);

  beforeEach(async () => {
    await truncateTables(pool, ['users', 'books', 'reading_status']);
    await new DrizzleUserRepository(db).save(
      new User({ id: USER_ID, email: 'r@example.com', username: 'reader', displayName: 'R' }),
    );
    await new DrizzleBookRepository(db).save(new Book({ id: BOOK_ID, title: 'Dune' }));
  });

  after(async () => {
    await truncateTables(pool, ['users', 'books', 'reading_status']);
    await pool.end();
  });

  test('saving twice for the same user and book keeps a single row', async () => {
    await repo.save(new ReadingStatus({ userId: USER_ID, bookId: BOOK_ID, status: 'not-started' }));
    await repo.save(
      new ReadingStatus({
        userId: USER_ID,
        bookId: BOOK_ID,
        status: 'in-progress',
        currentPage: 42,
      }),
    );

    const { rows } = await pool.query('SELECT status, current_page FROM reading_status');
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].status, 'in-progress');
    assert.strictEqual(rows[0].current_page, 42);
  });
});
