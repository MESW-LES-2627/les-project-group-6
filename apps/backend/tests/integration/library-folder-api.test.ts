// @req F-LIB-03
import { after, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { createDb } from '../../src/database/pool.js';
import { Book } from '../../src/features/book/book.js';
import { DrizzleBookRepository } from '../../src/features/book/book-repository.js';
import { DrizzleFolderRepository } from '../../src/features/library-folder/folder-repository.js';
import { DrizzleLibraryQuery } from '../../src/features/library/library-query.js';
import { DrizzleReadingStatusRepository } from '../../src/features/reading-status/reading-status-repository.js';
import { DrizzleUserRepository } from '../../src/features/user/user-repository.js';
import { Email, User, UserId, Username } from '../../src/features/user/user.js';
import { authHeader, FakeAuthProvider } from '../helpers/auth.js';
import { createTestPool, truncateTables } from '../helpers/test-db.js';
import { withApp } from '../helpers/http.js';

const ANA = 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a61';
const BOB = 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a62';

interface FolderBody {
  id: string;
  name: string;
  count: number;
  createdAt: string;
  error?: string;
  code?: string;
}

interface LibraryItemBody {
  id: string;
  book: { id: string };
  status: string;
  folderIds: string[];
}

describe('Library folder API', () => {
  const pool = createTestPool();
  const db = createDb(pool);
  const bookRepository = new DrizzleBookRepository(db);
  const readingStatusRepository = new DrizzleReadingStatusRepository(db);
  const folderRepository = new DrizzleFolderRepository(db);
  const userRepository = new DrizzleUserRepository(db);
  const app = createApp({
    authProvider: new FakeAuthProvider(),
    userRepository,
    bookRepository,
    readingStatusRepository,
    folderRepository,
    libraryQuery: new DrizzleLibraryQuery(db),
  });
  let book: Book;

  const send = (url: string, method: string, path: string, body?: object, as = ANA) =>
    fetch(`${url}${path}`, {
      method,
      headers: { ...authHeader(as), 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  const createFolder = async (url: string, name: string, as = ANA) => {
    const response = await send(url, 'POST', '/me/library/folders', { name }, as);
    return { response, folder: (await response.json()) as FolderBody };
  };

  const addToShelf = (url: string, as = ANA) =>
    send(url, 'PUT', '/library/' + book.id.value, { status: 'in-progress', currentPage: 12 }, as);

  beforeEach(async () => {
    await truncateTables(pool, ['users', 'books', 'reading_status', 'lists']);
    await userRepository.save(
      User.register({
        id: UserId.of(ANA),
        email: Email.of('ana@example.com'),
        username: Username.of('ana_folder'),
        displayName: 'Ana',
      }),
    );
    await userRepository.save(
      User.register({
        id: UserId.of(BOB),
        email: Email.of('bob@example.com'),
        username: Username.of('bob_folder'),
        displayName: 'Bob',
      }),
    );
    book = Book.create({ title: 'Circe', pageCount: 393 });
    await bookRepository.save(book);
  });

  after(async () => {
    await truncateTables(pool, ['users', 'books', 'reading_status', 'lists']);
    await pool.end();
  });

  test('creates folders and lists them for the reader only', async () => {
    await withApp(app, async (url) => {
      const { response, folder } = await createFolder(url, '  Autumn reading  ');
      assert.equal(response.status, 201);
      assert.equal(folder.name, 'Autumn reading');
      assert.equal(folder.count, 0);

      const list = (await (await send(url, 'GET', '/me/library/folders')).json()) as FolderBody[];
      assert.deepEqual(
        list.map((item) => item.name),
        ['Autumn reading'],
      );
      const other = (await (
        await send(url, 'GET', '/me/library/folders', undefined, BOB)
      ).json()) as FolderBody[];
      assert.deepEqual(other, []);
    });
  });

  test('a duplicate name in any case answers 409 with the exact message', async () => {
    await withApp(app, async (url) => {
      await createFolder(url, 'Favorites');

      const { response, folder } = await createFolder(url, 'favorites');
      assert.equal(response.status, 409);
      assert.deepEqual(folder, {
        error: 'You already have a folder with this name',
        code: 'FOLDER_NAME_TAKEN',
      });
    });
  });

  test('renames and deletes a folder, keeping the books in the library', async () => {
    await withApp(app, async (url) => {
      await addToShelf(url);
      const { folder } = await createFolder(url, 'Autumn');
      await send(url, 'PUT', `/me/library/folders/${folder.id}/books/${book.id.value}`);

      const renamed = await send(url, 'PATCH', `/me/library/folders/${folder.id}`, {
        name: 'Autumn reading',
      });
      assert.equal(renamed.status, 200);
      assert.equal(((await renamed.json()) as FolderBody).name, 'Autumn reading');

      const deleted = await send(url, 'DELETE', `/me/library/folders/${folder.id}`);
      assert.equal(deleted.status, 204);

      const list = (await (await send(url, 'GET', '/me/library/folders')).json()) as FolderBody[];
      assert.deepEqual(list, []);
      const library = (await (await send(url, 'GET', '/me/library')).json()) as LibraryItemBody[];
      assert.equal(library.length, 1);
      assert.deepEqual(library[0]!.folderIds, []);
    });
  });

  test('a book can sit in several folders and keeps its reading status', async () => {
    await withApp(app, async (url) => {
      await addToShelf(url);
      const autumn = (await createFolder(url, 'Autumn')).folder;
      const favourites = (await createFolder(url, 'Favourites')).folder;

      for (const folder of [autumn, favourites]) {
        const response = await send(
          url,
          'PUT',
          `/me/library/folders/${folder.id}/books/${book.id.value}`,
        );
        assert.equal(response.status, 204);
      }

      const library = (await (await send(url, 'GET', '/me/library')).json()) as LibraryItemBody[];
      assert.equal(library[0]!.status, 'in-progress');
      assert.deepEqual([...library[0]!.folderIds].sort(), [autumn.id, favourites.id].sort());

      await send(url, 'DELETE', `/me/library/folders/${autumn.id}/books/${book.id.value}`);
      const afterRemoval = (await (
        await send(url, 'GET', '/me/library')
      ).json()) as LibraryItemBody[];
      assert.deepEqual(afterRemoval[0]!.folderIds, [favourites.id]);
      assert.equal(afterRemoval[0]!.status, 'in-progress');
    });
  });

  test('a book outside the library cannot be added to a folder', async () => {
    await withApp(app, async (url) => {
      const { folder } = await createFolder(url, 'Autumn');

      const response = await send(
        url,
        'PUT',
        `/me/library/folders/${folder.id}/books/${book.id.value}`,
      );
      assert.equal(response.status, 404);
    });
  });

  test('another reader cannot see or change a folder', async () => {
    await withApp(app, async (url) => {
      const { folder } = await createFolder(url, 'Autumn');

      const rename = await send(
        url,
        'PATCH',
        `/me/library/folders/${folder.id}`,
        { name: 'Mine' },
        BOB,
      );
      assert.equal(rename.status, 404);
      const remove = await send(url, 'DELETE', `/me/library/folders/${folder.id}`, undefined, BOB);
      assert.equal(remove.status, 404);
    });
  });

  test('rejects an empty name with 400 and needs a token', async () => {
    await withApp(app, async (url) => {
      const { response } = await createFolder(url, '   ');
      assert.equal(response.status, 400);

      const anonymous = await fetch(`${url}/me/library/folders`);
      assert.equal(anonymous.status, 401);
    });
  });
});
