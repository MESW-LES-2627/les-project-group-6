// @req F-AUTH-01
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { InvalidValueError } from '../../src/utils/errors.js';

const newUser = () =>
  User.register({
    id: UserId.generate(),
    email: Email.of('reader@example.com'),
    username: Username.of('reader'),
    displayName: ' Reader ',
  });

describe('User', () => {
  test('register starts with a private profile and no streak', () => {
    const user = newUser();
    assert.strictEqual(user.displayName, 'Reader');
    assert.strictEqual(user.profileVisibility, 'private');
    assert.strictEqual(user.currentStreak, 0);
  });

  test('rename validates the display name', () => {
    const user = newUser();
    user.rename('Book Worm');
    assert.strictEqual(user.displayName, 'Book Worm');
    assert.throws(() => user.rename('  '), InvalidValueError);
  });

  test('profile visibility changes through intention-revealing methods', () => {
    const user = newUser();
    user.makeProfilePublic();
    assert.strictEqual(user.profileVisibility, 'public');
    user.makeProfilePrivate();
    assert.strictEqual(user.profileVisibility, 'private');
  });
});
