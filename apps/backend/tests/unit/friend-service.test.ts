import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  InMemoryFriendRepository,
} from '../helpers/in-memory-repositories.js';
import type { IUserRepository } from '../../src/features/user/user-repository.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { FriendService } from '../../src/features/friend/friend-service.js';
import {
  CannotFriendSelfError,
  FriendshipNotFoundError,
  FriendshipNotPendingError,
  UnauthorizedFriendshipActionError,
} from '../../src/features/friend/friend.js';
import { InvalidValueError } from '../../src/utils/errors.js';

class FakeUserRepository implements IUserRepository {
  private readonly users = new Map<string, User>();

  addUser(user: User): void {
    this.users.set(user.id.value, user);
  }

  async findById(id: UserId): Promise<User | null> {
    return this.users.get(id.value) ?? null;
  }

  async findByUsername(username: Username): Promise<User | null> {
    return [...this.users.values()].find((u) => u.username.equals(username)) ?? null;
  }

  async save(user: User): Promise<void> {
    this.users.set(user.id.value, user);
  }
}

describe('FriendService', () => {
  let friendRepo: InMemoryFriendRepository;
  let userRepo: FakeUserRepository;
  let service: FriendService;

  const alice = User.register({
    id: UserId.of('11111111-1111-4111-8111-111111111111'),
    email: Email.of('alice@test.com'),
    username: Username.of('alice'),
    displayName: 'Alice Reader',
  });

  const bob = User.register({
    id: UserId.of('22222222-2222-4222-8222-222222222222'),
    email: Email.of('bob@test.com'),
    username: Username.of('bob_books'),
    displayName: 'Bob Books',
  });

  const charlie = User.register({
    id: UserId.of('33333333-3333-4333-8333-333333333333'),
    email: Email.of('charlie@test.com'),
    username: Username.of('charlie_c'),
    displayName: 'Charlie',
  });

  const fixedClock = () => new Date('2026-11-04T15:00:00Z');

  beforeEach(() => {
    friendRepo = new InMemoryFriendRepository();
    userRepo = new FakeUserRepository();
    userRepo.addUser(alice);
    userRepo.addUser(bob);
    userRepo.addUser(charlie);
    service = new FriendService(friendRepo, userRepo, fixedClock);
  });

  describe('request', () => {
    it('creates a new friendship request with outcome ok', async () => {
      const result = await service.request(alice.id.value, bob.id.value);

      assert.equal(result.outcome, 'ok');
      assert.equal(result.friendship.status, 'pending');
      assert.equal(result.friendship.requesterId.value, alice.id.value);
      assert.equal(result.friendship.addresseeId.value, bob.id.value);

      const stored = await friendRepo.findById(result.friendship.id);
      assert.ok(stored);
      assert.equal(stored.status, 'pending');
    });

    it('rejects if requester id equals target user id (cannot friend yourself)', async () => {
      await assert.rejects(
        () => service.request(alice.id.value, alice.id.value),
        CannotFriendSelfError,
      );
    });

    it('rejects if requester or target user is not a valid user in the database', async () => {
      const nonExistentUserId = '99999999-9999-4999-8999-999999999999';

      await assert.rejects(
        () => service.request(alice.id.value, nonExistentUserId),
        InvalidValueError,
      );

      await assert.rejects(
        () => service.request(nonExistentUserId, bob.id.value),
        InvalidValueError,
      );
    });

    it('returns no_changes if a pending friendship already exists between them', async () => {
      const first = await service.request(alice.id.value, bob.id.value);
      assert.equal(first.outcome, 'ok');

      // Request again from alice to bob
      const second = await service.request(alice.id.value, bob.id.value);
      assert.equal(second.outcome, 'no_changes');
      assert.equal(second.friendship.id.value, first.friendship.id.value);

      // Request in the opposite direction (bob to alice) while pending
      const reverse = await service.request(bob.id.value, alice.id.value);
      assert.equal(reverse.outcome, 'no_changes');
      assert.equal(reverse.friendship.id.value, first.friendship.id.value);
    });

    it('returns no_changes if friendship is already accepted', async () => {
      const first = await service.request(alice.id.value, bob.id.value);
      await service.accept(bob.id.value, alice.id.value);

      const repeat = await service.request(alice.id.value, bob.id.value);
      assert.equal(repeat.outcome, 'no_changes');
      assert.equal(repeat.friendship.status, 'accepted');
      assert.equal(repeat.friendship.id.value, first.friendship.id.value);
    });
  });

  describe('accept', () => {
    it('accepts pending request when called by the requested user', async () => {
      await service.request(alice.id.value, bob.id.value);

      const accepted = await service.accept(bob.id.value, alice.id.value);
      assert.equal(accepted.status, 'accepted');

      const areFriends = await friendRepo.areFriends(alice.id, bob.id);
      assert.equal(areFriends, true);
    });

    it('refuses accept if the user accepting is the requester instead of requested', async () => {
      await service.request(alice.id.value, bob.id.value);

      await assert.rejects(
        () => service.accept(alice.id.value, bob.id.value),
        UnauthorizedFriendshipActionError,
      );
    });

    it('refuses accept if someone else tries to accept by friendship ID', async () => {
      const { friendship } = await service.request(alice.id.value, bob.id.value);

      await assert.rejects(
        () => service.accept(charlie.id.value, friendship.id.value),
        UnauthorizedFriendshipActionError,
      );
    });

    it('refuses accept if request was already accepted', async () => {
      await service.request(alice.id.value, bob.id.value);
      await service.accept(bob.id.value, alice.id.value);

      await assert.rejects(
        () => service.accept(bob.id.value, alice.id.value),
        FriendshipNotPendingError,
      );
    });
  });

  describe('decline', () => {
    it('declines pending request when called by the requested user', async () => {
      await service.request(alice.id.value, bob.id.value);

      const declined = await service.decline(bob.id.value, alice.id.value);
      assert.equal(declined.status, 'declined');

      const areFriends = await friendRepo.areFriends(alice.id, bob.id);
      assert.equal(areFriends, false);
    });

    it('refuses decline if caller is the requester', async () => {
      await service.request(alice.id.value, bob.id.value);

      await assert.rejects(
        () => service.decline(alice.id.value, bob.id.value),
        UnauthorizedFriendshipActionError,
      );
    });
  });

  describe('pendingRequestsFor', () => {
    it('returns all pending requests where user is the requested one', async () => {
      // Alice -> Bob, Charlie -> Bob
      await service.request(alice.id.value, bob.id.value);
      await service.request(charlie.id.value, bob.id.value);

      const pending = await service.pendingRequestsFor(bob.id.value);
      assert.equal(pending.length, 2);
      assert.ok(pending.every((p) => p.addresseeId.equals(bob.id)));
      assert.ok(pending.every((p) => p.status === 'pending'));
    });

    it('does not return outgoing requests where user is the requester', async () => {
      // Alice -> Bob
      await service.request(alice.id.value, bob.id.value);

      const aliceIncoming = await service.pendingRequestsFor(alice.id.value);
      assert.equal(aliceIncoming.length, 0);
    });

    it('does not return accepted or declined requests', async () => {
      await service.request(alice.id.value, bob.id.value);
      await service.accept(bob.id.value, alice.id.value);

      const pending = await service.pendingRequestsFor(bob.id.value);
      assert.equal(pending.length, 0);
    });
  });

  describe('removeFriend', () => {
    it('removes an existing friendship using the friend user ID', async () => {
      await service.request(alice.id.value, bob.id.value);
      await service.accept(bob.id.value, alice.id.value);

      assert.equal(await service.areFriends(alice.id.value, bob.id.value), true);

      // Alice removes Bob
      await service.removeFriend(alice.id.value, bob.id.value);

      assert.equal(await service.areFriends(alice.id.value, bob.id.value), false);
      assert.equal(await service.areFriends(bob.id.value, alice.id.value), false);
    });

    it('can be removed by either friend', async () => {
      await service.request(alice.id.value, bob.id.value);
      await service.accept(bob.id.value, alice.id.value);

      // Bob removes Alice
      await service.removeFriend(bob.id.value, alice.id.value);

      assert.equal(await service.areFriends(alice.id.value, bob.id.value), false);
    });

    it('fails when they are not friends (only pending request)', async () => {
      await service.request(alice.id.value, bob.id.value);

      await assert.rejects(
        () => service.removeFriend(alice.id.value, bob.id.value),
        FriendshipNotFoundError,
      );
    });

    it('fails when no friendship exists between users', async () => {
      await assert.rejects(
        () => service.removeFriend(alice.id.value, charlie.id.value),
        FriendshipNotFoundError,
      );
    });

    it('allows sending a new request after friendship is removed', async () => {
      await service.request(alice.id.value, bob.id.value);
      await service.accept(bob.id.value, alice.id.value);

      await service.removeFriend(alice.id.value, bob.id.value);

      const result = await service.request(alice.id.value, bob.id.value);
      assert.equal(result.outcome, 'ok');
      assert.equal(result.friendship.status, 'pending');
    });
  });
});
