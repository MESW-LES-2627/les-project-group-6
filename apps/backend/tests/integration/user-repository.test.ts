import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createDb } from '../../src/infrastructure/database/pool.js';
import { DrizzleUserRepository } from '../../src/infrastructure/repositories/drizzle-user-repository.js';
import { User } from '../../src/domain/user.js';
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
    const user = new User({
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      email: 'test@example.com',
      username: 'bookworm',
      displayName: 'Book Worm',
      timezone: 'Europe/Lisbon',
      profileVisibility: 'public',
      streakType: 'daily',
      currentStreak: 5,
      longestStreak: 10,
      hitStreak: true,
    });

    await repo.save(user);

    const found = await repo.findById(user.id);
    assert.ok(found, 'User should be found in database');
    assert.strictEqual(found.id, user.id);
    assert.strictEqual(found.email, 'test@example.com');
    assert.strictEqual(found.username, 'bookworm');
    assert.strictEqual(found.displayName, 'Book Worm');
    assert.strictEqual(found.currentStreak, 5);
    assert.strictEqual(found.hitStreak, true);
  });

  test('finds user by username', async () => {
    const user = new User({
      id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      email: 'reader@example.com',
      username: 'page_turner',
      displayName: 'Page Turner',
    });

    await repo.save(user);

    const found = await repo.findByUsername('page_turner');
    assert.ok(found, 'User should be found by username');
    assert.strictEqual(found.id, user.id);
    assert.strictEqual(found.displayName, 'Page Turner');
  });

  test('returns null when user is not found', async () => {
    const notFound = await repo.findById('00000000-0000-0000-0000-000000000000');
    assert.strictEqual(notFound, null);
  });
});
