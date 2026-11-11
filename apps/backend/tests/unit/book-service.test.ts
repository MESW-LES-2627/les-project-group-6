import { test, describe, mock } from 'node:test';
import assert from 'node:assert/strict';
import { Book, type Isbn13 } from '../../src/features/book/book.js';
import { BookService } from '../../src/features/book/book-service.js';
import type { BookCatalog, CatalogBook } from '../../src/features/book/book-catalog.js';
import { InMemoryBookRepository } from '../helpers/in-memory-repositories.js';

class RecordingBookRepository extends InMemoryBookRepository {
  readonly calls: [string, number][] = [];

  override async search(query: string, limit: number): Promise<Book[]> {
    this.calls.push([query, limit]);
    return super.search(query, limit);
  }
}

class CountingBookRepository extends InMemoryBookRepository {
  readonly lookups: (readonly Isbn13[])[] = [];
  readonly saved: string[] = [];

  override async findByIsbns(isbns: readonly Isbn13[]): Promise<Book[]> {
    this.lookups.push(isbns);
    return super.findByIsbns(isbns);
  }

  override async saveWithAuthors(book: Book): Promise<Book> {
    this.saved.push(book.title.value);
    return super.saveWithAuthors(book);
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

class FakeCatalog implements BookCatalog {
  readonly calls: string[] = [];
  constructor(private readonly found: CatalogBook[] = []) {}

  async search(query: string): Promise<CatalogBook[]> {
    this.calls.push(query);
    return this.found;
  }
}

const remote = (title: string, isbn13: string): CatalogBook => ({
  title,
  isbn13,
  authors: ['Someone'],
  description: null,
  pageCount: 300,
  coverUrl: null,
});

describe('BookService.search with a catalogue', () => {
  test('does not ask the catalogue when 5 books are found locally', async () => {
    const books = new InMemoryBookRepository();
    for (const n of [1, 2, 3, 4, 5]) await books.save(Book.create({ title: `Dune ${n}` }));
    const catalog = new FakeCatalog([remote('Dune Messiah', '9780441172696')]);

    const found = await new BookService(books, catalog).search('dune');

    assert.equal(found.length, 5);
    assert.deepEqual(catalog.calls, []);
  });

  test('imports catalogue books after the local ones', async () => {
    const books = new InMemoryBookRepository();
    await books.save(Book.create({ title: 'Dune' }));
    const catalog = new FakeCatalog([remote('Dune Messiah', '9780441172696')]);

    const found = await new BookService(books, catalog).search('dune');

    assert.deepEqual(
      found.map((b) => b.title.value),
      ['Dune', 'Dune Messiah'],
    );
    const imported = await books.findById(found[1]!.id);
    assert.equal(imported?.isCommunityAdded, false);
    assert.equal(imported?.pageCount?.value, 300);
  });

  test('reuses a book that already has the ISBN-13 instead of importing it again', async () => {
    const books = new InMemoryBookRepository();
    const existing = Book.create({ title: 'Some Other Title', isbn13: '9780441172719' });
    await books.save(existing);
    const catalog = new FakeCatalog([remote('Dune', '9780441172719')]);

    const found = await new BookService(books, catalog).search('dune');

    assert.deepEqual(
      found.map((b) => b.id.value),
      [existing.id.value],
    );
  });

  test('does not repeat a local book the catalogue also returns', async () => {
    const books = new InMemoryBookRepository();
    await books.save(Book.create({ title: 'Dune', isbn13: '9780441172719' }));
    const catalog = new FakeCatalog([remote('Dune', '9780441172719')]);

    const found = await new BookService(books, catalog).search('dune');

    assert.equal(found.length, 1);
  });

  test('keeps the local results when the catalogue has nothing', async () => {
    const books = new InMemoryBookRepository();
    await books.save(Book.create({ title: 'Dune' }));

    const found = await new BookService(books, new FakeCatalog()).search('dune');

    assert.deepEqual(
      found.map((b) => b.title.value),
      ['Dune'],
    );
  });

  test('returns at most 20 books', async () => {
    const books = new InMemoryBookRepository();
    const many = Array.from({ length: 25 }, (_, i) => {
      // Valid ISBN-13s 978000000000c with the right check digit for each i.
      const base = `9780000000${String(i).padStart(2, '0')}`;
      const sum = [...base].reduce((acc, d, j) => acc + Number(d) * (j % 2 === 0 ? 1 : 3), 0);
      return remote(`Book ${i}`, base + String((10 - (sum % 10)) % 10));
    });

    const found = await new BookService(books, new FakeCatalog(many)).search('book');

    assert.equal(found.length, 20);
  });

  test('looks the ISBNs up in one query and saves only the missing books', async () => {
    const books = new CountingBookRepository();
    const existing = Book.create({ title: 'Other Title', isbn13: '9780441172719' });
    await books.save(existing);
    const catalog = new FakeCatalog([
      remote('Dune', '9780441172719'),
      remote('Dune Messiah', '9780441172696'),
      remote('Broken', '1234567890123'),
    ]);

    const found = await new BookService(books, catalog).search('dune');

    assert.equal(books.lookups.length, 1);
    assert.deepEqual(
      books.lookups[0]!.map((i) => i.value),
      ['9780441172719', '9780441172696'],
    );
    assert.deepEqual(books.saved, ['Dune Messiah']);
    assert.deepEqual(
      found.map((b) => b.title.value),
      ['Other Title', 'Dune Messiah'],
    );
  });

  test('keeps the local results when importing a catalogue book fails', async () => {
    class FailingBookRepository extends InMemoryBookRepository {
      override async saveWithAuthors(): Promise<Book> {
        throw new Error('connection lost');
      }
    }
    const books = new FailingBookRepository();
    await books.save(Book.create({ title: 'Dune' }));
    const catalog = new FakeCatalog([remote('Dune Messiah', '9780441172696')]);

    const warn = mock.method(console, 'warn', () => {});
    try {
      const found = await new BookService(books, catalog).search('dune');

      assert.deepEqual(
        found.map((b) => b.title.value),
        ['Dune'],
      );
      assert.equal(warn.mock.callCount(), 1);
      assert.ok(!String(warn.mock.calls[0]!.arguments[0]).includes('dune'));
    } finally {
      warn.mock.restore();
    }
  });
});
