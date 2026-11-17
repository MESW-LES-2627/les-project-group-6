import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Book, type BookId } from '../../src/features/book/book.js';
import { ReadingStatus } from '../../src/features/reading-status/reading-status.js';
import type { ReadingStatusService } from '../../src/features/reading-status/reading-status-service.js';
import type { UserId } from '../../src/features/user/user.js';
import type { StreakService } from '../../src/features/user/streak-service.js';
import {
  AnotherSessionActiveError,
  ReadingSessionService,
} from '../../src/features/reading-session/reading-session-service.js';
import {
  NotSessionOwnerError,
  SessionAlreadyFinishedError,
} from '../../src/features/reading-session/reading-session.js';
import { NotFoundError } from '../../src/utils/errors.js';
import {
  InMemoryBookRepository,
  InMemoryReadingSessionRepository,
} from '../helpers/in-memory-repositories.js';

const USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('ReadingSessionService', () => {
  let books: InMemoryBookRepository;
  let service: ReadingSessionService;
  let book: Book;
  let now: Date;

  const advance = (seconds: number) => {
    now = new Date(now.getTime() + seconds * 1000);
  };

  beforeEach(async () => {
    books = new InMemoryBookRepository();
    now = new Date('2026-10-31T10:00:00Z');
    service = new ReadingSessionService(new InMemoryReadingSessionRepository(), books, () => now);
    book = Book.create({ title: 'Dune', pageCount: 688 });
    await books.save(book);
  });

  test('start then finish adds the server-measured minutes to the stats', async () => {
    const session = await service.start({ userId: USER_ID, bookId: book.id.value });
    advance(30 * 60);
    const finished = await service.finish({ id: session.id.value, userId: USER_ID });

    assert.strictEqual(finished.countedMinutes, 30);
    assert.deepStrictEqual(await service.stats(USER_ID), { totalMinutes: 30, sessionsCount: 1 });
  });

  test('starting again on the same book resumes the running session', async () => {
    const first = await service.start({ userId: USER_ID, bookId: book.id.value });
    advance(120);
    const again = await service.start({ userId: USER_ID, bookId: book.id.value });

    assert.ok(again.id.equals(first.id));
    assert.strictEqual(service.elapsedSeconds(again), 120);
  });

  test('only one session can run at a time', async () => {
    const other = Book.create({ title: 'Emma' });
    await books.save(other);
    await service.start({ userId: USER_ID, bookId: book.id.value });

    await assert.rejects(
      service.start({ userId: USER_ID, bookId: other.id.value }),
      AnotherSessionActiveError,
    );
  });

  test('starting on an unknown book fails', async () => {
    await assert.rejects(
      service.start({ userId: USER_ID, bookId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99' }),
      NotFoundError,
    );
  });

  test('starting a session calls ensureInProgress when hook is provided', async () => {
    let ensuredUserId: string | null = null;
    let ensuredBookId: string | null = null;

    const hookService = new ReadingSessionService(
      new InMemoryReadingSessionRepository(),
      books,
      () => now,
      {
        ensureInProgress: async (userId: UserId, bookId: BookId) => {
          ensuredUserId = userId.value;
          ensuredBookId = bookId.value;
          return ReadingStatus.create(userId, bookId);
        },
      } as unknown as ReadingStatusService,
    );

    await hookService.start({ userId: USER_ID, bookId: book.id.value });
    assert.strictEqual(ensuredUserId, USER_ID);
    assert.strictEqual(ensuredBookId, book.id.value);
  });

  test('active sessions are not counted in the stats', async () => {
    await service.start({ userId: USER_ID, bookId: book.id.value });
    advance(600);
    assert.deepStrictEqual(await service.stats(USER_ID), { totalMinutes: 0, sessionsCount: 0 });
  });

  describe('page reload', () => {
    test('starting again keeps the same session and its original start time', async () => {
      const first = await service.start({ userId: USER_ID, bookId: book.id.value });
      advance(5 * 60);
      const reloaded = await service.start({ userId: USER_ID, bookId: book.id.value });

      assert.ok(reloaded.id.equals(first.id));
      assert.strictEqual(reloaded.startedAt.getTime(), first.startedAt.getTime());
      assert.strictEqual(service.elapsedSeconds(reloaded), 5 * 60);
    });

    test('the active session is found again after a reload', async () => {
      const first = await service.start({ userId: USER_ID, bookId: book.id.value });
      advance(90);
      const active = await service.active(USER_ID);

      assert.ok(active?.id.equals(first.id));
      assert.strictEqual(service.elapsedSeconds(active!), 90);
    });

    test('reloading many times still counts the whole session once', async () => {
      const first = await service.start({ userId: USER_ID, bookId: book.id.value });
      for (let i = 0; i < 3; i += 1) {
        advance(10 * 60);
        await service.start({ userId: USER_ID, bookId: book.id.value });
      }
      await service.finish({ id: first.id.value, userId: USER_ID });

      assert.deepStrictEqual(await service.stats(USER_ID), { totalMinutes: 30, sessionsCount: 1 });
    });
  });

  describe('cancel', () => {
    test('a cancelled session is discarded and counts nothing', async () => {
      const session = await service.start({ userId: USER_ID, bookId: book.id.value });
      advance(20 * 60);
      await service.cancel({ id: session.id.value, userId: USER_ID });

      assert.strictEqual(await service.active(USER_ID), null);
      assert.deepStrictEqual(await service.stats(USER_ID), { totalMinutes: 0, sessionsCount: 0 });
    });

    test('after cancelling, a new session can start on another book', async () => {
      const other = Book.create({ title: 'Emma' });
      await books.save(other);
      const mistaken = await service.start({ userId: USER_ID, bookId: book.id.value });
      await service.cancel({ id: mistaken.id.value, userId: USER_ID });

      const next = await service.start({ userId: USER_ID, bookId: other.id.value });
      assert.ok(!next.id.equals(mistaken.id));
    });

    test('a finished session cannot be cancelled', async () => {
      const session = await service.start({ userId: USER_ID, bookId: book.id.value });
      advance(60);
      await service.finish({ id: session.id.value, userId: USER_ID });

      await assert.rejects(
        service.cancel({ id: session.id.value, userId: USER_ID }),
        SessionAlreadyFinishedError,
      );
    });

    test('only the owner can cancel', async () => {
      const session = await service.start({ userId: USER_ID, bookId: book.id.value });
      await assert.rejects(
        service.cancel({ id: session.id.value, userId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12' }),
        NotSessionOwnerError,
      );
    });

    test('cancelling an unknown session fails', async () => {
      await assert.rejects(
        service.cancel({ id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a99', userId: USER_ID }),
        NotFoundError,
      );
    });
  });

  describe('streak triggering on session finish', () => {
    test('finishing a reading session records read today on streak service', async () => {
      let recordedUser: string | null = null;
      const streakService = {
        recordReadToday: async (userId: UserId) => {
          recordedUser = userId.value;
          return { updated: true, currentStreak: 1, longestStreak: 1, hitStreak: true };
        },
      } as unknown as StreakService;

      const sessions = new InMemoryReadingSessionRepository();
      const serviceWithStreak = new ReadingSessionService(
        sessions,
        books,
        () => now,
        undefined,
        streakService,
      );

      const session = await serviceWithStreak.start({ userId: USER_ID, bookId: book.id.value });
      advance(15 * 60);
      await serviceWithStreak.finish({ id: session.id.value, userId: USER_ID });

      assert.strictEqual(recordedUser, USER_ID);
    });

    test('cancelling a reading session does not record read today', async () => {
      let recordedUser: string | null = null;
      const streakService = {
        recordReadToday: async (userId: UserId) => {
          recordedUser = userId.value;
          return { updated: true, currentStreak: 1, longestStreak: 1, hitStreak: true };
        },
      } as unknown as StreakService;

      const sessions = new InMemoryReadingSessionRepository();
      const serviceWithStreak = new ReadingSessionService(
        sessions,
        books,
        () => now,
        undefined,
        streakService,
      );

      const session = await serviceWithStreak.start({ userId: USER_ID, bookId: book.id.value });
      advance(15 * 60);
      await serviceWithStreak.cancel({ id: session.id.value, userId: USER_ID });

      assert.strictEqual(recordedUser, null);
    });
  });
});
