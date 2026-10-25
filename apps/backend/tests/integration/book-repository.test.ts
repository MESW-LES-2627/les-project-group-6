import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../../src/database/pool.js';
import { DrizzleBookRepository } from '../../src/features/book/book-repository.js';
import { Book, BookId } from '../../src/features/book/book.js';
import { createTestPool, truncateTables } from '../helpers/test-db.js';

describe('DrizzleBookRepository Integration', () => {
  const pool = createTestPool();
  const db = createDb(pool);
  const repo = new DrizzleBookRepository(db);

  beforeEach(async () => {
    await truncateTables(pool, ['book']);
  });

  after(async () => {
    await truncateTables(pool, ['book']);
    await pool.end();
  });

  test('saves and finds book by ID', async () => {
    const book = Book.create({
      title: 'Dune',
      description: 'A science fiction masterpiece',
      isbn13: '9780441172719',
      pageCount: 688,
      coverUrl: 'https://example.com/dune.jpg',
      isCommunityAdded: true,
    });

    await repo.save(book);

    const found = await repo.findById(book.id);
    assert.ok(found, 'Book should be found in database');
    assert.ok(found.id.equals(book.id));
    assert.strictEqual(found.title.value, 'Dune');
    assert.strictEqual(found.description, 'A science fiction masterpiece');
    assert.strictEqual(found.isbn13?.value, '9780441172719');
    assert.strictEqual(found.pageCount?.value, 688);
    assert.strictEqual(found.coverUrl, 'https://example.com/dune.jpg');
    assert.strictEqual(found.isCommunityAdded, true);
  });

  test('finds books by title', async () => {
    const book1 = Book.create({
      title: 'The Hobbit',
      pageCount: 310,
    });
    const book2 = Book.create({
      title: 'The Fellowship of the Ring',
      pageCount: 423,
    });

    await repo.save(book1);
    await repo.save(book2);

    const hobbitMatches = await repo.findByTitle('Hobbit');
    assert.strictEqual(hobbitMatches.length, 1);
    assert.strictEqual(hobbitMatches[0]?.title.value, 'The Hobbit');

    const theMatches = await repo.findByTitle('The');
    assert.strictEqual(theMatches.length, 2);
  });

  test('returns empty array when no books match title', async () => {
    const matches = await repo.findByTitle('NonExistentTitleXYZ');
    assert.deepStrictEqual(matches, []);
  });

  test('returns null when book is not found by ID', async () => {
    const notFound = await repo.findById(BookId.of('00000000-0000-0000-0000-000000000000'));
    assert.strictEqual(notFound, null);
  });

  test('deletes book by ID', async () => {
    const book = Book.create({
      title: 'Temporary Book',
    });

    await repo.save(book);
    const deleted = await repo.delete(book.id);
    assert.strictEqual(deleted, true);

    const found = await repo.findById(book.id);
    assert.strictEqual(found, null);

    const deletedAgain = await repo.delete(book.id);
    assert.strictEqual(deletedAgain, false);
  });
});
