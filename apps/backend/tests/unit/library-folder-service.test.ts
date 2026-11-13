import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { BookId } from '../../src/features/book/book.js';
import { FolderNameTakenError } from '../../src/features/library-folder/folder.js';
import type { LibraryMembership } from '../../src/features/library-folder/library-membership.js';
import { LibraryFolderService } from '../../src/features/library-folder/library-folder-service.js';
import { UserId } from '../../src/features/user/user.js';
import { NotFoundError } from '../../src/utils/errors.js';
import { InMemoryFolderRepository } from '../helpers/in-memory-repositories.js';

const ANA = UserId.of('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
const BOB = UserId.of('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12');
const EMMA = BookId.of('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01');
const PIRANESI = BookId.of('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02');

/** Only the books put in `shelf` are in the reader's library. */
class FakeLibraryMembership implements LibraryMembership {
  readonly shelf = new Set<string>();

  async contains(userId: UserId, bookId: BookId): Promise<boolean> {
    return this.shelf.has(`${userId.value}:${bookId.value}`);
  }
}

describe('LibraryFolderService', () => {
  let folders: InMemoryFolderRepository;
  let library: FakeLibraryMembership;
  let service: LibraryFolderService;

  beforeEach(() => {
    folders = new InMemoryFolderRepository();
    library = new FakeLibraryMembership();
    library.shelf.add(`${ANA.value}:${EMMA.value}`);
    service = new LibraryFolderService(folders, library);
  });

  test('creates a folder for the reader and lists it with its book count', async () => {
    const created = await service.create({ userId: ANA.value, name: '  Autumn reading  ' });

    assert.equal(created.name, 'Autumn reading');
    assert.equal(created.count, 0);
    assert.deepEqual(
      (await service.list(ANA.value)).map((folder) => folder.name),
      ['Autumn reading'],
    );
    assert.deepEqual(await service.list(BOB.value), []);
  });

  test('rejects a duplicate name in any case with the exact message', async () => {
    await service.create({ userId: ANA.value, name: 'Autumn reading' });

    await assert.rejects(service.create({ userId: ANA.value, name: 'autumn READING' }), (error) => {
      assert.ok(error instanceof FolderNameTakenError);
      assert.equal(error.message, 'You already have a folder with this name');
      assert.equal(error.code, 'FOLDER_NAME_TAKEN');
      return true;
    });
  });

  test('two readers may use the same folder name', async () => {
    await service.create({ userId: ANA.value, name: 'Favorites' });
    const bob = await service.create({ userId: BOB.value, name: 'Favorites' });

    assert.equal(bob.name, 'Favorites');
  });

  test('renames a folder and refuses another folder name', async () => {
    const autumn = await service.create({ userId: ANA.value, name: 'Autumn' });
    await service.create({ userId: ANA.value, name: 'Winter' });

    const renamed = await service.rename({
      userId: ANA.value,
      folderId: autumn.id,
      name: 'Autumn reading',
    });
    assert.equal(renamed.name, 'Autumn reading');

    const recased = await service.rename({
      userId: ANA.value,
      folderId: autumn.id,
      name: 'AUTUMN READING',
    });
    assert.equal(recased.name, 'AUTUMN READING');

    await assert.rejects(
      service.rename({ userId: ANA.value, folderId: autumn.id, name: 'winter' }),
      FolderNameTakenError,
    );
  });

  test('deleting a folder keeps the books in the library', async () => {
    const autumn = await service.create({ userId: ANA.value, name: 'Autumn' });
    await service.addBook({ userId: ANA.value, folderId: autumn.id, bookId: EMMA.value });

    await service.remove({ userId: ANA.value, folderId: autumn.id });

    assert.deepEqual(await service.list(ANA.value), []);
    assert.equal(await library.contains(ANA, EMMA), true);
  });

  test('a book can be in several folders, and adding it twice is a no-op', async () => {
    const autumn = await service.create({ userId: ANA.value, name: 'Autumn' });
    const favourites = await service.create({ userId: ANA.value, name: 'Favourites' });

    await service.addBook({ userId: ANA.value, folderId: autumn.id, bookId: EMMA.value });
    await service.addBook({ userId: ANA.value, folderId: autumn.id, bookId: EMMA.value });
    await service.addBook({ userId: ANA.value, folderId: favourites.id, bookId: EMMA.value });

    const counts = (await service.list(ANA.value)).map((folder) => folder.count);
    assert.deepEqual(counts, [1, 1]);
  });

  test('a book outside the library cannot be added to a folder', async () => {
    const autumn = await service.create({ userId: ANA.value, name: 'Autumn' });

    await assert.rejects(
      service.addBook({ userId: ANA.value, folderId: autumn.id, bookId: PIRANESI.value }),
      NotFoundError,
    );
  });

  test('removes a book from one folder without touching the others', async () => {
    const autumn = await service.create({ userId: ANA.value, name: 'Autumn' });
    const favourites = await service.create({ userId: ANA.value, name: 'Favourites' });
    await service.addBook({ userId: ANA.value, folderId: autumn.id, bookId: EMMA.value });
    await service.addBook({ userId: ANA.value, folderId: favourites.id, bookId: EMMA.value });

    await service.removeBook({ userId: ANA.value, folderId: autumn.id, bookId: EMMA.value });

    const counts = (await service.list(ANA.value)).map((folder) => folder.count);
    assert.deepEqual(counts, [0, 1]);
  });

  test('another reader cannot see or change a folder', async () => {
    const autumn = await service.create({ userId: ANA.value, name: 'Autumn' });

    for (const action of [
      () => service.rename({ userId: BOB.value, folderId: autumn.id, name: 'Mine' }),
      () => service.remove({ userId: BOB.value, folderId: autumn.id }),
      () => service.addBook({ userId: BOB.value, folderId: autumn.id, bookId: EMMA.value }),
    ]) {
      await assert.rejects(action(), NotFoundError);
    }
  });
});
