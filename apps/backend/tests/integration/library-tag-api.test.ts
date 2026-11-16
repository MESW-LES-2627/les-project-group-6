// @req F-LIB-04
import { after, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { createDb } from '../../src/database/pool.js';
import { Book } from '../../src/features/book/book.js';
import { DrizzleBookRepository } from '../../src/features/book/book-repository.js';
import { DrizzleTagRepository } from '../../src/features/library-tag/tag-repository.js';
import { DrizzleLibraryQuery } from '../../src/features/library/library-query.js';
import { DrizzleReadingStatusRepository } from '../../src/features/reading-status/reading-status-repository.js';
import { DrizzleUserRepository } from '../../src/features/user/user-repository.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { authHeader, FakeAuthProvider } from '../helpers/auth.js';
import { createTestPool, truncateTables } from '../helpers/test-db.js';
import { withApp } from '../helpers/http.js';

const ANA = 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a61';
const BOB = 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a62';

interface TagBody {
  id: string;
  name: string;
  count: number;
}

interface LibraryItemBody {
  id: string;
  book: { id: string };
  status: string;
  tagIds: string[];
}

describe('Library tag API', () => {
  const pool = createTestPool();
  const db = createDb(pool);
  const bookRepository = new DrizzleBookRepository(db);
  const readingStatusRepository = new DrizzleReadingStatusRepository(db);
  const tagRepository = new DrizzleTagRepository(db);
  const userRepository = new DrizzleUserRepository(db);
  const app = createApp({
    authProvider: new FakeAuthProvider(),
    userRepository,
    bookRepository,
    readingStatusRepository,
    tagRepository,
    libraryQuery: new DrizzleLibraryQuery(db),
  });
  let book: Book;

  const send = (url: string, method: string, path: string, body?: object, as = ANA) =>
    fetch(`${url}${path}`, {
      method,
      headers: { ...authHeader(as), 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  const tag = async (url: string, name: string, as = ANA) => {
    const response = await send(
      url,
      'POST',
      `/me/library/books/${book.id.value}/tags`,
      { name },
      as,
    );
    return { response, tag: (await response.json()) as TagBody };
  };

  const listTags = async (url: string, as = ANA) =>
    (await (await send(url, 'GET', '/me/library/tags', undefined, as)).json()) as TagBody[];

  const library = async (url: string) =>
    (await (await send(url, 'GET', '/me/library')).json()) as LibraryItemBody[];

  const addToShelf = (url: string, as = ANA) =>
    send(url, 'PUT', '/library/' + book.id.value, { status: 'in-progress', currentPage: 12 }, as);

  beforeEach(async () => {
    await truncateTables(pool, ['users', 'books', 'reading_status', 'user_tags']);
    await userRepository.save(
      User.register({
        id: UserId.of(ANA),
        email: Email.of('ana@example.com'),
        username: Username.of('ana_tag'),
        displayName: 'Ana',
      }),
    );
    await userRepository.save(
      User.register({
        id: UserId.of(BOB),
        email: Email.of('bob@example.com'),
        username: Username.of('bob_tag'),
        displayName: 'Bob',
      }),
    );
    book = Book.create({ title: 'Circe', pageCount: 393 });
    await bookRepository.save(book);
  });

  after(async () => {
    await truncateTables(pool, ['users', 'books', 'reading_status', 'user_tags']);
    await pool.end();
  });

  test('tags a book and lists the tag with its count for the reader only', async () => {
    await withApp(app, async (url) => {
      await addToShelf(url);
      const { response, tag: audiobook } = await tag(url, '  Audiobook ');
      assert.equal(response.status, 200);
      assert.equal(audiobook.name, 'audiobook');
      assert.equal(audiobook.count, 1);

      assert.deepEqual(await listTags(url), [audiobook]);
      assert.deepEqual(await listTags(url, BOB), []);
      assert.deepEqual((await library(url))[0]!.tagIds, [audiobook.id]);
    });
  });

  test('a book keeps several tags and the same name is reused', async () => {
    await withApp(app, async (url) => {
      await addToShelf(url);
      const borrowed = (await tag(url, 'borrowed')).tag;
      const reread = (await tag(url, 'reread')).tag;
      const again = (await tag(url, 'BORROWED')).tag;

      assert.equal(again.id, borrowed.id);
      assert.equal(again.count, 1);
      assert.deepEqual((await library(url))[0]!.tagIds, [borrowed.id, reread.id]);
    });
  });

  test('removing a tag keeps the book and drops the unused tag', async () => {
    await withApp(app, async (url) => {
      await addToShelf(url);
      const borrowed = (await tag(url, 'borrowed')).tag;

      const removed = await send(
        url,
        'DELETE',
        `/me/library/books/${book.id.value}/tags/${borrowed.id}`,
      );
      assert.equal(removed.status, 204);
      assert.deepEqual(await listTags(url), []);
      const items = await library(url);
      assert.equal(items.length, 1);
      assert.deepEqual(items[0]!.tagIds, []);
    });
  });

  test('a book outside the library cannot be tagged', async () => {
    await withApp(app, async (url) => {
      assert.equal((await tag(url, 'borrowed')).response.status, 404);
    });
  });

  test('another reader cannot remove a tag', async () => {
    await withApp(app, async (url) => {
      await addToShelf(url);
      const borrowed = (await tag(url, 'borrowed')).tag;

      const response = await send(
        url,
        'DELETE',
        `/me/library/books/${book.id.value}/tags/${borrowed.id}`,
        undefined,
        BOB,
      );
      assert.equal(response.status, 404);
    });
  });

  test('rejects an empty name with 400 and needs a token', async () => {
    await withApp(app, async (url) => {
      await addToShelf(url);
      assert.equal((await tag(url, '   ')).response.status, 400);
      assert.equal((await fetch(`${url}/me/library/tags`)).status, 401);
    });
  });
});
