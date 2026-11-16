// @req F-SOC-01
import { after, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { createDb } from '../../src/database/pool.js';
import { DrizzleFriendRepository } from '../../src/features/friend/friend-repository.js';
import { DrizzleUserRepository } from '../../src/features/user/user-repository.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { authHeader, FakeAuthProvider } from '../helpers/auth.js';
import { withApp } from '../helpers/http.js';
import { createTestPool, truncateTables } from '../helpers/test-db.js';

describe('Friend API Endpoints', () => {
  const pool = createTestPool();
  const db = createDb(pool);
  const friendRepository = new DrizzleFriendRepository(db);
  const userRepository = new DrizzleUserRepository(db);
  const app = createApp({
    authProvider: new FakeAuthProvider(),
    friendRepository,
    userRepository,
  });

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

  // Sends a request as `as` (the signed-in reader comes from the token).
  const call = (baseUrl: string, as: UserId, method: string, path: string, body?: object) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...authHeader(as.value) },
      body: body ? JSON.stringify(body) : undefined,
    });

  const sendRequest = (baseUrl: string, from: UserId, to: UserId | string) =>
    call(baseUrl, from, 'POST', '/friend-requests', {
      targetUserId: typeof to === 'string' ? to : to.value,
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

  test('friend routes answer 401 without a token', async () => {
    await withApp(app, async (baseUrl) => {
      const post = await fetch(`${baseUrl}/friend-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: bobId.value }),
      });
      assert.equal(post.status, 401);

      const list = await fetch(`${baseUrl}/me/friend-requests`);
      assert.equal(list.status, 401);
    });
  });

  test('POST /friend-requests creates a new pending request from the signed-in reader (201)', async () => {
    await withApp(app, async (baseUrl) => {
      // A requesterId in the body is ignored: the requester is the token's reader.
      const res = await call(baseUrl, aliceId, 'POST', '/friend-requests', {
        requesterId: charlieId.value,
        targetUserId: bobId.value,
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
      const res = await sendRequest(baseUrl, aliceId, aliceId);
      assert.equal(res.status, 400);
    });
  });

  test('POST /friend-requests returns 400 when user does not exist', async () => {
    await withApp(app, async (baseUrl) => {
      const res = await sendRequest(baseUrl, aliceId, '99999999-9999-4999-8999-999999999999');
      assert.equal(res.status, 400);
    });
  });

  test('POST /friend-requests returns 200 (no_changes) when already requested or friends', async () => {
    await withApp(app, async (baseUrl) => {
      const first = await sendRequest(baseUrl, aliceId, bobId);
      assert.equal(first.status, 201);

      // Repeat request
      const second = await sendRequest(baseUrl, aliceId, bobId);
      assert.equal(second.status, 200);
    });
  });

  test('GET /me/friend-requests returns the pending incoming requests of the signed-in reader', async () => {
    await withApp(app, async (baseUrl) => {
      await sendRequest(baseUrl, aliceId, bobId);

      const res = await call(baseUrl, bobId, 'GET', '/me/friend-requests');
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
      const aliceRes = await call(baseUrl, aliceId, 'GET', '/me/friend-requests');
      const alicePending = (await aliceRes.json()) as unknown[];
      assert.equal(alicePending.length, 0);
    });
  });

  test('POST /friend-requests/:id/accept accepts a pending request', async () => {
    await withApp(app, async (baseUrl) => {
      const createRes = await sendRequest(baseUrl, aliceId, bobId);
      const created = (await createRes.json()) as { id: string };

      // Bob accepts
      const acceptRes = await call(baseUrl, bobId, 'POST', `/friend-requests/${created.id}/accept`);
      assert.equal(acceptRes.status, 200);
      const data = (await acceptRes.json()) as { status: string };
      assert.equal(data.status, 'accepted');

      // Now Alice's friends list shows Bob
      const friendsRes = await call(baseUrl, aliceId, 'GET', '/me/friends');
      const friends = (await friendsRes.json()) as Array<{ userId: string }>;
      assert.equal(friends.length, 1);
      assert.equal(friends[0]?.userId, bobId.value);
    });
  });

  test('POST /friend-requests/:id/accept returns 404 if someone other than the addressee attempts to accept', async () => {
    await withApp(app, async (baseUrl) => {
      const createRes = await sendRequest(baseUrl, aliceId, bobId);
      const created = (await createRes.json()) as { id: string };

      // Charlie tries to accept Alice and Bob's request
      const charlieRes = await call(
        baseUrl,
        charlieId,
        'POST',
        `/friend-requests/${created.id}/accept`,
      );
      assert.equal(charlieRes.status, 404);

      // The requester cannot accept their own request either
      const aliceRes = await call(
        baseUrl,
        aliceId,
        'POST',
        `/friend-requests/${created.id}/accept`,
      );
      assert.equal(aliceRes.status, 404);
    });
  });

  test('POST /friend-requests/:id/decline declines a pending request', async () => {
    await withApp(app, async (baseUrl) => {
      const createRes = await sendRequest(baseUrl, aliceId, bobId);
      const created = (await createRes.json()) as { id: string };

      const declineRes = await call(
        baseUrl,
        bobId,
        'POST',
        `/friend-requests/${created.id}/decline`,
      );
      assert.equal(declineRes.status, 204);

      // Verify no pending requests remain
      const pendingRes = await call(baseUrl, bobId, 'GET', '/me/friend-requests');
      const pending = (await pendingRes.json()) as unknown[];
      assert.equal(pending.length, 0);
    });
  });

  test('DELETE /friends/:userId removes a mutual friendship', async () => {
    await withApp(app, async (baseUrl) => {
      const createRes = await sendRequest(baseUrl, aliceId, bobId);
      const created = (await createRes.json()) as { id: string };

      await call(baseUrl, bobId, 'POST', `/friend-requests/${created.id}/accept`);

      // Alice removes Bob
      const deleteRes = await call(baseUrl, aliceId, 'DELETE', `/friends/${bobId.value}`);
      assert.equal(deleteRes.status, 204);

      // Verify both friends lists are empty
      const aliceFriendsRes = await call(baseUrl, aliceId, 'GET', '/me/friends');
      assert.deepEqual(await aliceFriendsRes.json(), []);

      const bobFriendsRes = await call(baseUrl, bobId, 'GET', '/me/friends');
      assert.deepEqual(await bobFriendsRes.json(), []);

      // Deleting again returns 404
      const secondDelete = await call(baseUrl, aliceId, 'DELETE', `/friends/${bobId.value}`);
      assert.equal(secondDelete.status, 404);
    });
  });
});
