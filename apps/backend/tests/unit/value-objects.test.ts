import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  BookId,
  BookTitle,
  InvalidBookTitleError,
  InvalidIsbnError,
  Isbn13,
  InvalidPageCountError,
  PageCount,
} from '../../src/features/book/book.js';
import {
  InvalidPageProgressError,
  PageProgress,
} from '../../src/features/reading-status/reading-state.js';
import {
  Email,
  InvalidEmailError,
  InvalidUsernameError,
  Username,
} from '../../src/features/user/user.js';
import { InvalidIdError } from '../../src/utils/uuid.js';
import { InvalidValueError } from '../../src/utils/errors.js';

describe('Value objects', () => {
  test('BookId accepts a UUID, normalises case and compares by value', () => {
    const a = BookId.of('C0EEBC99-9C0B-4EF8-BB6D-6BB9BD380A33');
    const b = BookId.of('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33');
    assert.strictEqual(a.value, 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33');
    assert.ok(a.equals(b));
    assert.throws(() => BookId.of('not-a-uuid'), InvalidIdError);
    assert.notStrictEqual(BookId.generate().value, BookId.generate().value);
  });

  test('BookTitle trims and rejects blank titles', () => {
    assert.strictEqual(BookTitle.of('  Dune ').value, 'Dune');
    assert.throws(() => BookTitle.of('   '), InvalidBookTitleError);
    assert.throws(() => BookTitle.of(undefined), InvalidBookTitleError);
  });

  test('Isbn13 strips hyphens and validates the check digit', () => {
    assert.strictEqual(Isbn13.of('978-0-441-17271-9').value, '9780441172719');
    assert.throws(() => Isbn13.of('9780441172710'), InvalidIsbnError);
    assert.throws(() => Isbn13.of('12345'), InvalidIsbnError);
  });

  test('Isbn13.prefixFrom reads 6 to 13 ISBN digits from a search query', () => {
    assert.strictEqual(Isbn13.prefixFrom('978-0-441 1'), '97804411');
    assert.strictEqual(Isbn13.prefixFrom('9780441172719'), '9780441172719');
    assert.strictEqual(Isbn13.prefixFrom('1984'), null);
    assert.strictEqual(Isbn13.prefixFrom('97804411727190'), null);
    assert.strictEqual(Isbn13.prefixFrom('978044117271X'), null);
  });

  test('PageCount must be a positive integer', () => {
    assert.strictEqual(PageCount.of(328).value, 328);
    assert.throws(() => PageCount.of(0), InvalidPageCountError);
    assert.throws(() => PageCount.of(12.5), InvalidPageCountError);
  });

  test('PageProgress is non-negative and bounded by the page count', () => {
    assert.strictEqual(PageProgress.of(100, PageCount.of(328)).page, 100);
    assert.strictEqual(PageProgress.of(500).page, 500);
    assert.throws(() => PageProgress.of(-1), InvalidPageProgressError);
    assert.throws(() => PageProgress.of(329, PageCount.of(328)), InvalidPageProgressError);
  });

  test('Email is normalised to lower case and validated', () => {
    assert.strictEqual(Email.of(' Reader@Example.com ').value, 'reader@example.com');
    assert.throws(() => Email.of('no-at-sign'), InvalidEmailError);
  });

  test('Username allows letters, digits, underscore and dot', () => {
    assert.strictEqual(Username.of('page_turner').value, 'page_turner');
    assert.throws(() => Username.of('no spaces'), InvalidUsernameError);
    assert.throws(() => Username.of('ab'), InvalidUsernameError);
  });

  test('every validation error is an InvalidValueError', () => {
    assert.throws(() => Isbn13.of('x'), InvalidValueError);
    assert.throws(() => PageCount.of(-3), InvalidValueError);
  });
});
