import { test, describe, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { createDb } from '../../src/database/pool.js';
import { DrizzleBookRepository } from '../../src/features/book/book-repository.js';
import { Book, BookId } from '../../src/features/book/book.js';
import { DrizzleUserRepository } from '../../src/features/user/user-repository.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { authHeader, FakeAuthProvider } from '../helpers/auth.js';
import { createTestPool, truncateTables } from '../helpers/test-db.js';
import { withApp } from '../helpers/http.js';

const USER_ID = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a31';
const auth = authHeader(USER_ID);
const json = { ...auth, 'Content-Type': 'application/json' };

describe('Book API Endpoints', () => {
  const pool = createTestPool();
  const db = createDb(pool);
  const bookRepository = new DrizzleBookRepository(db);
  const userRepository = new DrizzleUserRepository(db);
  const app = createApp({ authProvider: new FakeAuthProvider(), userRepository, bookRepository });

  beforeEach(async () => {
    await truncateTables(pool, ['users', 'books']);
    await userRepository.save(
      User.register({
        id: UserId.of(USER_ID),
        email: Email.of('books@example.com'),
        username: Username.of('book_api_reader'),
        displayName: 'Book API Reader',
      }),
    );
  });

  after(async () => {
    await truncateTables(pool, ['users', 'books']);
    await pool.end();
  });

  test('POST /book creates a new book and returns 201', async () => {
    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/book`, {
        method: 'POST',
        headers: json,
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

      const saved = await bookRepository.findById(BookId.of(data.id));
      assert.ok(saved);
      assert.strictEqual(saved.title.value, '1984');
    });
  });

  test('POST /book returns 400 when title is missing', async () => {
    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/book`, {
        method: 'POST',
        headers: json,
        body: JSON.stringify({ description: 'No title provided' }),
      });

      assert.strictEqual(response.status, 400);
      const data = (await response.json()) as { error: string };
      assert.strictEqual(data.error, 'Title is required');
    });
  });

  test('POST /book returns 400 for an invalid ISBN', async () => {
    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/book`, {
        method: 'POST',
        headers: json,
        body: JSON.stringify({ title: 'Dune', isbn13: '9780441172710' }),
      });

      assert.strictEqual(response.status, 400);
      const data = (await response.json()) as { error: string };
      assert.match(data.error, /ISBN-13/);
    });
  });

  test('POST /book returns 400 for a malformed JSON body', async () => {
    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/book`, {
        method: 'POST',
        headers: json,
        body: '{"title": ',
      });

      assert.strictEqual(response.status, 400);
    });
  });

  test('DELETE /book/:id returns 400 when ID is not a valid UUID', async () => {
    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/book/not-a-valid-uuid`, {
        method: 'DELETE',
        headers: auth,
      });
      assert.strictEqual(response.status, 400);
    });
  });

  test('GET /book/:id returns 200 with book when found', async () => {
    const book = Book.create({
      title: 'Brave New World',
      pageCount: 288,
    });
    await bookRepository.save(book);

    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/book/${book.id}`, { headers: auth });
      assert.strictEqual(response.status, 200);

      const data = (await response.json()) as { id: string; title: string };
      assert.strictEqual(data.id, book.id.value);
      assert.strictEqual(data.title, 'Brave New World');
    });
  });

  test('GET /book/:id returns 404 when book ID does not exist', async () => {
    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/book/00000000-0000-0000-0000-000000000000`, {
        headers: auth,
      });
      assert.strictEqual(response.status, 404);
    });
  });

  test('GET /book?title= searches books by title', async () => {
    await bookRepository.save(Book.create({ title: 'Foundation' }));
    await bookRepository.save(Book.create({ title: 'Foundation and Empire' }));
    await bookRepository.save(Book.create({ title: 'Second Foundation' }));

    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/book?title=Empire`, { headers: auth });
      assert.strictEqual(response.status, 200);

      const data = (await response.json()) as Array<{ title: string }>;
      assert.strictEqual(data.length, 1);
      assert.strictEqual(data[0]?.title, 'Foundation and Empire');
    });
  });

  test('GET /book/:id returns 404 when ID is not a valid UUID', async () => {
    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/book/not-a-valid-uuid`, { headers: auth });
      assert.strictEqual(response.status, 404);
    });
  });

  test('DELETE /book/:id deletes book and returns 204', async () => {
    const book = Book.create({
      title: 'To Be Deleted',
    });
    await bookRepository.save(book);

    await withApp(app, async (baseUrl) => {
      const deleteResponse = await fetch(`${baseUrl}/book/${book.id}`, {
        method: 'DELETE',
        headers: auth,
      });
      assert.strictEqual(deleteResponse.status, 204);

      const getResponse = await fetch(`${baseUrl}/book/${book.id}`, { headers: auth });
      assert.strictEqual(getResponse.status, 404);
    });
  });

  test('DELETE /book/:id returns 404 for non-existent book', async () => {
    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/book/00000000-0000-0000-0000-000000000000`, {
        method: 'DELETE',
        headers: auth,
      });
      assert.strictEqual(response.status, 404);
    });
  });
});
