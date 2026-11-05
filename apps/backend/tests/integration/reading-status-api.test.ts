import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { createDb } from '../../src/database/pool.js';
import { DrizzleBookRepository } from '../../src/features/book/book-repository.js';
import { DrizzleReadingStatusRepository } from '../../src/features/reading-status/reading-status-repository.js';
import { DrizzleLibraryQuery } from '../../src/features/library/library-query.js';
import { DrizzleUserRepository } from '../../src/features/user/user-repository.js';
import { Book } from '../../src/features/book/book.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { createTestPool, truncateTables } from '../helpers/test-db.js';
import { withApp } from '../helpers/http.js';

const USER_ID = 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a61';

interface StatusBody {
  id: string;
  status: string;
  currentPage: number;
  startedOn?: string | null;
  finishedOn?: string | null;
  error?: string;
}

describe('Reading status API Endpoints', () => {
  const pool = createTestPool();
  const db = createDb(pool);
  const bookRepository = new DrizzleBookRepository(db);
  const readingStatusRepository = new DrizzleReadingStatusRepository(db);
  const libraryQuery = new DrizzleLibraryQuery(db);
  const app = createApp({ bookRepository, readingStatusRepository, libraryQuery });
  let book: Book;

  const send = (baseUrl: string, method: string, path: string, body: object) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  beforeEach(async () => {
    await truncateTables(pool, ['users', 'books', 'reading_status']);
    await new DrizzleUserRepository(db).save(
      User.register({
        id: UserId.of(USER_ID),
        email: Email.of('api@example.com'),
        username: Username.of('api_reader'),
        displayName: 'API Reader',
      }),
    );
    book = Book.create({ title: 'Circe', pageCount: 393 });
    await bookRepository.save(book);
  });

  after(async () => {
    await truncateTables(pool, ['users', 'books', 'reading_status']);
    await pool.end();
  });

  test('PUT /reading-status creates then updates the same entry', async () => {
    await withApp(app, async (baseUrl) => {
      const bookId = book.id.value;
      const first = await send(baseUrl, 'PUT', '/reading-status', {
        userId: USER_ID,
        bookId,
        status: 'in-progress',
        currentPage: 10,
      });
      assert.strictEqual(first.status, 200);
      const created = (await first.json()) as StatusBody;

      const second = await send(baseUrl, 'PUT', '/reading-status', {
        userId: USER_ID,
        bookId,
        status: 'in-progress',
        currentPage: 50,
      });
      const updated = (await second.json()) as StatusBody;
      assert.strictEqual(updated.id, created.id);
      assert.strictEqual(updated.currentPage, 50);
    });
  });

  test('PUT /reading-status returns 400 for an unknown status', async () => {
    await withApp(app, async (baseUrl) => {
      const response = await send(baseUrl, 'PUT', '/reading-status', {
        userId: USER_ID,
        bookId: book.id.value,
        status: 'reading',
      });
      assert.strictEqual(response.status, 400);
    });
  });

  test('PATCH /reading-status/:id returns 400 when the page exceeds the book', async () => {
    await withApp(app, async (baseUrl) => {
      const created = (await (
        await send(baseUrl, 'PUT', '/reading-status', {
          userId: USER_ID,
          bookId: book.id.value,
          status: 'in-progress',
        })
      ).json()) as StatusBody;

      const response = await send(baseUrl, 'PATCH', `/reading-status/${created.id}`, {
        currentPage: 394,
      });
      assert.strictEqual(response.status, 400);
    });
  });

  test('PATCH /reading-status/:id returns 409 for a forbidden transition', async () => {
    await withApp(app, async (baseUrl) => {
      const created = (await (
        await send(baseUrl, 'PUT', '/reading-status', {
          userId: USER_ID,
          bookId: book.id.value,
          status: 'not-started',
        })
      ).json()) as StatusBody;

      const response = await send(baseUrl, 'PATCH', `/reading-status/${created.id}`, {
        status: 'did-not-finish',
      });
      assert.strictEqual(response.status, 409);
    });
  });

  test('PATCH /reading-status/:id returns 404 when the entry does not exist', async () => {
    await withApp(app, async (baseUrl) => {
      const response = await send(
        baseUrl,
        'PATCH',
        '/reading-status/00000000-0000-0000-0000-000000000000',
        { status: 'finished' },
      );
      assert.strictEqual(response.status, 404);
    });
  });

  test('GET /user/:userId/library returns the entries with their book', async () => {
    await withApp(app, async (baseUrl) => {
      await send(baseUrl, 'PUT', '/reading-status', {
        userId: USER_ID,
        bookId: book.id.value,
        status: 'finished',
      });

      const response = await fetch(`${baseUrl}/user/${USER_ID}/library?status=finished`);
      assert.strictEqual(response.status, 200);
      const library = (await response.json()) as Array<{
        status: string;
        currentPage: number;
        startedOn: string | null;
        finishedOn: string | null;
        book: { id: string; title: string; pageCount: number };
      }>;
      assert.strictEqual(library.length, 1);
      assert.strictEqual(library[0]?.status, 'finished');
      assert.strictEqual(library[0]?.currentPage, 393);
      assert.strictEqual(typeof library[0]?.startedOn, 'string');
      assert.strictEqual(typeof library[0]?.finishedOn, 'string');
      assert.deepStrictEqual(
        { id: library[0]?.book.id, title: library[0]?.book.title },
        { id: book.id.value, title: 'Circe' },
      );
    });
  });

  test('PUT /reading-status accepts startedOn and finishedOn dates', async () => {
    await withApp(app, async (baseUrl) => {
      const response = await send(baseUrl, 'PUT', '/reading-status', {
        userId: USER_ID,
        bookId: book.id.value,
        status: 'finished',
        startedOn: '2026-10-01',
        finishedOn: '2026-10-15',
      });
      assert.strictEqual(response.status, 200);
      const data = (await response.json()) as StatusBody;
      assert.strictEqual(data.startedOn, '2026-10-01');
      assert.strictEqual(data.finishedOn, '2026-10-15');
    });
  });

  test('PUT /reading-status returns 400 when finishedOn is earlier than startedOn', async () => {
    await withApp(app, async (baseUrl) => {
      const response = await send(baseUrl, 'PUT', '/reading-status', {
        userId: USER_ID,
        bookId: book.id.value,
        status: 'finished',
        startedOn: '2026-10-15',
        finishedOn: '2026-10-01',
      });
      assert.strictEqual(response.status, 400);
    });
  });

  test('PATCH /reading-status/:id updates dates', async () => {
    await withApp(app, async (baseUrl) => {
      const created = (await (
        await send(baseUrl, 'PUT', '/reading-status', {
          userId: USER_ID,
          bookId: book.id.value,
          status: 'in-progress',
        })
      ).json()) as StatusBody;

      const response = await send(baseUrl, 'PATCH', `/reading-status/${created.id}`, {
        startedOn: '2026-09-01',
        finishedOn: '2026-09-10',
      });
      assert.strictEqual(response.status, 200);
      const updated = (await response.json()) as StatusBody;
      assert.strictEqual(updated.startedOn, '2026-09-01');
      assert.strictEqual(updated.finishedOn, '2026-09-10');
    });
  });

  test('DELETE /reading-status/:id removes the entry', async () => {
    await withApp(app, async (baseUrl) => {
      const created = (await (
        await send(baseUrl, 'PUT', '/reading-status', {
          userId: USER_ID,
          bookId: book.id.value,
          status: 'in-progress',
        })
      ).json()) as StatusBody;

      const deleteRes = await fetch(`${baseUrl}/reading-status/${created.id}`, {
        method: 'DELETE',
      });
      assert.strictEqual(deleteRes.status, 204);

      const retryRes = await fetch(`${baseUrl}/reading-status/${created.id}`, {
        method: 'DELETE',
      });
      assert.strictEqual(retryRes.status, 404);
    });
  });

  test('DELETE /reading-status removes the entry by userId and bookId', async () => {
    await withApp(app, async (baseUrl) => {
      await send(baseUrl, 'PUT', '/reading-status', {
        userId: USER_ID,
        bookId: book.id.value,
        status: 'in-progress',
      });

      const deleteRes = await fetch(
        `${baseUrl}/reading-status?userId=${USER_ID}&bookId=${book.id.value}`,
        { method: 'DELETE' },
      );
      assert.strictEqual(deleteRes.status, 204);

      const retryRes = await fetch(
        `${baseUrl}/reading-status?userId=${USER_ID}&bookId=${book.id.value}`,
        { method: 'DELETE' },
      );
      assert.strictEqual(retryRes.status, 404);
    });
  });

  test('DELETE /user/:userId/library/:bookId removes the book from user library', async () => {
    await withApp(app, async (baseUrl) => {
      await send(baseUrl, 'PUT', '/reading-status', {
        userId: USER_ID,
        bookId: book.id.value,
        status: 'in-progress',
      });

      const deleteRes = await fetch(`${baseUrl}/user/${USER_ID}/library/${book.id.value}`, {
        method: 'DELETE',
      });
      assert.strictEqual(deleteRes.status, 204);

      const libraryRes = await fetch(`${baseUrl}/user/${USER_ID}/library`);
      const library = (await libraryRes.json()) as Array<unknown>;
      assert.strictEqual(library.length, 0);

      const retryRes = await fetch(`${baseUrl}/user/${USER_ID}/library/${book.id.value}`, {
        method: 'DELETE',
      });
      assert.strictEqual(retryRes.status, 404);
    });
  });
});
