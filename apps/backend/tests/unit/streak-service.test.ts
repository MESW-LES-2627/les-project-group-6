// @req F-READ-04
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Book } from '../../src/features/book/book.js';
import { ReadingSessionService } from '../../src/features/reading-session/reading-session-service.js';
import { ReadingStatusService } from '../../src/features/reading-status/reading-status-service.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { StreakService } from '../../src/features/user/streak-service.js';
import {
  progressCountsForStreak,
  sessionCountsForStreak,
} from '../../src/features/user/streak-rules.js';
import { InvalidValueError, NotFoundError } from '../../src/utils/errors.js';
import {
  InMemoryBookRepository,
  InMemoryReadingSessionRepository,
  InMemoryReadingStatusRepository,
  InMemoryUserRepository,
} from '../helpers/in-memory-repositories.js';

const USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const makeUser = (overrides?: {
  currentStreak?: number;
  longestStreak?: number;
  lastReadDate?: string | null;
  timezone?: string;
}) =>
  User.reconstitute({
    id: UserId.of(USER_ID),
    email: Email.of('reader@example.com'),
    username: Username.of('reader'),
    displayName: 'Reader',
    photoUrl: null,
    bio: null,
    timezone: overrides?.timezone ?? 'Europe/Lisbon',
    profileVisibility: 'private',
    streakType: 'daily',
    currentStreak: overrides?.currentStreak ?? 0,
    longestStreak: overrides?.longestStreak ?? 0,
    lastReadDate: overrides?.lastReadDate ?? null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  });

/** Noon in Lisbon (UTC+0 in November), so the day is the same in UTC and in the reader's zone. */
const noon = (day: string) => new Date(`${day}T12:00:00Z`);

describe('User streak aggregate', () => {
  test('first reading day starts the streak at 1', () => {
    const user = makeUser();
    assert.strictEqual(user.recordReadingDay('2026-11-16'), true);
    assert.strictEqual(user.currentStreak, 1);
    assert.strictEqual(user.longestStreak, 1);
    assert.strictEqual(user.lastReadDate, '2026-11-16');
  });

  test('reading again on the same day changes nothing', () => {
    const user = makeUser({ currentStreak: 5, longestStreak: 10, lastReadDate: '2026-11-16' });
    assert.strictEqual(user.recordReadingDay('2026-11-16'), false);
    assert.strictEqual(user.currentStreak, 5);
    assert.strictEqual(user.longestStreak, 10);
  });

  test('reading the day after the last reading day grows the streak', () => {
    const user = makeUser({ currentStreak: 3, longestStreak: 5, lastReadDate: '2026-11-15' });
    assert.strictEqual(user.recordReadingDay('2026-11-16'), true);
    assert.strictEqual(user.currentStreak, 4);
    assert.strictEqual(user.longestStreak, 5);
  });

  test('the longest streak follows the current one when it is beaten', () => {
    const user = makeUser({ currentStreak: 5, longestStreak: 5, lastReadDate: '2026-11-15' });
    user.recordReadingDay('2026-11-16');
    assert.strictEqual(user.currentStreak, 6);
    assert.strictEqual(user.longestStreak, 6);
  });

  test('a missed day restarts the streak at 1 and keeps the longest', () => {
    const user = makeUser({ currentStreak: 9, longestStreak: 14, lastReadDate: '2026-11-13' });
    user.recordReadingDay('2026-11-16');
    assert.strictEqual(user.currentStreak, 1);
    assert.strictEqual(user.longestStreak, 14);
  });

  test('the streak grows across month boundaries', () => {
    const user = makeUser({ currentStreak: 2, longestStreak: 2, lastReadDate: '2026-10-31' });
    user.recordReadingDay('2026-11-01');
    assert.strictEqual(user.currentStreak, 3);
  });

  test('rejects a day that is not YYYY-MM-DD', () => {
    assert.throws(() => makeUser().recordReadingDay('16/11/2026'), InvalidValueError);
  });

  test('streakOn keeps the streak alive until the end of the day after the last read', () => {
    const user = makeUser({ currentStreak: 3, longestStreak: 7, lastReadDate: '2026-11-15' });
    assert.deepStrictEqual(user.streakOn('2026-11-15'), {
      currentStreak: 3,
      longestStreak: 7,
      readToday: true,
    });
    assert.deepStrictEqual(user.streakOn('2026-11-16'), {
      currentStreak: 3,
      longestStreak: 7,
      readToday: false,
    });
    assert.deepStrictEqual(user.streakOn('2026-11-17'), {
      currentStreak: 0,
      longestStreak: 7,
      readToday: false,
    });
  });

  test('a new user has no streak', () => {
    assert.deepStrictEqual(makeUser().streakOn('2026-11-16'), {
      currentStreak: 0,
      longestStreak: 0,
      readToday: false,
    });
  });
});

