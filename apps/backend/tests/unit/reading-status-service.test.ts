// @req F-LIB-01 F-READ-02
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ReadingStatusService } from '../../src/features/reading-status/reading-status-service.js';
import { Book, BookId } from '../../src/features/book/book.js';
import {
  InvalidPageProgressError,
  InvalidReadingTransitionError,
} from '../../src/features/reading-status/reading-state.js';
import { ProgressNotAllowedError } from '../../src/features/reading-status/reading-status.js';
import { UserId } from '../../src/features/user/user.js';
import type { StreakService } from '../../src/features/user/streak-service.js';
import { NotFoundError } from '../../src/utils/errors.js';
import {
  InMemoryBookRepository,
  InMemoryReadingStatusRepository,
} from '../helpers/in-memory-repositories.js';

const USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const OTHER_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';

describe('ReadingStatusService', () => {
  let books: InMemoryBookRepository;
  let statuses: InMemoryReadingStatusRepository;
  let service: ReadingStatusService;
  let book: Book;

  beforeEach(async () => {
    books = new InMemoryBookRepository();
    statuses = new InMemoryReadingStatusRepository();
    service = new ReadingStatusService(statuses, books);
    book = Book.create({ title: 'Dune', pageCount: 688 });
    await books.save(book);
  });

  test('set creates the entry once and then updates it', async () => {
    const first = await service.set({
      userId: USER_ID,
      bookId: book.id.value,
      status: 'in-progress',
      currentPage: 10,
    });
    const second = await service.set({
      userId: USER_ID,
      bookId: book.id.value,
      status: 'in-progress',
      currentPage: 20,
    });
    assert.ok(first.id.equals(second.id));
    assert.strictEqual(second.progress.page, 20);
  });

  test('set ignores the page when the target status does not track progress', async () => {
    const entry = await service.set({
      userId: USER_ID,
      bookId: book.id.value,
      status: 'finished',
      currentPage: 10,
    });
    assert.strictEqual(entry.progress.page, 688);
  });

  test('set fails for an unknown book', async () => {
    await assert.rejects(
      service.set({
        userId: USER_ID,
        bookId: '00000000-0000-0000-0000-000000000000',
        status: 'in-progress',
      }),
      NotFoundError,
    );
  });

  test('update records progress bounded by the page count', async () => {
    const entry = await service.set({
      userId: USER_ID,
      bookId: book.id.value,
      status: 'in-progress',
    });
    const updated = await service.update({ id: entry.id.value, userId: USER_ID, currentPage: 300 });
    assert.strictEqual(updated.progress.page, 300);

    await assert.rejects(
      service.update({ id: entry.id.value, userId: USER_ID, currentPage: 689 }),
      InvalidPageProgressError,
    );
  });

  test('update enforces the reading lifecycle', async () => {
    const entry = await service.set({
      userId: USER_ID,
      bookId: book.id.value,
      status: 'not-started',
    });
    await assert.rejects(
      service.update({ id: entry.id.value, userId: USER_ID, status: 'did-not-finish' }),
      InvalidReadingTransitionError,
    );
    await assert.rejects(
      service.update({ userId: USER_ID, bookId: book.id.value, currentPage: 5 }),
      ProgressNotAllowedError,
    );
  });

  test('update fails when the entry does not exist', async () => {
    await assert.rejects(
      service.update({
        id: '00000000-0000-0000-0000-000000000000',
        userId: USER_ID,
        status: 'finished',
      }),
      NotFoundError,
    );
  });

  describe('dates handling in set and update', () => {
    test('set with startedOn and finishedOn saves dates on the entry', async () => {
      const entry = await service.set({
        userId: USER_ID,
        bookId: book.id.value,
        status: 'finished',
        startedOn: '2026-10-01',
        finishedOn: '2026-10-15',
      });
      assert.strictEqual(entry.startedOn, '2026-10-01');
      assert.strictEqual(entry.finishedOn, '2026-10-15');
    });

    test('update can set or override dates', async () => {
      const entry = await service.set({
        userId: USER_ID,
        bookId: book.id.value,
        status: 'in-progress',
      });
      const updated = await service.update({
        id: entry.id.value,
        userId: USER_ID,
        startedOn: '2026-09-01',
        finishedOn: '2026-09-20',
      });
      assert.strictEqual(updated.startedOn, '2026-09-01');
      assert.strictEqual(updated.finishedOn, '2026-09-20');
    });
  });

  describe('remove and removeById', () => {
    test('remove deletes entry by userId and bookId', async () => {
      await service.set({ userId: USER_ID, bookId: book.id.value, status: 'in-progress' });
      await service.remove(USER_ID, book.id.value);

      const found = await statuses.findByUserAndBook(UserId.of(USER_ID), book.id);
      assert.strictEqual(found, null);
      await assert.rejects(service.remove(USER_ID, book.id.value), NotFoundError);
    });

    test('removeById deletes entry by id', async () => {
      const entry = await service.set({
        userId: USER_ID,
        bookId: book.id.value,
        status: 'in-progress',
      });
      await service.removeById(USER_ID, entry.id.value);
      await assert.rejects(service.removeById(USER_ID, entry.id.value), NotFoundError);
    });

    test("removeById reports another reader's entry as not found and keeps it", async () => {
      const entry = await service.set({
        userId: USER_ID,
        bookId: book.id.value,
        status: 'in-progress',
      });
      await assert.rejects(service.removeById(OTHER_USER_ID, entry.id.value), NotFoundError);
      assert.ok(await statuses.findById(entry.id));
    });
  });

  describe('ensureInProgress', () => {
    test('adds missing book as in-progress', async () => {
      const result = await service.ensureInProgress(UserId.of(USER_ID), book.id);
      assert.strictEqual(result.status, 'in-progress');
      assert.ok(result.startedOn);
    });

    test('advances not-started to in-progress', async () => {
      await service.set({ userId: USER_ID, bookId: book.id.value, status: 'not-started' });
      const result = await service.ensureInProgress(UserId.of(USER_ID), book.id);
      assert.strictEqual(result.status, 'in-progress');
    });

    test('leaves already finished book unchanged', async () => {
      await service.set({ userId: USER_ID, bookId: book.id.value, status: 'finished' });
      const result = await service.ensureInProgress(UserId.of(USER_ID), book.id);
      assert.strictEqual(result.status, 'finished');
    });

    test('throws NotFoundError for unknown book', async () => {
      await assert.rejects(
        service.ensureInProgress(UserId.of(USER_ID), BookId.generate()),
        NotFoundError,
      );
    });
  });

  test("update reports another reader's entry as not found and leaves it unchanged", async () => {
    const entry = await service.set({
      userId: USER_ID,
      bookId: book.id.value,
      status: 'in-progress',
    });

    await assert.rejects(
      service.update({ id: entry.id.value, userId: OTHER_USER_ID, status: 'finished' }),
      NotFoundError,
    );
    assert.strictEqual((await statuses.findById(entry.id))?.status, 'in-progress');
  });

  describe('streak triggering on page progress', () => {
    let recordedUsers: string[];
    let streakService: StreakService;
    let serviceWithStreak: ReadingStatusService;

    beforeEach(() => {
      recordedUsers = [];
      streakService = {
        recordReadToday: async (userId: UserId) => {
          recordedUsers.push(userId.value);
          return { updated: true, currentStreak: 1, longestStreak: 1, hitStreak: true };
        },
      } as unknown as StreakService;
      serviceWithStreak = new ReadingStatusService(statuses, books, streakService);
    });

    test('triggers streak when setting in-progress with page progress', async () => {
      await serviceWithStreak.set({
        userId: USER_ID,
        bookId: book.id.value,
        status: 'in-progress',
        currentPage: 25,
      });
      assert.deepStrictEqual(recordedUsers, [USER_ID]);
    });

    test('does not trigger streak when setting status other than in-progress', async () => {
      await serviceWithStreak.set({
        userId: USER_ID,
        bookId: book.id.value,
        status: 'finished',
      });
      assert.deepStrictEqual(recordedUsers, []);
    });

    test('triggers streak on update when currentPage is higher than previous page', async () => {
      const entry = await serviceWithStreak.set({
        userId: USER_ID,
        bookId: book.id.value,
        status: 'in-progress',
        currentPage: 10,
      });
      recordedUsers = [];

      await serviceWithStreak.update({
        id: entry.id.value,
        userId: USER_ID,
        currentPage: 20,
      });
      assert.deepStrictEqual(recordedUsers, [USER_ID]);
    });

    test('does not trigger streak on update when currentPage is same or lower', async () => {
      const entry = await serviceWithStreak.set({
        userId: USER_ID,
        bookId: book.id.value,
        status: 'in-progress',
        currentPage: 50,
      });
      recordedUsers = [];

      await serviceWithStreak.update({
        id: entry.id.value,
        userId: USER_ID,
        currentPage: 50,
      });
      assert.deepStrictEqual(recordedUsers, []);

      await serviceWithStreak.update({
        id: entry.id.value,
        userId: USER_ID,
        currentPage: 30,
      });
      assert.deepStrictEqual(recordedUsers, []);
    });

    test('does not trigger streak when update does not provide currentPage', async () => {
      const entry = await serviceWithStreak.set({
        userId: USER_ID,
        bookId: book.id.value,
        status: 'in-progress',
        currentPage: 10,
      });
      recordedUsers = [];

      await serviceWithStreak.update({
        id: entry.id.value,
        userId: USER_ID,
        startedOn: '2026-11-01',
      });
      assert.deepStrictEqual(recordedUsers, []);
    });
  });
});
