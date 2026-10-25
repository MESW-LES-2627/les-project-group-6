import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { DatabaseHealthCheck } from '../../src/database/health-check.js';
import { createPool } from '../../src/database/pool.js';
import { withApp } from '../helpers/http.js';

describe('GET /health', () => {
  test('returns 200 { status: "ok", db: "ok" } when database is reachable', async () => {
    const pool = createPool();
    const healthCheck = new DatabaseHealthCheck(pool);
    const app = createApp({ healthCheck });

    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/health`);
      const body = await response.json();

      assert.strictEqual(response.status, 200);
      assert.deepStrictEqual(body, { status: 'ok', db: 'ok' });
    });

    await pool.end();
  });

  test('returns 503 { status: "error", db: "down" } when database is unreachable', async () => {
    const mockDownHealthCheck = {
      isHealthy: async () => false,
    } as DatabaseHealthCheck;

    const app = createApp({ healthCheck: mockDownHealthCheck });

    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/health`);
      const body = await response.json();

      assert.strictEqual(response.status, 503);
      assert.deepStrictEqual(body, { status: 'error', db: 'down' });
    });
  });
});