describe('Streak rules', () => {
  test('a session counts from 5 counted minutes', () => {
    assert.strictEqual(sessionCountsForStreak(4), false);
    assert.strictEqual(sessionCountsForStreak(5), true);
    assert.strictEqual(sessionCountsForStreak(45), true);
  });

  test('progress on a book being read counts from 5 pages forward', () => {
    const reading = (page: number) => ({ status: 'in-progress' as const, page });
    assert.strictEqual(progressCountsForStreak(reading(10), reading(14)), false);
    assert.strictEqual(progressCountsForStreak(reading(10), reading(15)), true);
    assert.strictEqual(progressCountsForStreak(reading(50), reading(30)), false);
  });

  test('finishing a book that was being read counts', () => {
    assert.strictEqual(
      progressCountsForStreak(
        { status: 'in-progress', page: 300 },
        { status: 'finished', page: 302 },
      ),
      true,
    );
  });

  test('changes that do not come from reading do not count', () => {
    // Marking a shelved book as finished, or starting a book at a later page.
    assert.strictEqual(
      progressCountsForStreak({ status: 'not-started', page: 0 }, { status: 'finished', page: 0 }),
      false,
    );
    assert.strictEqual(
      progressCountsForStreak(
        { status: 'not-started', page: 0 },
        { status: 'in-progress', page: 120 },
      ),
      false,
    );
    assert.strictEqual(
      progressCountsForStreak(
        { status: 'in-progress', page: 10 },
        { status: 'did-not-finish', page: 10 },
      ),
      false,
    );
  });
});

describe('StreakService', () => {
  let users: InMemoryUserRepository;
  let now: Date;
  let streaks: StreakService;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    now = noon('2026-11-16');
    streaks = new StreakService(users, undefined, () => now);
  });

  test('recordReadToday saves the new streak', async () => {
    await users.save(makeUser({ currentStreak: 7, longestStreak: 7, lastReadDate: '2026-11-15' }));

    const result = await streaks.recordReadToday(USER_ID);

    assert.strictEqual(result.updated, true);
    const saved = await users.findById(UserId.of(USER_ID));
    assert.strictEqual(saved?.currentStreak, 8);
    assert.strictEqual(saved?.longestStreak, 8);
    assert.strictEqual(saved?.lastReadDate, '2026-11-16');
  });

  test('recordReadToday uses the day in the reader timezone', async () => {
    await users.save(
      makeUser({
        currentStreak: 1,
        longestStreak: 1,
        lastReadDate: '2026-11-16',
        timezone: 'Asia/Tokyo',
      }),
    );

    // 16:00 UTC on the 16th is already the 17th in Tokyo.
    const result = await streaks.recordReadToday(USER_ID, new Date('2026-11-16T16:00:00Z'));

    assert.strictEqual(result.user.lastReadDate, '2026-11-17');
    assert.strictEqual(result.user.currentStreak, 2);
  });

  test('recordReadToday for an unknown user throws NotFoundError', async () => {
    await assert.rejects(streaks.recordReadToday(USER_ID), NotFoundError);
  });

  // Regression for PR #160: the streak got stuck at 1 because the "already hit today"
  // flag was never reset, and the "skipped days" case never recovered.
  test('reading on consecutive days grows the streak and a gap restarts it', async () => {
    await users.save(makeUser());
    const readOn = async (day: string) => {
      now = noon(day);
      await streaks.recordReadToday(USER_ID);
      // A second read on the same day must not change anything.
      await streaks.recordReadToday(USER_ID);
      return streaks.calculateStreakStatus(USER_ID);
    };

    assert.strictEqual((await readOn('2026-11-16')).currentStreak, 1); // Mon
    assert.strictEqual((await readOn('2026-11-17')).currentStreak, 2); // Tue
    assert.strictEqual((await readOn('2026-11-18')).currentStreak, 3); // Wed

    // Thu: not read yet, the streak is still alive.
    now = noon('2026-11-19');
    assert.strictEqual((await streaks.calculateStreakStatus(USER_ID)).currentStreak, 3);
    // Fri: Thursday was missed, the streak is broken.
    now = noon('2026-11-20');
    const friday = await streaks.calculateStreakStatus(USER_ID);
    assert.deepStrictEqual([friday.currentStreak, friday.longestStreak], [0, 3]);

    const saturday = await readOn('2026-11-21'); // Sat
    assert.strictEqual(saturday.currentStreak, 1);
    assert.strictEqual(saturday.longestStreak, 3);
    assert.strictEqual(saturday.readToday, true);
  });

  test('calculateStreakStatus reports the live streak', async () => {
    await users.save(makeUser({ currentStreak: 3, longestStreak: 5, lastReadDate: '2026-11-15' }));

    assert.deepStrictEqual(await streaks.calculateStreakStatus(USER_ID), {
      currentStreak: 3,
      longestStreak: 5,
      readToday: false,
      lastReadDate: '2026-11-15',
      streakType: 'daily',
    });
  });

  test('the calendar marks 5+ minute sessions and the current run', async () => {
    // Current run: 14, 15, 16 (the 14th came from page progress, so it has no session).
    await users.save(makeUser({ currentStreak: 3, longestStreak: 5, lastReadDate: '2026-11-16' }));
    const sessions = {
      async findCompletedSessions() {
        return [
          { endedAt: noon('2026-11-16'), countedMinutes: 15 },
          { endedAt: noon('2026-11-15'), countedMinutes: 25 },
          { endedAt: noon('2026-11-10'), countedMinutes: 3 }, // too short
          { endedAt: noon('2026-11-01'), countedMinutes: 30 },
        ];
      },
    };
    const calendar = await new StreakService(users, sessions, () => now).getStreakCalendar(USER_ID);

    assert.strictEqual(calendar.length, 28);
    assert.deepStrictEqual(calendar.at(-1), { date: '2026-11-16', read: true });
    const read = calendar.filter((d) => d.read).map((d) => d.date);
    assert.deepStrictEqual(read, ['2026-11-01', '2026-11-14', '2026-11-15', '2026-11-16']);
  });

  test('the calendar does not mark today before the reader reads', async () => {
    await users.save(makeUser({ currentStreak: 2, longestStreak: 2, lastReadDate: '2026-11-15' }));
    const calendar = await streaks.getStreakCalendar(USER_ID);
    assert.deepStrictEqual(calendar.at(-1), { date: '2026-11-16', read: false });
    assert.deepStrictEqual(calendar.at(-2), { date: '2026-11-15', read: true });
  });
});

