import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { StreakService } from '../../src/features/user/streak-service.js';
import { InMemoryUserRepository } from '../helpers/in-memory-repositories.js';

const makeUser = (overrides?: {
  currentStreak?: number;
  longestStreak?: number;
  hitStreak?: boolean;
}) =>
  User.reconstitute({
    id: UserId.generate(),
    email: Email.of('reader@example.com'),
    username: Username.of('reader'),
    displayName: 'Reader',
    photoUrl: null,
    bio: null,
    timezone: 'Europe/Lisbon',
    profileVisibility: 'private',
    streakType: 'daily',
    currentStreak: overrides?.currentStreak ?? 0,
    longestStreak: overrides?.longestStreak ?? 0,
    hitStreak: overrides?.hitStreak ?? false,
    createdAt: new Date('2026-01-01T00:00:00Z'),
  });

describe('User streak aggregate', () => {
  test('step 1: does not update streak if hitStreak is already true', () => {
    const user = makeUser({ currentStreak: 5, longestStreak: 10, hitStreak: true });
    const updated = user.recordReadingDay(true);

    assert.strictEqual(updated, false);
    assert.strictEqual(user.currentStreak, 5);
    assert.strictEqual(user.longestStreak, 10);
    assert.strictEqual(user.hitStreak, true);
  });

  test('step 2: sets streak to 1 if did not read the day before', () => {
    const user = makeUser({ currentStreak: 0, longestStreak: 0, hitStreak: false });
    const updated = user.recordReadingDay(false);

    assert.strictEqual(updated, true);
    assert.strictEqual(user.currentStreak, 1);
    assert.strictEqual(user.longestStreak, 1);
    assert.strictEqual(user.hitStreak, true);
  });

  test('step 2: sets streak to 1 and keeps higher longestStreak if did not read the day before', () => {
    const user = makeUser({ currentStreak: 0, longestStreak: 14, hitStreak: false });
    const updated = user.recordReadingDay(false);

    assert.strictEqual(updated, true);
    assert.strictEqual(user.currentStreak, 1);
    assert.strictEqual(user.longestStreak, 14);
    assert.strictEqual(user.hitStreak, true);
  });

  test('step 2: increments currentStreak if read the day before', () => {
    const user = makeUser({ currentStreak: 3, longestStreak: 5, hitStreak: false });
    const updated = user.recordReadingDay(true);

    assert.strictEqual(updated, true);
    assert.strictEqual(user.currentStreak, 4);
    assert.strictEqual(user.longestStreak, 5);
    assert.strictEqual(user.hitStreak, true);
  });

  test('PS: updates longestStreak when currentStreak exceeds it', () => {
    const user = makeUser({ currentStreak: 5, longestStreak: 5, hitStreak: false });
    const updated = user.recordReadingDay(true);

    assert.strictEqual(updated, true);
    assert.strictEqual(user.currentStreak, 6);
    assert.strictEqual(user.longestStreak, 6);
    assert.strictEqual(user.hitStreak, true);
  });
});

