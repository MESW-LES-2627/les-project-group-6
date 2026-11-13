import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Book } from '../../src/features/book/book.js';
import type { ReadingStatusType } from '../../src/features/reading-status/reading-state.js';
import { ReadingStatus } from '../../src/features/reading-status/reading-status.js';
import { ReviewService } from '../../src/features/review/review-service.js';
import { InvalidRatingError, ReviewNotAllowedError } from '../../src/features/review/review.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { ForbiddenError, NotFoundError } from '../../src/utils/errors.js';
import {
  InMemoryBookRepository,
  InMemoryFriendRepository,
  InMemoryReadingStatusRepository,
  InMemoryReviewQuery,
  InMemoryReviewRepository,
  InMemoryUserRepository,
} from '../helpers/in-memory-repositories.js';

const READER = 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const FRIEND = 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
const STRANGER = 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a13';
const UNKNOWN = 'c1eebc99-9c0b-4ef8-bb6d-6bb9bd380a99';

describe('ReviewService', () => {
  let books: InMemoryBookRepository;
  let statuses: InMemoryReadingStatusRepository;
  let reviews: InMemoryReviewRepository;
  let users: InMemoryUserRepository;
  let friends: InMemoryFriendRepository;
  let query: InMemoryReviewQuery;
  let service: ReviewService;
  let dune: Book;

  const shelve = async (status: ReadingStatusType) => {
    const entry = ReadingStatus.create(UserId.of(READER), dune.id);
    // DNF is only reachable from In progress.
    if (status === 'did-not-finish') entry.startReading();
    entry.changeStatus(status, dune.pageCount);
    await statuses.save(entry);
  };

  const register = async (id: string, name: string) => {
    await users.save(
      User.register({
        id: UserId.of(id),
        email: Email.of(`${name}@example.com`),
        username: Username.of(name),
        displayName: name,
      }),
    );
  };

  beforeEach(async () => {
    books = new InMemoryBookRepository();
    statuses = new InMemoryReadingStatusRepository();
    reviews = new InMemoryReviewRepository();
    users = new InMemoryUserRepository();
    friends = new InMemoryFriendRepository();
    query = new InMemoryReviewQuery();
    service = new ReviewService(reviews, statuses, books, users, friends, query);
    dune = Book.create({ title: 'Dune', pageCount: 688 });
    await books.save(dune);
    await register(READER, 'reader');
    await register(FRIEND, 'friend');
    await register(STRANGER, 'stranger');
    friends.befriend(UserId.of(READER), UserId.of(FRIEND));
  });

  for (const status of ['in-progress', 'finished', 'did-not-finish'] as const) {
    test(`writes a review while ${status}`, async () => {
      await shelve(status);
      const review = await service.write({
        userId: READER,
        bookId: dune.id.value,
        rating: 4,
        comment: 'Great world building',
      });
      assert.equal(review.rating.value, 4);
      assert.equal(review.comment.text, 'Great world building');
    });
  }

  test('refuses a book that is not started', async () => {
    await shelve('not-started');
    await assert.rejects(
      service.write({ userId: READER, bookId: dune.id.value, rating: 4 }),
      ReviewNotAllowedError,
    );
  });

  test('refuses a book that is not in the library', async () => {
    await assert.rejects(
      service.write({ userId: READER, bookId: dune.id.value, rating: 4 }),
      ReviewNotAllowedError,
    );
  });

  test('refuses an unknown book', async () => {
    await assert.rejects(
      service.write({ userId: READER, bookId: UNKNOWN, rating: 4 }),
      NotFoundError,
    );
  });

  test('rejects a rating out of range', async () => {
    await shelve('finished');
    await assert.rejects(
      service.write({ userId: READER, bookId: dune.id.value, rating: 6 }),
      InvalidRatingError,
    );
  });

  test('editing keeps one review with only the new values', async () => {
    await shelve('finished');
    const first = await service.write({
      userId: READER,
      bookId: dune.id.value,
      rating: 4,
      comment: 'Good',
    });
    const second = await service.write({
      userId: READER,
      bookId: dune.id.value,
      rating: 5,
      comment: 'Better',
    });
    assert.ok(second.id.equals(first.id));
    const stored = await reviews.findByUserAndBook(UserId.of(READER), dune.id);
    assert.equal(stored?.rating.value, 5);
    assert.equal(stored?.comment.text, 'Better');
  });

  test('remove deletes the review and is idempotent', async () => {
    await shelve('finished');
    await service.write({ userId: READER, bookId: dune.id.value, rating: 4 });
    await service.remove(READER, dune.id.value);
    await service.remove(READER, dune.id.value);
    assert.equal(await reviews.findByUserAndBook(UserId.of(READER), dune.id), null);
  });

  test('forBook refuses an unknown book', async () => {
    await assert.rejects(service.forBook(UNKNOWN, READER), NotFoundError);
  });

  test('profile reviews: the owner and a friend can see a private profile', async () => {
    await service.forProfile(READER, READER);
    await service.forProfile(READER, FRIEND);
    assert.deepEqual(query.profileCalls, [READER, READER]);
  });

  test('profile reviews: a stranger cannot see a private profile', async () => {
    await assert.rejects(service.forProfile(READER, STRANGER), ForbiddenError);
  });

  test('profile reviews: anyone can see a public profile', async () => {
    const reader = await users.findById(UserId.of(READER));
    reader!.makeProfilePublic();
    await users.save(reader!);
    await service.forProfile(READER, STRANGER);
    assert.deepEqual(query.profileCalls, [READER]);
  });

  test('profile reviews: unknown user', async () => {
    await assert.rejects(service.forProfile(UNKNOWN, READER), NotFoundError);
  });
});
