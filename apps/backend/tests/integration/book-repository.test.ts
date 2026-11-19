// @req F-EXP-01 F-BOOK-02 F-BOOK-03
import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../../src/database/pool.js';
import { DrizzleBookRepository } from '../../src/features/book/book-repository.js';
import { Book, BookId, Isbn13 } from '../../src/features/book/book.js';
import { createTestPool, truncateTables } from '../helpers/test-db.js';

describe('DrizzleBookRepository Integration', () => {
  const pool = createTestPool();
  const db = createDb(pool);
  const repo = new DrizzleBookRepository(db);

  // Book has no authors, so tests link them with plain SQL.
  async function addAuthor(book: Book, name: string): Promise<void> {
    const { rows } = await pool.query<{ id: string }>(
      'INSERT INTO authors (name) VALUES ($1) RETURNING id',
      [name],
    );
    await pool.query('INSERT INTO book_authors (book_id, author_id) VALUES ($1, $2)', [
      book.id.value,
      rows[0]!.id,
    ]);
  }

  const titles = (found: Book[]) => found.map((b) => b.title.value);

  beforeEach(async () => {
    await truncateTables(pool, ['books', 'authors']);
  });

  after(async () => {
    await truncateTables(pool, ['books', 'authors']);
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
  test('findByIds returns the books that exist and ignores unknown ids', async () => {
    const dune = Book.create({ title: 'Dune' });
    const emma = Book.create({ title: 'Emma' });
    await repo.save(dune);
    await repo.save(emma);

    const found = await repo.findByIds([dune.id, BookId.generate(), emma.id]);

    assert.deepEqual(found.map((b) => b.title.value).sort(), ['Dune', 'Emma']);
    assert.deepEqual(await repo.findByIds([]), []);
  });

  test('random returns up to the limit of distinct books', async () => {
    for (const title of ['Dune', 'Emma', 'Circe']) await repo.save(Book.create({ title }));

    const two = await repo.random(2);
    assert.equal(two.length, 2);
    assert.notEqual(two[0]!.id.value, two[1]!.id.value);
    assert.deepEqual((await repo.random(10)).map((b) => b.title.value).sort(), [
      'Circe',
      'Dune',
      'Emma',
    ]);
    assert.deepEqual(await repo.random(0), []);
  });

  test('findByIsbn returns the book with that ISBN-13, or null', async () => {
    const dune = Book.create({ title: 'Dune', isbn13: '9780441172719' });
    await repo.save(dune);

    assert.equal((await repo.findByIsbn(Isbn13.of('9780441172719')))?.id.value, dune.id.value);
    assert.equal(await repo.findByIsbn(Isbn13.of('9780451524935')), null);
  });

  test('findByIsbns returns the books with those ISBN-13s in one call', async () => {
    const dune = Book.create({ title: 'Dune', isbn13: '9780441172719' });
    const mort = Book.create({ title: 'Mort', isbn13: '9780062225719' });
    await repo.save(dune);
    await repo.save(mort);
    await repo.save(Book.create({ title: 'No ISBN' }));

    const found = await repo.findByIsbns([
      Isbn13.of('9780441172719'),
      Isbn13.of('9780062225719'),
      Isbn13.of('9780451524935'),
    ]);

    assert.deepEqual(titles(found).sort(), ['Dune', 'Mort']);
    assert.deepEqual(await repo.findByIsbns([]), []);
  });

  test('saveWithAuthors links the authors, reusing one that already exists', async () => {
    const first = Book.create({ title: 'Good Omens', isbn13: '9780060853983' });
    const saved = await repo.saveWithAuthors(first, ['Terry Pratchett', 'Neil Gaiman']);
    const second = Book.create({ title: 'Mort', isbn13: '9780062225719' });
    await repo.saveWithAuthors(second, ['Terry Pratchett']);

    assert.equal(saved.id.value, first.id.value);
    const { rows: authorRows } = await pool.query('SELECT name FROM authors ORDER BY name');
    assert.deepEqual(
      authorRows.map((r) => r.name),
      ['Neil Gaiman', 'Terry Pratchett'],
    );
    assert.deepEqual(titles(await repo.search('pratchett', 10)), ['Good Omens', 'Mort']);
  });

  test('saveWithAuthors creates one author when two imports run at once', async () => {
    await Promise.all([
      repo.saveWithAuthors(
        Book.create({ title: 'A Wizard of Earthsea', isbn13: '9780547773742' }),
        ['Ursula K. Le Guin'],
      ),
      repo.saveWithAuthors(Book.create({ title: 'The Dispossessed', isbn13: '9780061054884' }), [
        'Ursula K. Le Guin',
      ]),
    ]);

    const { rows } = await pool.query(
      "SELECT count(*)::int AS n FROM authors WHERE name = 'Ursula K. Le Guin'",
    );
    assert.equal(rows[0].n, 1);
    const { rows: links } = await pool.query('SELECT count(*)::int AS n FROM book_authors');
    assert.equal(links[0].n, 2);
  });

  test('saveWithAuthors reuses an author whose name differs only in case or accents', async () => {
    await repo.saveWithAuthors(Book.create({ title: 'Blindness', isbn13: '9780156007757' }), [
      'José Saramago',
    ]);
    await repo.saveWithAuthors(Book.create({ title: 'Seeing', isbn13: '9780156032742' }), [
      'jose saramago',
    ]);

    const { rows } = await pool.query('SELECT name FROM authors');
    assert.deepEqual(
      rows.map((r) => r.name),
      ['José Saramago'],
    );
  });

  test('saveWithAuthors returns the existing book when the ISBN-13 is taken', async () => {
    const existing = Book.create({ title: 'Dune', isbn13: '9780441172719' });
    await repo.save(existing);

    const winner = await repo.saveWithAuthors(
      Book.create({ title: 'Dune (copy)', isbn13: '9780441172719' }),
      ['Frank Herbert'],
    );

    assert.equal(winner.id.value, existing.id.value);
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM books');
    assert.equal(rows[0].n, 1);
  });

  describe('search', () => {
    test('finds a title despite a typo', async () => {
      await repo.save(Book.create({ title: "Harry Potter and the Philosopher's Stone" }));
      await repo.save(Book.create({ title: 'Dune' }));

      assert.deepEqual(titles(await repo.search('harry potter', 20)), [
        "Harry Potter and the Philosopher's Stone",
      ]);
    });

    test('finds a half-typed title', async () => {
      await repo.save(Book.create({ title: 'The Hobbit: There and Back Again' }));

      assert.deepEqual(titles(await repo.search('the hobb', 20)), [
        'The Hobbit: There and Back Again',
      ]);
    });

    test('ignores accents and case', async () => {
      await repo.save(Book.create({ title: 'Memórias Póstumas de Brás Cubas' }));

      assert.deepEqual(titles(await repo.search('MEMORIAS', 20)), [
        'Memórias Póstumas de Brás Cubas',
      ]);
    });

    test('finds books by author despite a typo, once per book', async () => {
      const blindness = Book.create({ title: 'Blindness' });
      await repo.save(blindness);
      await repo.save(Book.create({ title: 'Dune' }));
      await addAuthor(blindness, 'José Saramago');
      await addAuthor(blindness, 'Saramago, J.');

      assert.deepEqual(titles(await repo.search('saramgo', 20)), ['Blindness']);
    });

    test('finds an ISBN with or without hyphens, and by prefix', async () => {
      await repo.save(Book.create({ title: 'Dune', isbn13: '9780441172719' }));
      await repo.save(Book.create({ title: '1984', isbn13: '9780451524935' }));

      assert.deepEqual(titles(await repo.search('9780441172719', 20)), ['Dune']);
      assert.deepEqual(titles(await repo.search('978-0-441-17271-9', 20)), ['Dune']);
      assert.deepEqual(titles(await repo.search('978-0-441-1', 20)), ['Dune']);
      assert.deepEqual(titles(await repo.search('97804411727', 20)), ['Dune']);
      assert.deepEqual(titles(await repo.search('978-0-451-5249', 20)), ['1984']);
    });

    test('treats a short number as a title, not an ISBN', async () => {
      await repo.save(Book.create({ title: '1984', isbn13: '9780451524935' }));
      await repo.save(Book.create({ title: 'Dune', isbn13: '9780441172719' }));

      assert.deepEqual(titles(await repo.search('1984', 20)), ['1984']);
    });

    test('ranks an ISBN match first', async () => {
      await repo.save(Book.create({ title: '9780441172719 Annotated' }));
      await repo.save(Book.create({ title: 'Dune', isbn13: '9780441172719' }));

      assert.deepEqual(titles(await repo.search('9780441172719', 20)), [
        'Dune',
        '9780441172719 Annotated',
      ]);
    });

    test('ranks title prefixes above weaker fuzzy matches, then by title', async () => {
      for (const title of ['The Dunes of Mars', 'Dune Messiah', 'Dune']) {
        await repo.save(Book.create({ title }));
      }

      assert.deepEqual(titles(await repo.search('dune', 20)), [
        'Dune',
        'Dune Messiah',
        'The Dunes of Mars',
      ]);
    });

    test('matches only prefixes for queries under 3 characters', async () => {
      await repo.save(Book.create({ title: 'Dune' }));
      await repo.save(Book.create({ title: 'The Dunes of Mars' }));

      assert.deepEqual(titles(await repo.search('du', 20)), ['Dune']);
    });

    test('matches an author by prefix for a short query', async () => {
      const blindness = Book.create({ title: 'Blindness' });
      await repo.save(blindness);
      await repo.save(Book.create({ title: 'Dune' }));
      await addAuthor(blindness, 'José Saramago');

      assert.deepEqual(titles(await repo.search('sa', 20)), ['Blindness']);
    });

    test('treats % and _ literally', async () => {
      await repo.save(Book.create({ title: 'Dune' }));

      assert.deepEqual(await repo.search('%', 20), []);
      assert.deepEqual(await repo.search('_', 20), []);
    });

    test('returns nothing for unrelated text and caps at the limit', async () => {
      for (const title of ['Dune', 'Dune Messiah', 'Children of Dune']) {
        await repo.save(Book.create({ title }));
      }

      assert.deepEqual(await repo.search('xyzzy', 20), []);
      assert.equal((await repo.search('dune', 2)).length, 2);
      assert.deepEqual(await repo.search('dune', 0), []);
    });
  });
});