// The triggers use the real services, so the order "save the session, then update the
// streak" is covered (PR #160: the saved session made the streak skip the update).
describe('Streak triggers', () => {
  let users: InMemoryUserRepository;
  let books: InMemoryBookRepository;
  let sessions: InMemoryReadingSessionRepository;
  let statuses: ReadingStatusService;
  let readingSessions: ReadingSessionService;
  let book: Book;
  let now: Date;

  const advanceMinutes = (minutes: number) => {
    now = new Date(now.getTime() + minutes * 60_000);
  };
  const streak = async () => (await users.findById(UserId.of(USER_ID)))!;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    books = new InMemoryBookRepository();
    sessions = new InMemoryReadingSessionRepository();
    now = noon('2026-11-16');
    const streaks = new StreakService(users, sessions, () => now);
    statuses = new ReadingStatusService(new InMemoryReadingStatusRepository(), books, streaks);
    readingSessions = new ReadingSessionService(sessions, books, () => now, statuses, streaks);
    book = Book.create({ title: 'Dune', pageCount: 688 });
    await books.save(book);
    await users.save(makeUser({ currentStreak: 2, longestStreak: 2, lastReadDate: '2026-11-15' }));
  });

  test('finishing a session of 5+ minutes counts today, even though it was saved first', async () => {
    const session = await readingSessions.start({ userId: USER_ID, bookId: book.id.value });
    advanceMinutes(5);
    await readingSessions.finish({ id: session.id.value, userId: USER_ID });

    assert.strictEqual((await streak()).currentStreak, 3);
    assert.strictEqual((await streak()).lastReadDate, '2026-11-16');
  });

  test('finishing a session shorter than 5 minutes does not count', async () => {
    const session = await readingSessions.start({ userId: USER_ID, bookId: book.id.value });
    advanceMinutes(4);
    await readingSessions.finish({ id: session.id.value, userId: USER_ID });

    assert.strictEqual((await streak()).lastReadDate, '2026-11-15');
  });

  test('logging 5+ pages on a book being read counts today', async () => {
    const entry = await statuses.set({
      userId: USER_ID,
      bookId: book.id.value,
      status: 'in-progress',
      currentPage: 10,
    });
    assert.strictEqual((await streak()).lastReadDate, '2026-11-15');

    await statuses.update({ id: entry.id.value, userId: USER_ID, currentPage: 14 });
    assert.strictEqual((await streak()).lastReadDate, '2026-11-15');

    await statuses.update({ id: entry.id.value, userId: USER_ID, currentPage: 19 });
    assert.strictEqual((await streak()).currentStreak, 3);
    assert.strictEqual((await streak()).lastReadDate, '2026-11-16');
  });

  test('finishing a book that was being read counts today', async () => {
    await statuses.set({
      userId: USER_ID,
      bookId: book.id.value,
      status: 'in-progress',
      currentPage: 680,
    });
    await statuses.set({ userId: USER_ID, bookId: book.id.value, status: 'finished' });

    assert.strictEqual((await streak()).currentStreak, 3);
  });
});
