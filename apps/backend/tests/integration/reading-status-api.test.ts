import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { createDb } from '../../src/database/pool.js';
import { DrizzleBookRepository } from '../../src/features/book/book-repository.js';
import { DrizzleReadingStatusRepository } from '../../src/features/reading-status/reading-status-repository.js';
import { DrizzleLibraryQuery } from '../../src/features/library/library-query.js';
import { DrizzleUserRepository } from '../../src/features/user/user-repository.js';
import { Book } from '../../src/features/book/book.js';
import { ReadingStatusId } from '../../src/features/reading-status/reading-status.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { authHeader, FakeAuthProvider } from '../helpers/auth.js';
import { createTestPool, truncateTables } from '../helpers/test-db.js';
import { withApp } from '../helpers/http.js';

const USER_ID = 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a61';
const OTHER_USER_ID = 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a62';

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
  const userRepository = new DrizzleUserRepository(db);
  const app = createApp({
    authProvider: new FakeAuthProvider(),
    userRepository,
    bookRepository,
    readingStatusRepository,
    libraryQuery,
  });
  let book: Book;

  const send = (baseUrl: string, method: string, path: string, body: object, as = USER_ID) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { ...authHeader(as), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  beforeEach(async () => {
    await truncateTables(pool, ['users', 'books', 'reading_status']);
    await userRepository.save(
      User.register({
        id: UserId.of(USER_ID),
        email: Email.of('api@example.com'),
        username: Username.of('api_reader'),
        displayName: 'API Reader',
      }),
    );
    await userRepository.save(
      User.register({
        id: UserId.of(OTHER_USER_ID),
        email: Email.of('other@example.com'),
        username: Username.of('other_reader'),
        displayName: 'Other Reader',
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
        bookId,
        status: 'in-progress',
        currentPage: 10,
      });
      assert.strictEqual(first.status, 200);
      const created = (await first.json()) as StatusBody;

      const second = await send(baseUrl, 'PUT', '/reading-status', {
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

  test("PATCH /reading-status/:id returns 404 for another reader's entry", async () => {
    await withApp(app, async (baseUrl) => {
      const created = (await (
        await send(baseUrl, 'PUT', '/reading-status', {
          bookId: book.id.value,
          status: 'in-progress',
        })
      ).json()) as StatusBody;

      const byId = await send(
        baseUrl,
        'PATCH',
        `/reading-status/${created.id}`,
        { status: 'finished' },
        OTHER_USER_ID,
      );
      assert.strictEqual(byId.status, 404);
      const byBody = await send(
        baseUrl,
        'PATCH',
        '/reading-status',
        { id: created.id, currentPage: 10 },
        OTHER_USER_ID,
      );
      assert.strictEqual(byBody.status, 404);

      const entry = await readingStatusRepository.findById(ReadingStatusId.of(created.id));
      assert.strictEqual(entry?.status, 'in-progress');
      assert.strictEqual(entry?.progress.page, 0);
    });
  });

  test('GET /me/library returns the entries with their book', async () => {
    await withApp(app, async (baseUrl) => {
      await send(baseUrl, 'PUT', '/reading-status', {
        bookId: book.id.value,
        status: 'finished',
      });

      const response = await fetch(`${baseUrl}/me/library?status=finished`, {
        headers: authHeader(USER_ID),
      });
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

  test('DELETE routes answer 401 without a token', async () => {
    await withApp(app, async (baseUrl) => {
      const byId = await fetch(`${baseUrl}/reading-status/00000000-0000-0000-0000-000000000000`, {
        method: 'DELETE',
      });
      assert.strictEqual(byId.status, 401);
      const byBook = await fetch(`${baseUrl}/library/${book.id.value}`, { method: 'DELETE' });
      assert.strictEqual(byBook.status, 401);
    });
  });

  test('DELETE /reading-status/:id removes the entry', async () => {
    await withApp(app, async (baseUrl) => {
      const created = (await (
        await send(baseUrl, 'PUT', '/reading-status', {
          bookId: book.id.value,
          status: 'in-progress',
        })
      ).json()) as StatusBody;

      const deleteRes = await send(baseUrl, 'DELETE', `/reading-status/${created.id}`, {});
      assert.strictEqual(deleteRes.status, 204);

      const retryRes = await send(baseUrl, 'DELETE', `/reading-status/${created.id}`, {});
      assert.strictEqual(retryRes.status, 404);
    });
  });

  test("DELETE /reading-status/:id returns 404 for another reader's entry", async () => {
    await withApp(app, async (baseUrl) => {
      const created = (await (
        await send(baseUrl, 'PUT', '/reading-status', {
          bookId: book.id.value,
          status: 'in-progress',
        })
      ).json()) as StatusBody;

      const deleteRes = await send(
        baseUrl,
        'DELETE',
        `/reading-status/${created.id}`,
        {},
        OTHER_USER_ID,
      );
      assert.strictEqual(deleteRes.status, 404);

      const entry = await readingStatusRepository.findById(ReadingStatusId.of(created.id));
      assert.ok(entry);
    });
  });

  test("DELETE /reading-status removes the reader's entry for a bookId", async () => {
    await withApp(app, async (baseUrl) => {
      await send(baseUrl, 'PUT', '/reading-status', {
        bookId: book.id.value,
        status: 'in-progress',
      });

      // A userId in the query is ignored: another reader only reaches their own (missing) entry.
      const otherRes = await send(
        baseUrl,
        'DELETE',
        `/reading-status?userId=${USER_ID}&bookId=${book.id.value}`,
        {},
        OTHER_USER_ID,
      );
      assert.strictEqual(otherRes.status, 404);

      const deleteRes = await send(
        baseUrl,
        'DELETE',
        `/reading-status?bookId=${book.id.value}`,
        {},
      );
      assert.strictEqual(deleteRes.status, 204);

      const retryRes = await send(baseUrl, 'DELETE', `/reading-status?bookId=${book.id.value}`, {});
      assert.strictEqual(retryRes.status, 404);
    });
  });

  test("DELETE /me/library/:bookId removes the book from the reader's library", async () => {
    await withApp(app, async (baseUrl) => {
      await send(baseUrl, 'PUT', '/reading-status', {
        bookId: book.id.value,
        status: 'in-progress',
      });

      const deleteRes = await send(baseUrl, 'DELETE', `/me/library/${book.id.value}`, {});
      assert.strictEqual(deleteRes.status, 204);

      const libraryRes = await fetch(`${baseUrl}/me/library`, { headers: authHeader(USER_ID) });
      const library = (await libraryRes.json()) as Array<unknown>;
      assert.strictEqual(library.length, 0);

      const retryRes = await send(baseUrl, 'DELETE', `/me/library/${book.id.value}`, {});
      assert.strictEqual(retryRes.status, 404);
    });
  });

  test('PUT /library/:bookId and DELETE /library/:bookId manage the book in library', async () => {
    await withApp(app, async (baseUrl) => {
      const putRes = await send(baseUrl, 'PUT', `/library/${book.id.value}`, {
        status: 'finished',
        startedOn: '2026-10-01',
        finishedOn: '2026-10-15',
      });
      assert.strictEqual(putRes.status, 200);
      const data = (await putRes.json()) as StatusBody;
      assert.strictEqual(data.status, 'finished');
      assert.strictEqual(data.startedOn, '2026-10-01');

      const getRes = await fetch(`${baseUrl}/me/library?status=finished`, {
        headers: authHeader(USER_ID),
      });
      assert.strictEqual(getRes.status, 200);
      const list = (await getRes.json()) as Array<{ status: string }>;
      assert.strictEqual(list.length, 1);
      assert.strictEqual(list[0]?.status, 'finished');

      const deleteRes = await send(baseUrl, 'DELETE', `/library/${book.id.value}`, {});
      assert.strictEqual(deleteRes.status, 204);

      const retryRes = await send(baseUrl, 'DELETE', `/library/${book.id.value}`, {});
      assert.strictEqual(retryRes.status, 404);
    });
  });
});
