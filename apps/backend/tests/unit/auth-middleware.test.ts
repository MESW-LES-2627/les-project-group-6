import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { DenyAllAuthProvider } from '../../src/features/auth/auth-provider.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { bearerToken } from '../../src/middleware/auth.js';
import { UnauthenticatedError } from '../../src/utils/errors.js';
import { authHeader, FakeAuthProvider } from '../helpers/auth.js';
import { withApp } from '../helpers/http.js';
import {
  InMemoryBookRepository,
  InMemoryUserRepository,
} from '../helpers/in-memory-repositories.js';

const READER = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a41';
const NEWCOMER = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a42';

describe('authentication middleware', () => {
  let users: InMemoryUserRepository;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    await users.save(
      User.register({
        id: UserId.of(READER),
        email: Email.of('reader@example.com'),
        username: Username.of('reader'),
        displayName: 'Reader',
      }),
    );
  });

  const app = () =>
    createApp({
      authProvider: new FakeAuthProvider(),
      userRepository: users,
      bookRepository: new InMemoryBookRepository(),
    });

  test('a protected route without an Authorization header answers 401 UNAUTHENTICATED', async () => {
    await withApp(app(), async (url) => {
      const res = await fetch(`${url}/book?title=x`);
      assert.equal(res.status, 401);
      const body = (await res.json()) as { error: string; code: string };
      assert.equal(body.code, 'UNAUTHENTICATED');
      assert.ok(body.error);
    });
  });

  test('a malformed or invalid token answers 401', async () => {
    await withApp(app(), async (url) => {
      for (const header of ['Basic abc', 'Bearer', 'Bearer not-a-token']) {
        const res = await fetch(`${url}/book?title=x`, { headers: { Authorization: header } });
        assert.equal(res.status, 401, header);
        assert.equal(((await res.json()) as { code: string }).code, 'UNAUTHENTICATED');
      }
    });
  });

  test('a valid token without a users row answers 403 PROFILE_REQUIRED', async () => {
    await withApp(app(), async (url) => {
      const res = await fetch(`${url}/book?title=x`, { headers: authHeader(NEWCOMER) });
      assert.equal(res.status, 403);
      assert.equal(((await res.json()) as { code: string }).code, 'PROFILE_REQUIRED');
    });
  });

  test('a valid token with a users row passes through to the route', async () => {
    await withApp(app(), async (url) => {
      const res = await fetch(`${url}/book?title=x`, { headers: authHeader(READER) });
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), []);
    });
  });

  test('/health and the username availability check are public', async () => {
    await withApp(app(), async (url) => {
      const health = await fetch(`${url}/health`);
      assert.equal(health.status, 200);

      const taken = await fetch(`${url}/usernames/READER/availability`);
      assert.equal(taken.status, 200);
      assert.deepEqual(await taken.json(), { available: false });

      const free = await fetch(`${url}/usernames/someone_new/availability`);
      assert.deepEqual(await free.json(), { available: true });
    });
  });

  test('without an auth provider every protected route is rejected (DenyAllAuthProvider)', async () => {
    const denyAll = createApp({
      userRepository: users,
      bookRepository: new InMemoryBookRepository(),
    });
    await withApp(denyAll, async (url) => {
      const res = await fetch(`${url}/book?title=x`, { headers: authHeader(READER) });
      assert.equal(res.status, 401);
      assert.equal(((await res.json()) as { code: string }).code, 'UNAUTHENTICATED');

      const me = await fetch(`${url}/me`, { headers: authHeader(READER) });
      assert.equal(me.status, 401);
    });
    await assert.rejects(new DenyAllAuthProvider().verify(), UnauthenticatedError);
  });

  test('bearerToken extracts the token and rejects anything else', () => {
    assert.equal(bearerToken('Bearer abc.def'), 'abc.def');
    assert.equal(bearerToken('bearer abc'), 'abc');
    assert.throws(() => bearerToken(undefined), UnauthenticatedError);
    assert.throws(() => bearerToken('Bearer a b'), UnauthenticatedError);
  });
});
