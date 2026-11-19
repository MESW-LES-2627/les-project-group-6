// @req F-BOOK-02
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Book, InvalidBookTitleError, InvalidIsbnError } from '../../src/features/book/book.js';
import { InvalidPageProgressError } from '../../src/features/reading-status/reading-state.js';

describe('Book', () => {
  test('create generates an identity and wraps fields in value objects', () => {
    const book = Book.create({ title: ' Dune ', isbn13: '978-0-441-17271-9', pageCount: 688 });
    assert.ok(book.id.value);
    assert.strictEqual(book.title.value, 'Dune');
    assert.strictEqual(book.isbn13?.value, '9780441172719');
    assert.strictEqual(book.pageCount?.value, 688);
    assert.strictEqual(book.isCommunityAdded, false);
  });

  test('create keeps author names trimmed, without blanks or repeats', () => {
    const book = Book.create({
      title: 'Good Omens',
      authors: [' Terry Pratchett', 'Neil Gaiman', '', 'Terry Pratchett '],
    });
    assert.deepStrictEqual(book.authors, ['Terry Pratchett', 'Neil Gaiman']);
    assert.deepStrictEqual(Book.create({ title: 'Anonymous' }).authors, []);
  });

  test('create refuses an invalid book', () => {
    assert.throws(() => Book.create({ title: '' }), InvalidBookTitleError);
    assert.throws(() => Book.create({ title: 'Dune', isbn13: '123' }), InvalidIsbnError);
  });

  test('progressAt is bounded by the page count', () => {
    const book = Book.create({ title: 'Dune', pageCount: 688 });
    assert.strictEqual(book.progressAt(688).page, 688);
    assert.throws(() => book.progressAt(689), InvalidPageProgressError);
    assert.strictEqual(Book.create({ title: 'No pages' }).progressAt(1000).page, 1000);
  });
});
