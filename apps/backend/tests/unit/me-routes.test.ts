// @req F-READ-04
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { authHeader, FakeAuthProvider } from '../helpers/auth.js';
import { withApp } from '../helpers/http.js';
import {
  InMemoryReadingSessionRepository,
  InMemoryUserRepository,
} from '../helpers/in-memory-repositories.js';
import type { MeDto } from '../../src/features/user/me-routes.js';
import { isoDayInTimezone, previousIsoDay } from '../../src/utils/calendar.js';

const USER_ID = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a55';

describe('/me routes with streak support', () => {
  let users: InMemoryUserRepository;
  let sessions: InMemoryReadingSessionRepository;
  let user: User;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    sessions = new InMemoryReadingSessionRepository();
    user = User.register({
      id: UserId.of(USER_ID),
      email: Email.of('reader@example.com'),
      username: Username.of('reader'),
      displayName: 'Reader',
    });
    // The reader read yesterday and today, in their timezone.
    const today = isoDayInTimezone(new Date(), user.timezone);
    user.recordReadingDay(previousIsoDay(today));
    user.recordReadingDay(today);
    await users.save(user);
  });

  const app = () =>
    createApp({
      authProvider: new FakeAuthProvider(),
      userRepository: users,
      readingSessionRepository: sessions,
    });

  test('GET /me returns streak fields evaluated live', async () => {
    await withApp(app(), async (url) => {
      const res = await fetch(`${url}/me`, { headers: authHeader(USER_ID) });
      assert.equal(res.status, 200);

      const body = (await res.json()) as MeDto;
      assert.equal(body.id, USER_ID);
      assert.equal(body.username, 'reader');
      assert.equal(body.streakType, 'daily');
      assert.equal(body.currentStreak, 2);
      assert.equal(body.longestStreak, 2);
      assert.equal(body.readToday, true);
    });
  });

  test('GET /me/streak returns current, longest, readToday and 28-day calendar', async () => {
    await withApp(app(), async (url) => {
      const res = await fetch(`${url}/me/streak`, { headers: authHeader(USER_ID) });
      assert.equal(res.status, 200);

      const body = (await res.json()) as {
        current: number;
        longest: number;
        readToday: boolean;
        lastReadDate: string | null;
        streakType: string;
        freezesLeft: number;
        days: Array<{ date: string; read: boolean }>;
      };

      assert.equal(body.current, 2);
      assert.equal(body.longest, 2);
      assert.equal(body.readToday, true);
      assert.equal(body.lastReadDate, isoDayInTimezone(new Date(), 'Europe/Lisbon'));
      assert.equal(body.streakType, 'daily');
      assert.equal(body.freezesLeft, 0);
      assert.equal(body.days.length, 28);
      // Today and yesterday belong to the current run, so both show as read.
      assert.deepEqual(
        body.days.slice(-3).map((d) => d.read),
        [false, true, true],
      );
    });
  });

  test('PATCH /me returns updated user with streak fields', async () => {
    await withApp(app(), async (url) => {
      const res = await fetch(`${url}/me`, {
        method: 'PATCH',
        headers: {
          ...authHeader(USER_ID),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ displayName: 'New Display Name' }),
      });
      assert.equal(res.status, 200);

      const body = (await res.json()) as MeDto;
      assert.equal(body.displayName, 'New Display Name');
      assert.equal(body.currentStreak, 2);
      assert.equal(body.longestStreak, 2);
      assert.equal(body.readToday, true);
    });
  });

  test('GET /me/streak without token answers 401 UNAUTHENTICATED', async () => {
    await withApp(app(), async (url) => {
      const res = await fetch(`${url}/me/streak`);
      assert.equal(res.status, 401);
    });
  });
});
