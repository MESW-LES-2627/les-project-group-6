import { after, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { createDb } from '../../src/database/pool.js';
import { DrizzleFriendRepository } from '../../src/features/friend/friend-repository.js';
import { DrizzleUserRepository } from '../../src/features/user/user-repository.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { withApp } from '../helpers/http.js';
import { createTestPool, truncateTables } from '../helpers/test-db.js';

describe('Friend API Endpoints', () => {
  const pool = createTestPool();
  const db = createDb(pool);
  const friendRepository = new DrizzleFriendRepository(db);
  const userRepository = new DrizzleUserRepository(db);
  const app = createApp({ friendRepository, userRepository });

  const aliceId = UserId.of('11111111-1111-4111-8111-111111111111');
  const bobId = UserId.of('22222222-2222-4222-8222-222222222222');
  const charlieId = UserId.of('33333333-3333-4333-8333-333333333333');

  const alice = User.register({
    id: aliceId,
    email: Email.of('alice@test.com'),
    username: Username.of('alice_r'),
    displayName: 'Alice Reader',
  });

  const bob = User.register({
    id: bobId,
    email: Email.of('bob@test.com'),
    username: Username.of('bob_b'),
    displayName: 'Bob Books',
  });

  const charlie = User.register({
    id: charlieId,
    email: Email.of('charlie@test.com'),
    username: Username.of('charlie_c'),
    displayName: 'Charlie C',
  });

  beforeEach(async () => {
    await truncateTables(pool, ['friendships', 'users']);
    await userRepository.save(alice);
    await userRepository.save(bob);
    await userRepository.save(charlie);
  });

  after(async () => {
    await truncateTables(pool, ['friendships', 'users']);
    await pool.end();
  });

  test('POST /friend-requests creates a new pending request and returns 201', async () => {
    await withApp(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/friend-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: aliceId.value, targetUserId: bobId.value }),
      });

      assert.equal(res.status, 201);
      const data = (await res.json()) as {
        id: string;
        status: string;
        requesterId: string;
        addresseeId: string;
      };
      assert.ok(data.id);
      assert.equal(data.status, 'pending');
      assert.equal(data.requesterId, aliceId.value);
      assert.equal(data.addresseeId, bobId.value);
    });
  });

  test('POST /friend-requests returns 400 when friending self', async () => {
    await withApp(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/friend-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: aliceId.value, targetUserId: aliceId.value }),
      });

      assert.equal(res.status, 400);
    });
  });

  test('POST /friend-requests returns 400 when user does not exist', async () => {
    await withApp(app, async (baseUrl) => {
      const res = await fetch(`${baseUrl}/friend-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: aliceId.value,
          targetUserId: '99999999-9999-4999-8999-999999999999',
        }),
      });

      assert.equal(res.status, 400);
    });
  });

  test('POST /friend-requests returns 200 (no_changes) when already requested or friends', async () => {
    await withApp(app, async (baseUrl) => {
      const first = await fetch(`${baseUrl}/friend-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: aliceId.value, targetUserId: bobId.value }),
      });
      assert.equal(first.status, 201);

      // Repeat request
      const second = await fetch(`${baseUrl}/friend-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: aliceId.value, targetUserId: bobId.value }),
      });
      assert.equal(second.status, 200);
    });
  });

  test('GET /user/:userId/friend-requests returns pending incoming requests', async () => {
    await withApp(app, async (baseUrl) => {
      await fetch(`${baseUrl}/friend-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: aliceId.value, targetUserId: bobId.value }),
      });

      const res = await fetch(`${baseUrl}/user/${bobId.value}/friend-requests`);
      assert.equal(res.status, 200);
      const pending = (await res.json()) as Array<{
        id: string;
        requesterId: string;
        status: string;
      }>;
      assert.equal(pending.length, 1);
      assert.equal(pending[0]?.requesterId, aliceId.value);
      assert.equal(pending[0]?.status, 'pending');

      // Alice has no incoming requests
      const aliceRes = await fetch(`${baseUrl}/user/${aliceId.value}/friend-requests`);
      const alicePending = (await aliceRes.json()) as unknown[];
      assert.equal(alicePending.length, 0);
    });
  });

  test('POST /friend-requests/:id/accept accepts a pending request', async () => {
    await withApp(app, async (baseUrl) => {
      const createRes = await fetch(`${baseUrl}/friend-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: aliceId.value, targetUserId: bobId.value }),
      });
      const created = (await createRes.json()) as { id: string };

      // Bob accepts
      const acceptRes = await fetch(`${baseUrl}/friend-requests/${created.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: bobId.value }),
      });
      assert.equal(acceptRes.status, 200);
      const data = (await acceptRes.json()) as { status: string };
      assert.equal(data.status, 'accepted');

      // Now friendsOf should list them
      const friendsRes = await fetch(`${baseUrl}/user/${aliceId.value}/friends`);
      const friends = (await friendsRes.json()) as Array<{ userId: string }>;
      assert.equal(friends.length, 1);
      assert.equal(friends[0]?.userId, bobId.value);
    });
  });

  test('POST /friend-requests/:id/accept returns 404 if someone other than the addressee attempts to accept', async () => {
    await withApp(app, async (baseUrl) => {
      const createRes = await fetch(`${baseUrl}/friend-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: aliceId.value, targetUserId: bobId.value }),
      });
      const created = (await createRes.json()) as { id: string };

      // Charlie tries to accept Alice and Bob's request
      const charlieRes = await fetch(`${baseUrl}/friend-requests/${created.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: charlieId.value }),
      });
      assert.equal(charlieRes.status, 404);
    });
  });

  test('POST /friend-requests/:id/decline declines a pending request', async () => {
    await withApp(app, async (baseUrl) => {
      const createRes = await fetch(`${baseUrl}/friend-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: aliceId.value, targetUserId: bobId.value }),
      });
      const created = (await createRes.json()) as { id: string };

      const declineRes = await fetch(`${baseUrl}/friend-requests/${created.id}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: bobId.value }),
      });
      assert.equal(declineRes.status, 204);

      // Verify no pending requests remain
      const pendingRes = await fetch(`${baseUrl}/user/${bobId.value}/friend-requests`);
      const pending = (await pendingRes.json()) as unknown[];
      assert.equal(pending.length, 0);
    });
  });

  test('DELETE /friends/:userId removes a mutual friendship', async () => {
    await withApp(app, async (baseUrl) => {
      const createRes = await fetch(`${baseUrl}/friend-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requesterId: aliceId.value, targetUserId: bobId.value }),
      });
      const created = (await createRes.json()) as { id: string };

      await fetch(`${baseUrl}/friend-requests/${created.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: bobId.value }),
      });

      // Alice removes Bob
      const deleteRes = await fetch(`${baseUrl}/friends/${bobId.value}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: aliceId.value }),
      });
      assert.equal(deleteRes.status, 204);

      // Verify both friends lists are empty
      const aliceFriendsRes = await fetch(`${baseUrl}/user/${aliceId.value}/friends`);
      assert.deepEqual(await aliceFriendsRes.json(), []);

      const bobFriendsRes = await fetch(`${baseUrl}/user/${bobId.value}/friends`);
      assert.deepEqual(await bobFriendsRes.json(), []);

      // Deleting again returns 404
      const secondDelete = await fetch(`${baseUrl}/friends/${bobId.value}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: aliceId.value }),
      });
      assert.equal(secondDelete.status, 404);
    });
  });
});
