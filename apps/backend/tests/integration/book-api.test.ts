// @req F-EXP-01 F-BOOK-01 F-BOOK-02
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
          isCommunityAdded: false,
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
      // The flag is set by the server, whatever the client sends.
      assert.strictEqual(saved.isCommunityAdded, true);
    });
  });

  test('POST /book saves the authors so search finds the book by author', async () => {
    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/book`, {
        method: 'POST',
        headers: json,
        body: JSON.stringify({ title: "My grandmother's diary", authors: ['Rosa Pereira'] }),
      });
      assert.strictEqual(response.status, 201);
      const created = (await response.json()) as { id: string };

      const found = await bookRepository.search('Rosa Pereira', 10);
      assert.deepStrictEqual(
        found.map((b) => b.id.value),
        [created.id],
      );
    });
  });

  test('GET /book/:id and GET /book?q= return the authors of the book', async () => {
    await withApp(app, async (baseUrl) => {
      const created = await fetch(`${baseUrl}/book`, {
        method: 'POST',
        headers: json,
        body: JSON.stringify({ title: 'Good Omens', authors: ['Terry Pratchett', 'Neil Gaiman'] }),
      });
      const { id, authors } = (await created.json()) as { id: string; authors: string[] };
      assert.deepStrictEqual(authors, ['Neil Gaiman', 'Terry Pratchett']);

      const byId = (await (await fetch(`${baseUrl}/book/${id}`, { headers: auth })).json()) as {
        authors: string[];
      };
      assert.deepStrictEqual(byId.authors, ['Neil Gaiman', 'Terry Pratchett']);

      const search = (await (
        await fetch(`${baseUrl}/book?q=good%20omens`, { headers: auth })
      ).json()) as { authors: string[] }[];
      assert.deepStrictEqual(search[0]?.authors, ['Neil Gaiman', 'Terry Pratchett']);
    });
  });

  test('a book saved without authors returns an empty authors list', async () => {
    const book = Book.create({ title: 'Anonymous pamphlet' });
    await bookRepository.save(book);
    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/book/${book.id.value}`, { headers: auth });
      const data = (await response.json()) as { authors: string[] };
      assert.deepStrictEqual(data.authors, []);
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

  test('GET /book?q= finds books despite a typo', async () => {
    await bookRepository.save(Book.create({ title: "Harry Potter and the Philosopher's Stone" }));
    await bookRepository.save(Book.create({ title: 'Dune' }));

    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/book?q=${encodeURIComponent('harry potter')}`, {
        headers: auth,
      });
      assert.strictEqual(response.status, 200);

      const data = (await response.json()) as Array<{ title: string }>;
      assert.deepStrictEqual(
        data.map((b) => b.title),
        ["Harry Potter and the Philosopher's Stone"],
      );
    });
  });

  test('GET /book returns an empty list without a query', async () => {
    await bookRepository.save(Book.create({ title: 'Dune' }));

    await withApp(app, async (baseUrl) => {
      for (const path of ['/book', '/book?q=', '/book?q=%20%20']) {
        const response = await fetch(`${baseUrl}${path}`, { headers: auth });
        assert.strictEqual(response.status, 200);
        assert.deepStrictEqual(await response.json(), []);
      }
    });
  });

  test('GET /book?q= requires a session', async () => {
    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/book?q=dune`);
      assert.strictEqual(response.status, 401);
    });
  });

  test('GET /book/:id returns 404 when ID is not a valid UUID', async () => {
    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/book/not-a-valid-uuid`, { headers: auth });
      assert.strictEqual(response.status, 404);
    });
  });

  test('DELETE /book/:id is not exposed and leaves the book in the catalogue', async () => {
    const book = Book.create({ title: 'Shared Book' });
    await bookRepository.save(book);

    await withApp(app, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/book/${book.id}`, {
        method: 'DELETE',
        headers: auth,
      });
      assert.strictEqual(response.status, 404);
      assert.ok(await bookRepository.findById(book.id));
    });
  });
});
