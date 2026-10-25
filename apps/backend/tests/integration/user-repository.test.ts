import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../../src/database/pool.js';
import { DrizzleUserRepository } from '../../src/features/user/user-repository.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
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
});
