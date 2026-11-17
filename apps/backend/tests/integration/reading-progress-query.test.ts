// @req F-EXP-04
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
    const readers: [string, string][] = [
      [ANA, 'ana'],
      [BEN, 'ben'],
      [CAL, 'cal'],
    ];
    for (const [id, name] of readers) {
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
