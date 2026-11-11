import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Book } from '../../src/features/book/book.js';
import { BookService } from '../../src/features/book/book-service.js';
import { InMemoryBookRepository } from '../helpers/in-memory-repositories.js';

class RecordingBookRepository extends InMemoryBookRepository {
  readonly calls: [string, number][] = [];

  override async search(query: string, limit: number): Promise<Book[]> {
    this.calls.push([query, limit]);
    return super.search(query, limit);
  }
}

describe('BookService.search', () => {
  test('trims the query and asks for 20 books', async () => {
    const books = new RecordingBookRepository();
    await books.save(Book.create({ title: 'Dune' }));

    const found = await new BookService(books).search('  dune  ');

    assert.deepEqual(
      found.map((b) => b.title.value),
      ['Dune'],
    );
    assert.deepEqual(books.calls, [['dune', 20]]);
  });

  test('returns nothing for blank text without searching', async () => {
    const books = new RecordingBookRepository();

    assert.deepEqual(await new BookService(books).search('   '), []);
    assert.deepEqual(books.calls, []);
  });

  test('cuts the query to 100 characters', async () => {
    const books = new RecordingBookRepository();

    await new BookService(books).search('a'.repeat(150));

    assert.equal(books.calls[0]![0].length, 100);
  });
});
