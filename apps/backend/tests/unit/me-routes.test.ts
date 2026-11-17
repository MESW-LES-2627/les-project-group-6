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
    // Simulate user having read yesterday and today
    user.recordReadingDay(false); // day 1: current=1, longest=1, hitStreak=true
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
      assert.equal(body.currentStreak, 1);
      assert.equal(body.longestStreak, 1);
      assert.equal(body.hitStreak, true);
    });
  });

  test('GET /me/streak returns current, longest, hitStreak and 28-day calendar', async () => {
    await withApp(app(), async (url) => {
      const res = await fetch(`${url}/me/streak`, { headers: authHeader(USER_ID) });
      assert.equal(res.status, 200);

      const body = (await res.json()) as {
        current: number;
        longest: number;
        hitStreak: boolean;
        streakType: string;
        freezesLeft: number;
        days: Array<{ date: string; read: boolean }>;
      };

      assert.equal(body.current, 1);
      assert.equal(body.longest, 1);
      assert.equal(body.hitStreak, true);
      assert.equal(body.streakType, 'daily');
      assert.equal(body.freezesLeft, 0);
      assert.equal(body.days.length, 28);
      // The last entry is today, and user read today
      const lastDay = body.days[body.days.length - 1];
      assert.ok(lastDay);
      assert.equal(lastDay.read, true);
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
      assert.equal(body.currentStreak, 1);
      assert.equal(body.longestStreak, 1);
      assert.equal(body.hitStreak, true);
    });
  });

  test('GET /me/streak without token answers 401 UNAUTHENTICATED', async () => {
    await withApp(app(), async (url) => {
      const res = await fetch(`${url}/me/streak`);
      assert.equal(res.status, 401);
    });
  });
});
