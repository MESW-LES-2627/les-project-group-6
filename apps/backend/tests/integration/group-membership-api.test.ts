// @req F-GRP-01
import { after, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { createApp } from '../../src/app.js';
import { createDb } from '../../src/database/pool.js';
import { DrizzleChallengeGroupRepository } from '../../src/features/challenge-group/challenge-group-repository.js';
import { StandingsQuery } from '../../src/features/challenge-group/standings-query.js';
import { DrizzleGroupRosterRepository } from '../../src/features/group/group-roster-repository.js';
import { GroupId } from '../../src/features/group/group.js';
import { DrizzleUserRepository } from '../../src/features/user/user-repository.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { authHeader, FakeAuthProvider } from '../helpers/auth.js';
import { createTestPool, truncateTables } from '../helpers/test-db.js';

const ADMIN = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const MAYA = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12';
const TABLES = ['users', 'groups'];

describe('Leave group API', () => {
  const pool = createTestPool();
  const db = createDb(pool);
  const users = new DrizzleUserRepository(db);
  const rosters = new DrizzleGroupRosterRepository(db);
  const app = createApp({
    authProvider: new FakeAuthProvider(),
    userRepository: users,
    challengeGroupRepository: new DrizzleChallengeGroupRepository(db),
    standingsQuery: new StandingsQuery(db),
    groupRosterRepository: rosters,
  });
  const server = app.listen(0);
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  let groupId: string;

  const request = (userId: string, method: string, path: string, body?: object) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { ...authHeader(userId), 'Content-Type': 'application/json' },
      body: body && JSON.stringify(body),
    });

  beforeEach(async () => {
    await truncateTables(pool, TABLES);
    for (const [id, name] of [
      [ADMIN, 'ana'],
      [MAYA, 'maya'],
    ] as const) {
      await users.save(
        User.register({
          id: UserId.of(id),
          email: Email.of(`${name}@example.com`),
          username: Username.of(name),
          displayName: name,
        }),
      );
    }
    const res = await request(ADMIN, 'POST', '/groups/challenges', {
      name: 'Sprint',
      startDate: '2026-11-01',
      durationDays: 7,
      winMetric: 'minutes',
    });
    groupId = ((await res.json()) as { id: string }).id;
    await rosters.addMember(GroupId.of(groupId), {
      userId: UserId.of(MAYA),
      role: 'member',
      joinedAt: new Date(),
    });
  });

  after(async () => {
    server.close();
    await truncateTables(pool, TABLES);
    await pool.end();
  });

  test('a member leaves with 204 and loses access to the group', async () => {
    const res = await request(MAYA, 'DELETE', `/groups/${groupId}/members/me`);
    assert.equal(res.status, 204);
    assert.equal((await request(MAYA, 'GET', `/groups/challenges/${groupId}`)).status, 404);
    assert.equal((await request(MAYA, 'DELETE', `/groups/${groupId}/members/me`)).status, 404);
  });

  test('the admin gets 409 while members remain, and can leave last', async () => {
    const blocked = await request(ADMIN, 'DELETE', `/groups/${groupId}/members/me`);
    assert.equal(blocked.status, 409);
    assert.match(((await blocked.json()) as { error: string }).error, /admin cannot leave/);

    await request(MAYA, 'DELETE', `/groups/${groupId}/members/me`);
    assert.equal((await request(ADMIN, 'DELETE', `/groups/${groupId}/members/me`)).status, 204);
  });
});
