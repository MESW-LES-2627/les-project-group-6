import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../../src/infrastructure/database/pool.js';
import { DrizzleBookRepository } from '../../src/infrastructure/repositories/drizzle-book-repository.js';
import { DrizzleReadingStatusRepository } from '../../src/infrastructure/repositories/drizzle-reading-status-repository.js';
import { DrizzleUserRepository } from '../../src/infrastructure/repositories/drizzle-user-repository.js';
import { Book } from '../../src/domain/book/book.js';
import { ReadingStatus } from '../../src/domain/reading/reading-status.js';
import { Email } from '../../src/domain/user/email.js';
import { User } from '../../src/domain/user/user.js';
import { UserId } from '../../src/domain/user/user-id.js';
import { Username } from '../../src/domain/user/username.js';
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
});
