import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { withApp } from '../helpers/http.js';

const FRONTEND = 'https://bookmarked.example';

describe('CORS', () => {
  test('without an allow-list any origin is allowed', async () => {
    await withApp(createApp(), async (url) => {
      const res = await fetch(`${url}/health`, { headers: { Origin: 'https://anywhere.example' } });
      assert.equal(res.headers.get('access-control-allow-origin'), '*');
    });
  });

  test('with an allow-list only those origins are answered', async () => {
    await withApp(createApp({ corsOrigins: [FRONTEND] }), async (url) => {
      const ok = await fetch(`${url}/health`, { headers: { Origin: FRONTEND } });
      assert.equal(ok.headers.get('access-control-allow-origin'), FRONTEND);
      assert.match(ok.headers.get('vary') ?? '', /Origin/);

      const other = await fetch(`${url}/health`, { headers: { Origin: 'https://evil.example' } });
      assert.equal(other.headers.get('access-control-allow-origin'), null);
    });
  });

  test('preflight requests are answered with 204', async () => {
    await withApp(createApp({ corsOrigins: [FRONTEND] }), async (url) => {
      const res = await fetch(`${url}/me`, { method: 'OPTIONS', headers: { Origin: FRONTEND } });
      assert.equal(res.status, 204);
      assert.match(res.headers.get('access-control-allow-headers') ?? '', /Authorization/);
    });
  });
});