describe('StreakService', () => {
  test('step 1: returns updated false if user already hit streak today', async () => {
    const userRepo = new InMemoryUserRepository();
    const user = makeUser({ currentStreak: 4, longestStreak: 8, hitStreak: true });
    await userRepo.add(user);

    const streakService = new StreakService(userRepo);
    const result = await streakService.recordReadToday(user.id);

    assert.strictEqual(result.updated, false);
    assert.strictEqual(result.user.currentStreak, 4);
    assert.strictEqual(result.user.hitStreak, true);
  });

  test('step 2: sets currentStreak to 1 if user did not read day before', async () => {
    const userRepo = new InMemoryUserRepository();
    const user = makeUser({ currentStreak: 0, longestStreak: 5, hitStreak: false });
    await userRepo.add(user);

    const streakService = new StreakService(userRepo);
    const result = await streakService.recordReadToday(user.id, { readDayBefore: false });

    assert.strictEqual(result.updated, true);
    assert.strictEqual(result.user.currentStreak, 1);
    assert.strictEqual(result.user.longestStreak, 5);
    assert.strictEqual(result.user.hitStreak, true);

    // Verify database was updated
    const saved = await userRepo.findById(user.id);
    assert.strictEqual(saved?.currentStreak, 1);
    assert.strictEqual(saved?.hitStreak, true);
  });

  test('step 2: increments currentStreak if user read day before and updates longestStreak', async () => {
    const userRepo = new InMemoryUserRepository();
    const user = makeUser({ currentStreak: 7, longestStreak: 7, hitStreak: false });
    await userRepo.add(user);

    const streakService = new StreakService(userRepo);
    const result = await streakService.recordReadToday(user.id, { readDayBefore: true });

    assert.strictEqual(result.updated, true);
    assert.strictEqual(result.user.currentStreak, 8);
    assert.strictEqual(result.user.longestStreak, 8);
    assert.strictEqual(result.user.hitStreak, true);

    // Verify database was updated
    const saved = await userRepo.findById(user.id);
    assert.strictEqual(saved?.currentStreak, 8);
    assert.strictEqual(saved?.longestStreak, 8);
    assert.strictEqual(saved?.hitStreak, true);
  });

  test('calculates streak status with session history', async () => {
    const userRepo = new InMemoryUserRepository();
    const user = makeUser({ currentStreak: 3, longestStreak: 5, hitStreak: false });
    await userRepo.add(user);

    const now = new Date('2026-11-16T12:00:00Z');
    const fakeSessions = {
      async findCompletedSessions() {
        return [{ endedAt: new Date('2026-11-15T10:00:00Z'), countedMinutes: 20 }];
      },
    };

    const streakService = new StreakService(userRepo, fakeSessions, () => now);
    const status = await streakService.calculateStreakStatus(user.id, now);

    assert.strictEqual(status.currentStreak, 3);
    assert.strictEqual(status.longestStreak, 5);
    assert.strictEqual(status.hitStreak, false); // has not read today yet
  });

  test('resets active streak to 0 if neither today nor yesterday was read', async () => {
    const userRepo = new InMemoryUserRepository();
    const user = makeUser({ currentStreak: 5, longestStreak: 10, hitStreak: false });
    await userRepo.add(user);

    const now = new Date('2026-11-16T12:00:00Z');
    const fakeSessions = {
      async findCompletedSessions() {
        return [{ endedAt: new Date('2026-11-10T10:00:00Z'), countedMinutes: 30 }];
      },
    };

    const streakService = new StreakService(userRepo, fakeSessions, () => now);
    const status = await streakService.calculateStreakStatus(user.id, now);

    assert.strictEqual(status.currentStreak, 0); // streak lapsed
    assert.strictEqual(status.longestStreak, 10); // longest preserved
  });

  test('generates 28-day calendar grid with correct read flags', async () => {
    const userRepo = new InMemoryUserRepository();
    const user = makeUser({ currentStreak: 2, longestStreak: 5, hitStreak: true });
    await userRepo.add(user);

    const now = new Date('2026-11-16T12:00:00Z');
    const fakeSessions = {
      async findCompletedSessions() {
        return [
          { endedAt: new Date('2026-11-16T09:00:00Z'), countedMinutes: 15 },
          { endedAt: new Date('2026-11-15T18:00:00Z'), countedMinutes: 25 },
          { endedAt: new Date('2026-11-01T14:00:00Z'), countedMinutes: 30 },
        ];
      },
    };

    const streakService = new StreakService(userRepo, fakeSessions, () => now);
    const calendar = await streakService.getStreakCalendar(user.id, 28, now);

    assert.strictEqual(calendar.length, 28);
    const todayEntry = calendar[calendar.length - 1];
    assert.ok(todayEntry);
    assert.strictEqual(todayEntry.date, '2026-11-16');
    assert.strictEqual(todayEntry.read, true);

    const yesterdayEntry = calendar[calendar.length - 2];
    assert.ok(yesterdayEntry);
    assert.strictEqual(yesterdayEntry.date, '2026-11-15');
    assert.strictEqual(yesterdayEntry.read, true);

    const dayBeforeEntry = calendar[calendar.length - 3];
    assert.ok(dayBeforeEntry);
    assert.strictEqual(dayBeforeEntry.date, '2026-11-14');
    assert.strictEqual(dayBeforeEntry.read, false);
  });
});
