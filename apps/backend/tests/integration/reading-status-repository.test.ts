// @req F-LIB-01
import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../../src/database/pool.js';
import { DrizzleBookRepository } from '../../src/features/book/book-repository.js';
import { DrizzleReadingStatusRepository } from '../../src/features/reading-status/reading-status-repository.js';
import { DrizzleUserRepository } from '../../src/features/user/user-repository.js';
import { Book } from '../../src/features/book/book.js';
import { ReadingStatus } from '../../src/features/reading-status/reading-status.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { createTestPool, truncateTables } from '../helpers/test-db.js';

const USER_ID = UserId.of('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a51');

describe('DrizzleReadingStatusRepository Integration', () => {
  const pool = createTestPool();
  const db = createDb(pool);
  const repo = new DrizzleReadingStatusRepository(db);
  let book: Book;

  beforeEach(async () => {
    await truncateTables(pool, ['users', 'books', 'reading_status']);
    await new DrizzleUserRepository(db).save(
      User.register({
        id: USER_ID,
        email: Email.of('r@example.com'),
        username: Username.of('reader'),
        displayName: 'R',
      }),
    );
    book = Book.create({ title: 'Dune', pageCount: 688 });
    await new DrizzleBookRepository(db).save(book);
  });

  after(async () => {
    await truncateTables(pool, ['users', 'books', 'reading_status']);
    await pool.end();
  });

  test('saves and reloads the aggregate with its state and progress', async () => {
    const entry = ReadingStatus.create(USER_ID, book.id);
    entry.startReading();
    entry.updateProgress(book.progressAt(120));
    await repo.save(entry);

    const found = await repo.findByUserAndBook(USER_ID, book.id);
    assert.ok(found);
    assert.ok(found.id.equals(entry.id));
    assert.strictEqual(found.status, 'in-progress');
    assert.strictEqual(found.progress.page, 120);

    const byId = await repo.findById(entry.id);
    assert.strictEqual(byId?.status, 'in-progress');
  });

  test('saving twice for the same user and book keeps a single row', async () => {
    await repo.save(ReadingStatus.create(USER_ID, book.id));
    const second = ReadingStatus.create(USER_ID, book.id);
    second.startReading();
    second.updateProgress(book.progressAt(42));
    await repo.save(second);

    const { rows } = await pool.query('SELECT status, current_page FROM reading_status');
    assert.strictEqual(rows.length, 1);
    assert.strictEqual(rows[0].status, 'in-progress');
    assert.strictEqual(rows[0].current_page, 42);
  });

  test('persists and reloads startedOn and finishedOn dates', async () => {
    const entry = ReadingStatus.create(USER_ID, book.id);
    entry.startReading('2026-10-01');
    entry.finish(book.pageCount, '2026-10-15');
    await repo.save(entry);

    const found = await repo.findByUserAndBook(USER_ID, book.id);
    assert.ok(found);
    assert.strictEqual(found.startedOn, '2026-10-01');
    assert.strictEqual(found.finishedOn, '2026-10-15');
  });

  test('delete removes the entry by userId and bookId', async () => {
    const entry = ReadingStatus.create(USER_ID, book.id);
    await repo.save(entry);

    const deleted = await repo.delete(USER_ID, book.id);
    assert.strictEqual(deleted, true);

    const found = await repo.findByUserAndBook(USER_ID, book.id);
    assert.strictEqual(found, null);

    const repeatDelete = await repo.delete(USER_ID, book.id);
    assert.strictEqual(repeatDelete, false);
  });

  test('deleteById removes the entry by its id', async () => {
    const entry = ReadingStatus.create(USER_ID, book.id);
    await repo.save(entry);

    const deleted = await repo.deleteById(entry.id);
    assert.strictEqual(deleted, true);

    const found = await repo.findById(entry.id);
    assert.strictEqual(found, null);

    const repeatDelete = await repo.deleteById(entry.id);
    assert.strictEqual(repeatDelete, false);
  });
});
