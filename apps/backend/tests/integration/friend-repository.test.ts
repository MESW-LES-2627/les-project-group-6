import { after, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../../src/database/pool.js';
import { DrizzleFriendRepository } from '../../src/features/friend/friend-repository.js';
import { Friendship } from '../../src/features/friend/friend.js';
import { DrizzleUserRepository } from '../../src/features/user/user-repository.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { createTestPool, truncateTables } from '../helpers/test-db.js';

describe('DrizzleFriendRepository Integration', () => {
  const pool = createTestPool();
  const db = createDb(pool);
  const friendRepo = new DrizzleFriendRepository(db);
  const userRepo = new DrizzleUserRepository(db);

  const aliceId = UserId.of('11111111-1111-4111-8111-111111111111');
  const bobId = UserId.of('22222222-2222-4222-8222-222222222222');

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

  beforeEach(async () => {
    await truncateTables(pool, ['friendships', 'users']);
    await userRepo.save(alice);
    await userRepo.save(bob);
  });

  after(async () => {
    await truncateTables(pool, ['friendships', 'users']);
    await pool.end();
  });

  test('saves and finds friendship by id and between users', async () => {
    const now = new Date('2026-11-04T12:00:00Z');
    const friendship = Friendship.request(aliceId, bobId, now);

    await friendRepo.save(friendship);

    const foundById = await friendRepo.findById(friendship.id);
    assert.ok(foundById);
    assert.equal(foundById.id.value, friendship.id.value);
    assert.equal(foundById.status, 'pending');
    assert.equal(foundById.requesterId.value, aliceId.value);
    assert.equal(foundById.addresseeId.value, bobId.value);

    // Should find in forward direction (alice, bob)
    const forward = await friendRepo.findBetween(aliceId, bobId);
    assert.ok(forward);
    assert.equal(forward.id.value, friendship.id.value);

    // Should find in reverse direction (bob, alice)
    const reverse = await friendRepo.findBetween(bobId, aliceId);
    assert.ok(reverse);
    assert.equal(reverse.id.value, friendship.id.value);
  });

  test('accept updates status and makes them mutual friends in areFriends and friendsOf', async () => {
    const now = new Date('2026-11-04T12:00:00Z');
    const later = new Date('2026-11-04T12:10:00Z');
    const friendship = Friendship.request(aliceId, bobId, now);
    await friendRepo.save(friendship);

    friendship.accept(bobId, later);
    await friendRepo.save(friendship);

    const reloaded = await friendRepo.findById(friendship.id);
    assert.ok(reloaded);
    assert.equal(reloaded.status, 'accepted');
    assert.ok(reloaded.respondedAt);

    // areFriends check in both directions
    assert.equal(await friendRepo.areFriends(aliceId, bobId), true);
    assert.equal(await friendRepo.areFriends(bobId, aliceId), true);

    // friendsOf check for both users
    const aliceFriends = await friendRepo.friendsOf(aliceId);
    assert.equal(aliceFriends.length, 1);
    assert.equal(aliceFriends[0]?.userId, bobId.value);
    assert.equal(aliceFriends[0]?.username, 'bob_b');

    const bobFriends = await friendRepo.friendsOf(bobId);
    assert.equal(bobFriends.length, 1);
    assert.equal(bobFriends[0]?.userId, aliceId.value);
    assert.equal(bobFriends[0]?.username, 'alice_r');
  });

  test('deletes a friendship', async () => {
    const friendship = Friendship.request(aliceId, bobId, new Date());
    await friendRepo.save(friendship);

    await friendRepo.delete(friendship.id);

    const found = await friendRepo.findById(friendship.id);
    assert.equal(found, null);
  });
});
