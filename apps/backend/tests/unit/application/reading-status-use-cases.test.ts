import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { SetReadingStatusUseCase } from '../../../src/application/reading/set-reading-status.js';
import { UpdateReadingStatusUseCase } from '../../../src/application/reading/update-reading-status.js';
import { Book } from '../../../src/domain/book/book.js';
import { InvalidPageProgressError } from '../../../src/domain/reading/page-progress.js';
import { InvalidReadingTransitionError } from '../../../src/domain/reading/reading-state.js';
import { ProgressNotAllowedError } from '../../../src/domain/reading/reading-status.js';
import { NotFoundError } from '../../../src/domain/shared/domain-error.js';
import {
  InMemoryBookRepository,
  InMemoryReadingStatusRepository,
} from '../../helpers/in-memory-repositories.js';

const USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

describe('Reading status use cases', () => {
  let books: InMemoryBookRepository;
  let statuses: InMemoryReadingStatusRepository;
  let setStatus: SetReadingStatusUseCase;
  let updateStatus: UpdateReadingStatusUseCase;
  let book: Book;

  beforeEach(async () => {
    books = new InMemoryBookRepository();
    statuses = new InMemoryReadingStatusRepository();
    setStatus = new SetReadingStatusUseCase(statuses, books);
    updateStatus = new UpdateReadingStatusUseCase(statuses, books);
    book = Book.create({ title: 'Dune', pageCount: 688 });
    await books.save(book);
  });

  test('set creates the entry once and then updates it', async () => {
    const first = await setStatus.execute({
      userId: USER_ID,
      bookId: book.id.value,
      status: 'in-progress',
      currentPage: 10,
    });
    const second = await setStatus.execute({
      userId: USER_ID,
      bookId: book.id.value,
      status: 'in-progress',
      currentPage: 20,
    });
    assert.ok(first.id.equals(second.id));
    assert.strictEqual(second.progress.page, 20);
  });

  test('set ignores the page when the target status does not track progress', async () => {
    const entry = await setStatus.execute({
      userId: USER_ID,
      bookId: book.id.value,
      status: 'finished',
      currentPage: 10,
    });
    assert.strictEqual(entry.progress.page, 688);
  });

  test('set fails for an unknown book', async () => {
    await assert.rejects(
      setStatus.execute({
        userId: USER_ID,
        bookId: '00000000-0000-0000-0000-000000000000',
        status: 'in-progress',
      }),
      NotFoundError,
    );
  });

  test('update records progress bounded by the page count', async () => {
    const entry = await setStatus.execute({
      userId: USER_ID,
      bookId: book.id.value,
      status: 'in-progress',
    });
    const updated = await updateStatus.execute({ id: entry.id.value, currentPage: 300 });
    assert.strictEqual(updated.progress.page, 300);

    await assert.rejects(
      updateStatus.execute({ id: entry.id.value, currentPage: 689 }),
      InvalidPageProgressError,
    );
  });

  test('update enforces the reading lifecycle', async () => {
    const entry = await setStatus.execute({
      userId: USER_ID,
      bookId: book.id.value,
      status: 'not-started',
    });
    await assert.rejects(
      updateStatus.execute({ id: entry.id.value, status: 'did-not-finish' }),
      InvalidReadingTransitionError,
    );
    await assert.rejects(
      updateStatus.execute({ userId: USER_ID, bookId: book.id.value, currentPage: 5 }),
      ProgressNotAllowedError,
    );
  });

  test('update fails when the entry does not exist', async () => {
    await assert.rejects(
      updateStatus.execute({ id: '00000000-0000-0000-0000-000000000000', status: 'finished' }),
      NotFoundError,
    );
  });
});
