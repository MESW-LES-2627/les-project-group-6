import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { BookId } from '../../src/features/book/book.js';
import type { LibraryMembership } from '../../src/features/library-folder/library-membership.js';
import { LibraryTagService } from '../../src/features/library-tag/library-tag-service.js';
import { InvalidTagNameError } from '../../src/features/library-tag/tag.js';
import { UserId } from '../../src/features/user/user.js';
import { NotFoundError } from '../../src/utils/errors.js';
import { InMemoryTagRepository } from '../helpers/in-memory-repositories.js';

const ANA = UserId.of('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
const BOB = UserId.of('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12');
const DUNE = BookId.of('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01');
const HYPERION = BookId.of('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02');

class FakeLibraryMembership implements LibraryMembership {
  readonly shelf = new Set<string>();

  async contains(userId: UserId, bookId: BookId): Promise<boolean> {
    return this.shelf.has(`${userId.value}:${bookId.value}`);
  }
}

describe('LibraryTagService', () => {
  let tags: InMemoryTagRepository;
  let service: LibraryTagService;

  beforeEach(() => {
    tags = new InMemoryTagRepository();
    const library = new FakeLibraryMembership();
    for (const book of [DUNE, HYPERION]) library.shelf.add(`${ANA.value}:${book.value}`);
    service = new LibraryTagService(tags, library);
  });

  test('tags a book, creating the tag on first use', async () => {
    const tag = await service.tagBook({
      userId: ANA.value,
      bookId: DUNE.value,
      name: ' Audiobook ',
    });

    assert.equal(tag.name, 'audiobook');
    assert.equal(tag.count, 1);
    assert.deepEqual(await service.list(ANA.value), [tag]);
  });

  test('reuses a tag whatever its case and does not double-count a book', async () => {
    const first = await service.tagBook({
      userId: ANA.value,
      bookId: DUNE.value,
      name: 'audiobook',
    });
    await service.tagBook({ userId: ANA.value, bookId: DUNE.value, name: 'audiobook' });
    const second = await service.tagBook({
      userId: ANA.value,
      bookId: HYPERION.value,
      name: 'AudioBook',
    });

    assert.equal(second.id, first.id);
    assert.equal(second.count, 2);
  });

  test('a book can carry several tags', async () => {
    await service.tagBook({ userId: ANA.value, bookId: DUNE.value, name: 'borrowed' });
    await service.tagBook({ userId: ANA.value, bookId: DUNE.value, name: 'reread' });

    assert.deepEqual(
      (await service.list(ANA.value)).map((tag) => tag.name),
      ['borrowed', 'reread'],
    );
  });

  test('removing the last book deletes the tag', async () => {
    const tag = await service.tagBook({ userId: ANA.value, bookId: DUNE.value, name: 'borrowed' });
    await service.tagBook({ userId: ANA.value, bookId: HYPERION.value, name: 'borrowed' });

    await service.untagBook({ userId: ANA.value, bookId: DUNE.value, tagId: tag.id });
    assert.equal((await service.list(ANA.value))[0]?.count, 1);

    await service.untagBook({ userId: ANA.value, bookId: HYPERION.value, tagId: tag.id });
    assert.deepEqual(await service.list(ANA.value), []);
  });

  test('only books in the library can be tagged', async () => {
    await assert.rejects(
      service.tagBook({ userId: BOB.value, bookId: DUNE.value, name: 'borrowed' }),
      NotFoundError,
    );
  });

  test("another reader's tag is not found", async () => {
    const tag = await service.tagBook({ userId: ANA.value, bookId: DUNE.value, name: 'borrowed' });

    await assert.rejects(
      service.untagBook({ userId: BOB.value, bookId: DUNE.value, tagId: tag.id }),
      NotFoundError,
    );
    assert.deepEqual(await service.list(BOB.value), []);
  });

  test('rejects empty and too long names', async () => {
    for (const name of ['   ', 'x'.repeat(41), 42]) {
      await assert.rejects(
        service.tagBook({ userId: ANA.value, bookId: DUNE.value, name }),
        InvalidTagNameError,
      );
    }
  });
});
