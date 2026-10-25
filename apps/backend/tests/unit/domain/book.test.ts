import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Book } from '../../../src/domain/book/book.js';
import { InvalidBookTitleError } from '../../../src/domain/book/book-title.js';
import { InvalidIsbnError } from '../../../src/domain/book/isbn13.js';
import { InvalidPageProgressError } from '../../../src/domain/reading/page-progress.js';

describe('Book', () => {
  test('create generates an identity and wraps fields in value objects', () => {
    const book = Book.create({ title: ' Dune ', isbn13: '978-0-441-17271-9', pageCount: 688 });
    assert.ok(book.id.value);
    assert.strictEqual(book.title.value, 'Dune');
    assert.strictEqual(book.isbn13?.value, '9780441172719');
    assert.strictEqual(book.pageCount?.value, 688);
    assert.strictEqual(book.isCommunityAdded, false);
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
