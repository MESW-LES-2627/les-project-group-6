import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UserId } from '../../src/features/user/user.js';
import {
  CannotFriendSelfError,
  Friendship,
  FriendshipNotPendingError,
  UnauthorizedFriendshipActionError,
} from '../../src/features/friend/friend.js';

describe('Friendship Entity', () => {
  const aliceId = UserId.generate();
  const bobId = UserId.generate();
  const charlieId = UserId.generate();
  const now = new Date('2026-11-04T12:00:00Z');
  const later = new Date('2026-11-04T12:05:00Z');

  it('request creates a pending friendship', () => {
    const friendship = Friendship.request(aliceId, bobId, now);

    assert.equal(friendship.requesterId.value, aliceId.value);
    assert.equal(friendship.addresseeId.value, bobId.value);
    assert.equal(friendship.status, 'pending');
    assert.equal(friendship.createdAt.toISOString(), now.toISOString());
    assert.equal(friendship.respondedAt, null);
  });

  it('refuses to friend yourself', () => {
    assert.throws(() => Friendship.request(aliceId, aliceId, now), CannotFriendSelfError);
  });

  it('accepts a pending request when responded by the addressee', () => {
    const friendship = Friendship.request(aliceId, bobId, now);

    friendship.accept(bobId, later);

    assert.equal(friendship.status, 'accepted');
    assert.equal(friendship.respondedAt?.toISOString(), later.toISOString());
  });

  it('refuses acceptance from anyone other than the addressee (requested user)', () => {
    const friendship = Friendship.request(aliceId, bobId, now);

    assert.throws(
      () => friendship.accept(aliceId, later),
      UnauthorizedFriendshipActionError,
      'The requester cannot accept their own request',
    );

    assert.throws(
      () => friendship.accept(charlieId, later),
      UnauthorizedFriendshipActionError,
      'A third party cannot accept the request',
    );
  });

  it('refuses to accept an already answered friendship', () => {
    const friendship = Friendship.request(aliceId, bobId, now);
    friendship.accept(bobId, later);

    assert.throws(() => friendship.accept(bobId, later), FriendshipNotPendingError);
  });

  it('declines a pending request when responded by the addressee', () => {
    const friendship = Friendship.request(aliceId, bobId, now);

    friendship.decline(bobId, later);

    assert.equal(friendship.status, 'declined');
    assert.equal(friendship.respondedAt?.toISOString(), later.toISOString());
  });

  it('refuses decline from anyone other than the addressee', () => {
    const friendship = Friendship.request(aliceId, bobId, now);

    assert.throws(() => friendship.decline(aliceId, later), UnauthorizedFriendshipActionError);
  });
});
