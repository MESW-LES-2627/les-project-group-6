// @req F-AUTH-01
import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AuthIdentity } from '../../src/features/auth/auth-provider.js';
import { Friendship } from '../../src/features/friend/friend.js';
import type { StreakService } from '../../src/features/user/streak-service.js';
import { UserService } from '../../src/features/user/user-service.js';
import {
  Email,
  User,
  UserId,
  Username,
  UsernameTakenError,
  DEFAULT_TIMEZONE,
} from '../../src/features/user/user.js';
import {
  BusinessRuleViolationError,
  InvalidValueError,
  NotFoundError,
} from '../../src/utils/errors.js';
import {
  InMemoryFriendRepository,
  InMemoryReadingSessionRepository,
  InMemoryUserRepository,
} from '../helpers/in-memory-repositories.js';

const identity = (email: string | null = 'ana@example.com'): AuthIdentity => ({
  userId: UserId.generate(),
  email: email === null ? null : Email.of(email),
  expiresAt: null,
});

describe('UserService', () => {
  let users: InMemoryUserRepository;
  let friends: InMemoryFriendRepository;
  let sessions: InMemoryReadingSessionRepository;
  let service: UserService;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    friends = new InMemoryFriendRepository();
    sessions = new InMemoryReadingSessionRepository();
    service = new UserService(users, friends, sessions);
  });

  const seed = async (
    username: string,
    visibility: 'public' | 'private' = 'private',
  ): Promise<User> => {
    const user = User.register({
      id: UserId.generate(),
      email: Email.of(`${username}@example.com`),
      username: Username.of(username),
      displayName: username,
    });
    if (visibility === 'public') {
      user.makeProfilePublic();
    }
    await users.save(user);
    return user;
  };

  describe('createProfile', () => {
    test('creates the profile with the identity, the body and the timezone', async () => {
      const who = identity();
      const user = await service.createProfile(who, {
        username: '@ana_reads',
        displayName: ' Ana ',
        timezone: 'America/Sao_Paulo',
      });

      assert.ok(user.id.equals(who.userId));
      assert.equal(user.email.value, 'ana@example.com');
      assert.equal(user.username.value, 'ana_reads');
      assert.equal(user.displayName, 'Ana');
      assert.equal(user.timezone, 'America/Sao_Paulo');
      assert.ok(await users.findById(who.userId));
    });

    test('defaults the timezone when none is sent', async () => {
      const user = await service.createProfile(identity(), {
        username: 'ana_reads',
        displayName: 'Ana',
      });
      assert.equal(user.timezone, DEFAULT_TIMEZONE);
    });

    test('rejects a username taken in any letter case', async () => {
      await seed('ana_reads');
      const who = identity('other@example.com');

      await assert.rejects(
        service.createProfile(who, { username: 'ANA_READS', displayName: 'Ana' }),
        (error: unknown) => {
          assert.ok(error instanceof UsernameTakenError);
          assert.equal(error.code, 'USERNAME_TAKEN');
          assert.equal(error.message, 'This username is already taken');
          return true;
        },
      );
      assert.equal(await users.findById(who.userId), null);
    });

    test('rejects a second profile for the same account (409 family)', async () => {
      const who = identity();
      await service.createProfile(who, { username: 'ana_reads', displayName: 'Ana' });

      await assert.rejects(
        service.createProfile(who, { username: 'ana_other', displayName: 'Ana' }),
        (error: unknown) =>
          error instanceof BusinessRuleViolationError && !(error instanceof UsernameTakenError),
      );
    });

    test('rejects an account without an email', async () => {
      await assert.rejects(
        service.createProfile(identity(null), { username: 'ana_reads', displayName: 'Ana' }),
        InvalidValueError,
      );
    });

    test('rejects an invalid timezone', async () => {
      const who = identity();
      await assert.rejects(
        service.createProfile(who, {
          username: 'ana_reads',
          displayName: 'Ana',
          timezone: 'Mars/Olympus_Mons',
        }),
        InvalidValueError,
      );
      assert.equal(await users.findById(who.userId), null);
    });

    test('rejects a missing username or display name and an invalid username', async () => {
      await assert.rejects(
        service.createProfile(identity(), { username: undefined, displayName: 'A' }),
        InvalidValueError,
      );
      await assert.rejects(
        service.createProfile(identity(), { username: 'ana_reads', displayName: 42 }),
        InvalidValueError,
      );
      await assert.rejects(
        service.createProfile(identity(), { username: 'a!', displayName: 'Ana' }),
        InvalidValueError,
      );
    });
  });

  describe('updateProfile', () => {
    test('renames and moves the user, and persists the change', async () => {
      const user = await seed('ana_reads');

      await service.updateProfile(user, { displayName: 'Ana B.', timezone: 'Asia/Tokyo' });

      const stored = await users.findById(user.id);
      assert.equal(stored?.displayName, 'Ana B.');
      assert.equal(stored?.timezone, 'Asia/Tokyo');
    });

    test('leaves fields that are not sent unchanged', async () => {
      const user = await seed('ana_reads');
      await service.updateProfile(user, { timezone: 'Asia/Tokyo' });
      assert.equal(user.displayName, 'ana_reads');
      assert.equal(user.timezone, 'Asia/Tokyo');
    });

    test('rejects an invalid timezone or an empty display name', async () => {
      const user = await seed('ana_reads');
      await assert.rejects(
        service.updateProfile(user, { timezone: 'Nowhere/Land' }),
        InvalidValueError,
      );
      await assert.rejects(service.updateProfile(user, { displayName: '   ' }), InvalidValueError);
    });
  });

  describe('isUsernameAvailable', () => {
    test('is true for a free username and false for a taken one in any case', async () => {
      await seed('ana_reads');
      assert.equal(await service.isUsernameAvailable('bob_reads'), true);
      assert.equal(await service.isUsernameAvailable('ana_reads'), false);
      assert.equal(await service.isUsernameAvailable('@Ana_Reads'), false);
    });

    test('rejects a malformed username', async () => {
      await assert.rejects(service.isUsernameAvailable('a b'), InvalidValueError);
      await assert.rejects(service.isUsernameAvailable(undefined), InvalidValueError);
    });
  });

  describe('getProfileByUsername', () => {
    test('returns own profile with isSelf true and visible', async () => {
      const user = await seed('ana_reads', 'private');
      const profile = await service.getProfileByUsername('ana_reads', user.id.value);

      assert.equal(profile.id, user.id.value);
      assert.equal(profile.username, 'ana_reads');
      assert.equal(profile.isSelf, true);
      assert.equal(profile.isVisible, true);
      assert.equal(profile.friendshipStatus, 'self');
      assert.equal(profile.friendRequestId, null);
    });

    test('returns public profile of stranger with isVisible true', async () => {
      const viewer = await seed('viewer_user');
      const target = await seed('target_user', 'public');

      const profile = await service.getProfileByUsername('target_user', viewer.id.value);

      assert.equal(profile.id, target.id.value);
      assert.equal(profile.username, 'target_user');
      assert.equal(profile.isSelf, false);
      assert.equal(profile.isVisible, true);
      assert.equal(profile.friendshipStatus, 'none');
      assert.equal(profile.friendRequestId, null);
    });

    test('returns private profile of stranger with isVisible false and zero stats', async () => {
      const viewer = await seed('viewer_user');
      const target = await seed('target_user', 'private');

      const profile = await service.getProfileByUsername('target_user', viewer.id.value);

      assert.equal(profile.id, target.id.value);
      assert.equal(profile.isSelf, false);
      assert.equal(profile.isVisible, false);
      assert.equal(profile.friendshipStatus, 'none');
      assert.equal(profile.currentStreak, 0);
      assert.equal(profile.longestStreak, 0);
      assert.equal(profile.totalMinutes, 0);
      assert.equal(profile.sessionsCount, 0);
    });

    test('reflects pending sent friend request', async () => {
      const viewer = await seed('viewer_user');
      const target = await seed('target_user', 'public');

      const req = Friendship.request(viewer.id, target.id, new Date());
      await friends.save(req);

      const profile = await service.getProfileByUsername('target_user', viewer.id.value);
      assert.equal(profile.friendshipStatus, 'pending_sent');
      assert.equal(profile.friendRequestId, req.id.value);
    });

    test('reflects pending received friend request', async () => {
      const viewer = await seed('viewer_user');
      const target = await seed('target_user', 'public');

      const req = Friendship.request(target.id, viewer.id, new Date());
      await friends.save(req);

      const profile = await service.getProfileByUsername('target_user', viewer.id.value);
      assert.equal(profile.friendshipStatus, 'pending_received');
      assert.equal(profile.friendRequestId, req.id.value);
    });

    test('friends can view private profile with isVisible true', async () => {
      const viewer = await seed('viewer_user');
      const target = await seed('target_user', 'private');

      const req = Friendship.request(viewer.id, target.id, new Date());
      req.accept(target.id, new Date());
      await friends.save(req);

      const profile = await service.getProfileByUsername('target_user', viewer.id.value);
      assert.equal(profile.friendshipStatus, 'friends');
      assert.equal(profile.isVisible, true);
    });

    test('returns live streak stats when streakService is provided and profile is visible', async () => {
      const target = await seed('target_user', 'public');
      const fakeStreakService = {
        calculateStreakStatus: async () => ({
          currentStreak: 7,
          longestStreak: 14,
          hitStreak: true,
          streakType: 'daily',
        }),
      } as unknown as StreakService;

      const serviceWithStreak = new UserService(users, friends, sessions, fakeStreakService);
      const profile = await serviceWithStreak.getProfileByUsername('target_user', target.id.value);

      assert.equal(profile.currentStreak, 7);
      assert.equal(profile.longestStreak, 14);
    });

    test('ignores @ prefix and handles case-insensitivity', async () => {
      const viewer = await seed('viewer_user');
      const target = await seed('Target_User', 'public');

      const profile = await service.getProfileByUsername('@target_user', viewer.id.value);
      assert.equal(profile.id, target.id.value);
    });

    test('throws NotFoundError for nonexistent user or invalid username format', async () => {
      const viewer = await seed('viewer_user');
      await assert.rejects(
        service.getProfileByUsername('does_not_exist', viewer.id.value),
        NotFoundError,
      );
      await assert.rejects(
        service.getProfileByUsername('invalid user name!', viewer.id.value),
        NotFoundError,
      );
    });
  });

  describe('searchUsers', () => {
    test('returns empty array when query is too short or empty', async () => {
      assert.deepEqual(await service.searchUsers(''), []);
      assert.deepEqual(await service.searchUsers('  '), []);
      assert.deepEqual(await service.searchUsers('a'), []);
      assert.deepEqual(await service.searchUsers('@'), []);
    });

    test('finds users by username and display name, ignoring case and @ prefix', async () => {
      await users.add(
        User.register({
          id: UserId.of('33333333-3333-4333-8333-333333333331'),
          email: Email.of('pedro@example.com'),
          username: Username.of('pedro_reads'),
          displayName: 'Pedro Silva',
          timezone: 'Europe/Lisbon',
        }),
      );
      await users.add(
        User.register({
          id: UserId.of('33333333-3333-4333-8333-333333333332'),
          email: Email.of('maria@example.com'),
          username: Username.of('maria_le'),
          displayName: 'Maria Santos',
          timezone: 'Europe/Lisbon',
        }),
      );

      const byUsername = await service.searchUsers('@pedro');
      assert.equal(byUsername.length, 1);
      assert.equal(byUsername[0]?.username, 'pedro_reads');
      assert.equal(byUsername[0]?.displayName, 'Pedro Silva');

      const byDisplayName = await service.searchUsers('santos');
      assert.equal(byDisplayName.length, 1);
      assert.equal(byDisplayName[0]?.username, 'maria_le');
    });

    test('respects search limit', async () => {
      for (let i = 1; i <= 5; i++) {
        await users.add(
          User.register({
            id: UserId.of(`44444444-4444-4444-8444-44444444444${i}`),
            email: Email.of(`user${i}@example.com`),
            username: Username.of(`bookworm_${i}`),
            displayName: `Reader ${i}`,
            timezone: 'UTC',
          }),
        );
      }

      const results = await service.searchUsers('bookworm', 3);
      assert.equal(results.length, 3);
    });
  });
});
