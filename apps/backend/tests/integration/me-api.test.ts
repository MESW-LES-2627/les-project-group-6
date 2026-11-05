import { after, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { createDb } from '../../src/database/pool.js';
import type { MeDto } from '../../src/features/user/me-routes.js';
import { DrizzleUserRepository } from '../../src/features/user/user-repository.js';
import { UserId } from '../../src/features/user/user.js';
import { authHeader, FakeAuthProvider } from '../helpers/auth.js';
import { withApp } from '../helpers/http.js';
import { createTestPool, truncateTables } from '../helpers/test-db.js';

const ANA = 'a1eebc99-9c0b-4ef8-bb6d-6bb9bd380a71';
const BOB = 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a72';

describe('/me API', () => {
  const pool = createTestPool();
  const db = createDb(pool);
  const userRepository = new DrizzleUserRepository(db);
  const app = createApp({ authProvider: new FakeAuthProvider(), userRepository });

  const send = (url: string, method: string, path: string, userId?: string, body?: object) =>
    fetch(`${url}${path}`, {
      method,
      headers: {
        ...(userId ? authHeader(userId, `${userId}@example.com`) : {}),
        'Content-Type': 'application/json',
      },
      body: body && JSON.stringify(body),
    });

  const signUpAna = (url: string) =>
    send(url, 'POST', '/me', ANA, {
      username: 'ana_reads',
      displayName: 'Ana',
      timezone: 'America/Sao_Paulo',
    });

  beforeEach(async () => {
    await truncateTables(pool, ['users']);
  });

  after(async () => {
    await truncateTables(pool, ['users']);
    await pool.end();
  });

  test('POST /me creates the users row with the timezone and returns 201', async () => {
    await withApp(app, async (url) => {
      const res = await signUpAna(url);
      assert.equal(res.status, 201);
      const me = (await res.json()) as MeDto;
      assert.equal(me.id, ANA);
      assert.equal(me.email, `${ANA}@example.com`);
      assert.equal(me.username, 'ana_reads');
      assert.equal(me.displayName, 'Ana');
      assert.equal(me.timezone, 'America/Sao_Paulo');
      assert.equal(me.profileVisibility, 'private');

      const stored = await userRepository.findById(UserId.of(ANA));
      assert.equal(stored?.timezone, 'America/Sao_Paulo');
    });
  });

  test('POST /me needs a token', async () => {
    await withApp(app, async (url) => {
      const res = await send(url, 'POST', '/me', undefined, {
        username: 'ana_reads',
        displayName: 'Ana',
      });
      assert.equal(res.status, 401);
    });
  });

  test('POST /me a second time answers 409', async () => {
    await withApp(app, async (url) => {
      assert.equal((await signUpAna(url)).status, 201);
      const again = await send(url, 'POST', '/me', ANA, {
        username: 'ana_again',
        displayName: 'Ana',
      });
      assert.equal(again.status, 409);
    });
  });

  test('a taken username in any case answers 409 USERNAME_TAKEN and creates no row', async () => {
    await withApp(app, async (url) => {
      await signUpAna(url);
      for (const username of ['ana_reads', 'ANA_READS']) {
        const res = await send(url, 'POST', '/me', BOB, { username, displayName: 'Bob' });
        assert.equal(res.status, 409, username);
        assert.deepEqual(await res.json(), {
          error: 'This username is already taken',
          code: 'USERNAME_TAKEN',
        });
      }
      assert.equal(await userRepository.findById(UserId.of(BOB)), null);
    });
  });

  test('POST /me rejects an invalid timezone with 400', async () => {
    await withApp(app, async (url) => {
      const res = await send(url, 'POST', '/me', ANA, {
        username: 'ana_reads',
        displayName: 'Ana',
        timezone: 'Not/AZone',
      });
      assert.equal(res.status, 400);
      assert.equal(await userRepository.findById(UserId.of(ANA)), null);
    });
  });

  test('GET /me answers 403 PROFILE_REQUIRED before sign-up and 200 after', async () => {
    await withApp(app, async (url) => {
      const before = await send(url, 'GET', '/me', ANA);
      assert.equal(before.status, 403);
      assert.equal(((await before.json()) as { code: string }).code, 'PROFILE_REQUIRED');

      await signUpAna(url);

      const afterSignUp = await send(url, 'GET', '/me', ANA);
      assert.equal(afterSignUp.status, 200);
      assert.equal(((await afterSignUp.json()) as MeDto).username, 'ana_reads');
    });
  });

  test('PATCH /me updates the display name and timezone', async () => {
    await withApp(app, async (url) => {
      await signUpAna(url);
      const res = await send(url, 'PATCH', '/me', ANA, {
        displayName: 'Ana B.',
        timezone: 'Europe/Berlin',
      });
      assert.equal(res.status, 200);
      const me = (await res.json()) as MeDto;
      assert.equal(me.displayName, 'Ana B.');
      assert.equal(me.timezone, 'Europe/Berlin');

      const stored = await userRepository.findById(UserId.of(ANA));
      assert.equal(stored?.displayName, 'Ana B.');
      assert.equal(stored?.timezone, 'Europe/Berlin');

      const bad = await send(url, 'PATCH', '/me', ANA, { timezone: 'Nope/Nope' });
      assert.equal(bad.status, 400);
    });
  });

  test('GET /usernames/:username/availability is public and case-insensitive', async () => {
    await withApp(app, async (url) => {
      await signUpAna(url);
      const check = async (username: string) => {
        const res = await send(url, 'GET', `/usernames/${username}/availability`);
        assert.equal(res.status, 200);
        return ((await res.json()) as { available: boolean }).available;
      };
      assert.equal(await check('ana_reads'), false);
      assert.equal(await check('Ana_Reads'), false);
      assert.equal(await check('bob_reads'), true);

      const invalid = await send(url, 'GET', '/usernames/a!/availability');
      assert.equal(invalid.status, 400);
    });
  });
});
