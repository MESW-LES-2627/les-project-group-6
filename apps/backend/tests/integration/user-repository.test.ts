import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../../src/database/pool.js';
import { DrizzleUserRepository } from '../../src/features/user/user-repository.js';
import { Email, User, UserId, Username, UsernameTakenError } from '../../src/features/user/user.js';
import { BusinessRuleViolationError } from '../../src/utils/errors.js';
import { createTestPool, truncateTables } from '../helpers/test-db.js';

describe('DrizzleUserRepository Integration', () => {
  const pool = createTestPool();
  const db = createDb(pool);
  const repo = new DrizzleUserRepository(db);

  beforeEach(async () => {
    await truncateTables(pool, ['users']);
  });

  after(async () => {
    await truncateTables(pool, ['users']);
    await pool.end();
  });

  test('saves and finds user by ID', async () => {
    const user = User.register({
      id: UserId.of('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
      email: Email.of('test@example.com'),
      username: Username.of('bookworm'),
      displayName: 'Book Worm',
      timezone: 'Europe/Lisbon',
    });
    user.makeProfilePublic();

    await repo.save(user);

    const found = await repo.findById(user.id);
    assert.ok(found, 'User should be found in database');
    assert.ok(found.id.equals(user.id));
    assert.strictEqual(found.email.value, 'test@example.com');
    assert.strictEqual(found.username.value, 'bookworm');
    assert.strictEqual(found.displayName, 'Book Worm');
    assert.strictEqual(found.profileVisibility, 'public');
    assert.strictEqual(found.currentStreak, 0);
    assert.strictEqual(found.hitStreak, false);
  });

  test('finds user by username', async () => {
    const user = User.register({
      id: UserId.of('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'),
      email: Email.of('reader@example.com'),
      username: Username.of('page_turner'),
      displayName: 'Page Turner',
    });

    await repo.save(user);

    const found = await repo.findByUsername(Username.of('page_turner'));
    assert.ok(found, 'User should be found by username');
    assert.ok(found.id.equals(user.id));
    assert.strictEqual(found.displayName, 'Page Turner');
  });

  test('persists a renamed user', async () => {
    const user = User.register({
      id: UserId.of('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a23'),
      email: Email.of('rename@example.com'),
      username: Username.of('renamer'),
      displayName: 'Old Name',
    });
    await repo.save(user);

    user.rename('New Name');
    await repo.save(user);

    const found = await repo.findById(user.id);
    assert.strictEqual(found?.displayName, 'New Name');
  });

  test('returns null when user is not found', async () => {
    const notFound = await repo.findById(UserId.of('00000000-0000-0000-0000-000000000000'));
    assert.strictEqual(notFound, null);
  });

  test('finds a user by username ignoring case', async () => {
    const user = User.register({
      id: UserId.of('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a24'),
      email: Email.of('case@example.com'),
      username: Username.of('Ana_Reads'),
      displayName: 'Ana',
    });
    await repo.save(user);

    for (const variant of ['ana_reads', 'ANA_READS', 'Ana_Reads']) {
      const found = await repo.findByUsername(Username.of(variant));
      assert.ok(found?.id.equals(user.id), variant);
      assert.strictEqual(found?.username.value, 'Ana_Reads');
    }
    assert.strictEqual(await repo.findByUsername(Username.of('ana_read')), null);
  });

  test('save maps a username conflict (any case) to UsernameTakenError', async () => {
    await repo.save(
      User.register({
        id: UserId.of('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a25'),
        email: Email.of('first@example.com'),
        username: Username.of('ana_reads'),
        displayName: 'First',
      }),
    );

    for (const [id, username] of [
      ['d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a26', 'ana_reads'],
      ['d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a27', 'ANA_READS'],
    ] as const) {
      const clash = User.register({
        id: UserId.of(id),
        email: Email.of(`${username.toLowerCase()}-${id.slice(-2)}@example.com`),
        username: Username.of(username),
        displayName: 'Second',
      });
      await assert.rejects(repo.save(clash), UsernameTakenError, username);
      assert.strictEqual(await repo.findById(clash.id), null);
    }
  });

  describe('add (insert only)', () => {
    const reader = (id: string, email: string, username: string) =>
      User.register({
        id: UserId.of(id),
        email: Email.of(email),
        username: Username.of(username),
        displayName: 'Reader',
      });

    test('inserts a new user', async () => {
      const user = reader('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', 'one@example.com', 'one_reader');
      await repo.add(user);
      assert.ok(await repo.findById(user.id));
    });

    test('rejects a second profile for the same account instead of overwriting it', async () => {
      const id = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02';
      await repo.add(reader(id, 'two@example.com', 'two_reader'));
      await assert.rejects(
        repo.add(reader(id, 'two@example.com', 'other_name')),
        (error: unknown) =>
          error instanceof BusinessRuleViolationError && /already exists/.test(error.message),
      );
      const found = await repo.findById(UserId.of(id));
      assert.strictEqual(found?.username.value, 'two_reader');
    });

    test('rejects a username taken ignoring case', async () => {
      await repo.add(reader('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03', 'a@example.com', 'ana_reads'));
      await assert.rejects(
        repo.add(reader('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04', 'b@example.com', 'ANA_READS')),
        UsernameTakenError,
      );
    });

    test('rejects an email that is already registered with a 409-family error', async () => {
      await repo.add(reader('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05', 'same@example.com', 'first'));
      await assert.rejects(
        repo.add(reader('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a06', 'same@example.com', 'second')),
        (error: unknown) =>
          error instanceof BusinessRuleViolationError && /email/.test(error.message),
      );
    });
  });
});
