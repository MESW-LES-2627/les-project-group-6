// @req F-LIB-02
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  InvalidRatingError,
  Rating,
  Review,
  ReviewComment,
} from '../../src/features/review/review.js';
import { BookId } from '../../src/features/book/book.js';
import { UserId } from '../../src/features/user/user.js';
import { InvalidValueError } from '../../src/utils/errors.js';

const USER = UserId.of('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
const BOOK = BookId.of('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21');

describe('Rating', () => {
  test('accepts 1 to 5', () => {
    assert.equal(Rating.of(1).value, 1);
    assert.equal(Rating.of(5).value, 5);
  });

  for (const raw of [0, 6, 2.5, '4', null, undefined]) {
    test(`rejects ${String(raw)}`, () => {
      assert.throws(
        () => Rating.of(raw),
        (e: unknown) => {
          assert.ok(e instanceof InvalidRatingError);
          assert.equal((e as Error).message, 'Rating must be between 1 and 5');
          return true;
        },
      );
    });
  }
});

describe('ReviewComment', () => {
  test('trims the text', () => {
    assert.equal(ReviewComment.of('  Great world building ').text, 'Great world building');
  });

  test('maps empty, missing and null to null', () => {
    assert.equal(ReviewComment.of('   ').text, null);
    assert.equal(ReviewComment.of(undefined).text, null);
    assert.equal(ReviewComment.of(null).text, null);
  });

  test('accepts 2000 characters and rejects 2001', () => {
    assert.equal(ReviewComment.of('a'.repeat(2000)).text?.length, 2000);
    assert.throws(
      () => ReviewComment.of('a'.repeat(2001)),
      (e: unknown) =>
        e instanceof InvalidValueError && e.message === 'Comment must be at most 2000 characters',
    );
  });

  test('rejects a non-string', () => {
    assert.throws(() => ReviewComment.of(42), InvalidValueError);
  });
});

describe('Review', () => {
  test('write sets both dates and revise changes the text and updatedAt only', () => {
    const written = new Date('2026-11-01T10:00:00Z');
    const review = Review.write(USER, BOOK, Rating.of(4), ReviewComment.of('Good'), written);
    assert.equal(review.rating.value, 4);
    assert.equal(review.comment.text, 'Good');
    assert.deepEqual(review.createdAt, written);

    const later = new Date('2026-11-02T10:00:00Z');
    review.revise(Rating.of(5), ReviewComment.of(''), later);
    assert.equal(review.rating.value, 5);
    assert.equal(review.comment.text, null);
    assert.deepEqual(review.createdAt, written);
    assert.deepEqual(review.updatedAt, later);
  });
});
