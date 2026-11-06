import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { Book } from '../../src/features/book/book.js';
import { BookService } from '../../src/features/book/book-service.js';
import { OpenLibraryService } from '../../src/features/book/open-library-service.js';
import { InMemoryBookRepository } from '../helpers/in-memory-repositories.js';

describe('BookService - importFromOpenLibrary', () => {
  let books: InMemoryBookRepository;
  let service: BookService;

  beforeEach(() => {
    books = new InMemoryBookRepository();
  });

  test('imports new books from OpenLibrary and saves them with author', async () => {
    const fakeOpenLibrary = {
      search: async () => [
        {
          title: 'Dune',
          authorName: 'Frank Herbert',
          isbn13: '9780441172719',
          pageCount: 608,
          coverUrl: 'https://covers.openlibrary.org/b/olid/OL32848840M-L.jpg',
          description: 'Sci-fi masterpiece',
        },
      ],
    } as unknown as OpenLibraryService;

    service = new BookService(books, fakeOpenLibrary);
    const imported = await service.importFromOpenLibrary('dune');

    assert.strictEqual(imported.length, 1);
    assert.strictEqual(imported[0]?.title.value, 'Dune');
    assert.strictEqual(
      imported[0]?.coverUrl,
      'https://covers.openlibrary.org/b/olid/OL32848840M-L.jpg',
    );

    const inRepo = await books.findByTitleAndAuthor('Dune', 'Frank Herbert');
    assert.ok(inRepo);
    assert.strictEqual(inRepo.id.value, imported[0]?.id.value);
  });

  test('does not duplicate books that already exist in database by title and author', async () => {
    const existing = Book.create({
      title: 'Dune',
      pageCount: 608,
    });
    await books.save(existing, 'Frank Herbert');

    const fakeOpenLibrary = {
      search: async () => [
        {
          title: 'Dune',
          authorName: 'Frank Herbert',
          isbn13: '9780441172719',
          pageCount: 608,
          coverUrl: 'https://covers.openlibrary.org/b/olid/OL32848840M-L.jpg',
          description: 'Sci-fi masterpiece',
        },
        {
          title: 'Dune Messiah',
          authorName: 'Frank Herbert',
          isbn13: null,
          pageCount: 300,
          coverUrl: null,
          description: null,
        },
      ],
    } as unknown as OpenLibraryService;

    service = new BookService(books, fakeOpenLibrary);
    const imported = await service.importFromOpenLibrary('dune');

    assert.strictEqual(imported.length, 2);
    assert.strictEqual(imported[0]?.id.value, existing.id.value);
    assert.notStrictEqual(imported[1]?.id.value, existing.id.value);
    assert.strictEqual(imported[1]?.title.value, 'Dune Messiah');
  });

  test('returns empty array when openLibrary is not configured', async () => {
    service = new BookService(books);
    const imported = await service.importFromOpenLibrary('test');
    assert.deepStrictEqual(imported, []);
  });
});
