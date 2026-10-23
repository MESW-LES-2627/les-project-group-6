import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { createDb } from '../../src/infrastructure/database/pool.js';
import { DrizzleBookRepository } from '../../src/infrastructure/repositories/drizzle-book-repository.js';
import { Book } from '../../src/domain/book.js';
import { createTestPool, truncateTables } from '../helpers/test-db.js';
import { withApp } from '../helpers/http.js';

describe('Book API Endpoints', () => {
  const pool = createTestPool();
  const db = createDb(pool);
  const bookRepository = new DrizzleBookRepository(db);
  const app = createApp({ bookRepository });

  beforeEach(async () => {
    await truncateTables(pool, ['books']);
  });

  after(async () => {
    await truncateTables(pool, ['books']);
    await pool.end();
  });

  test('POST /book creates a new book and returns 201', async () => {
    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '1984',
          description: 'Dystopian classic',
          isbn13: '9780451524935',
          pageCount: 328,
          coverUrl: 'https://example.com/1984.jpg',
        }),
      });

      assert.strictEqual(response.status, 201);
      const data = (await response.json()) as { id: string; title: string; pageCount: number };
      assert.ok(data.id);
      assert.strictEqual(data.title, '1984');
      assert.strictEqual(data.pageCount, 328);

      const saved = await bookRepository.findById(data.id);
      assert.ok(saved);
      assert.strictEqual(saved.title, '1984');
    });
  });

  test('POST /book returns 400 when title is missing', async () => {
    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: 'No title provided' }),
      });

      assert.strictEqual(response.status, 400);
      const data = (await response.json()) as { error: string };
      assert.strictEqual(data.error, 'Title is required');
    });
  });

  test('GET /book/:id returns 200 with book when found', async () => {
    const book = new Book({
      id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
      title: 'Brave New World',
      pageCount: 288,
    });
    await bookRepository.save(book);

    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/book/${book.id}`);
      assert.strictEqual(response.status, 200);

      const data = (await response.json()) as { id: string; title: string };
      assert.strictEqual(data.id, book.id);
      assert.strictEqual(data.title, 'Brave New World');
    });
  });

  test('GET /book/:id returns 404 when book ID does not exist', async () => {
    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/book/00000000-0000-0000-0000-000000000000`);
      assert.strictEqual(response.status, 404);
    });
  });

  test('GET /book?title= searches books by title', async () => {
    await bookRepository.save(new Book({ title: 'Foundation' }));
    await bookRepository.save(new Book({ title: 'Foundation and Empire' }));
    await bookRepository.save(new Book({ title: 'Second Foundation' }));

    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/book?title=Empire`);
      assert.strictEqual(response.status, 200);

      const data = (await response.json()) as Array<{ title: string }>;
      assert.strictEqual(data.length, 1);
      assert.strictEqual(data[0]?.title, 'Foundation and Empire');
    });
  });

  test('GET /book/:id returns 404 when ID is not a valid UUID', async () => {
    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/book/not-a-valid-uuid`);
      assert.strictEqual(response.status, 404);
    });
  });

  test('DELETE /book/:id deletes book and returns 204', async () => {
    const book = new Book({
      id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a45',
      title: 'To Be Deleted',
    });
    await bookRepository.save(book);

    await withApp(app, async (baseUrl) => {
      const deleteResponse = await fetch(`${baseUrl}/book/${book.id}`, {
        method: 'DELETE',
      });
      assert.strictEqual(deleteResponse.status, 204);

      const getResponse = await fetch(`${baseUrl}/book/${book.id}`);
      assert.strictEqual(getResponse.status, 404);
    });
  });

  test('DELETE /book/:id returns 404 for non-existent book', async () => {
    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/book/00000000-0000-0000-0000-000000000000`, {
        method: 'DELETE',
      });
      assert.strictEqual(response.status, 404);
    });
  });
});
