import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AuthIdentity } from '../../src/features/auth/auth-provider.js';
import { UserService } from '../../src/features/user/user-service.js';
import {
  Email,
  User,
  UserId,
  Username,
  UsernameTakenError,
  DEFAULT_TIMEZONE,
} from '../../src/features/user/user.js';
import { BusinessRuleViolationError, InvalidValueError } from '../../src/utils/errors.js';
import { InMemoryUserRepository } from '../helpers/in-memory-repositories.js';

const identity = (email: string | null = 'ana@example.com'): AuthIdentity => ({
  userId: UserId.generate(),
  email: email === null ? null : Email.of(email),
  expiresAt: null,
});

describe('UserService', () => {
  let users: InMemoryUserRepository;
  let service: UserService;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    service = new UserService(users);
  });

  const seed = async (username: string): Promise<User> => {
    const user = User.register({
      id: UserId.generate(),
      email: Email.of(`${username}@example.com`),
      username: Username.of(username),
      displayName: username,
    });
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
});
