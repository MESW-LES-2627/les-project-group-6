# Open Library Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the local book search finds fewer than 5 books, `GET /book?q=` asks Open Library, imports the hits into `books` and returns them with the local ones.

**Architecture:** A `BookCatalog` port with an `OpenLibraryCatalog` adapter (native `fetch`, 3 s timeout, results kept in an `lru-cache` behind a `QueryCache` interface). `BookService.search` calls it only when local results are thin and imports each hit through two new repository methods, `findByIsbn` and `saveWithAuthors`. Spec: [2026-11-11-open-library-fallback-design.md](../specs/2026-11-11-open-library-fallback-design.md).

**Tech Stack:** Node 24, TypeScript, Express 5, Drizzle ORM on Postgres, `node:test` via `tsx --test`, `lru-cache` v11.

All commands run from `apps/backend`. Unit tests need nothing; integration tests need the local test database (`DATABASE_URL_TEST`, see `.env.example`).

---

## File map

| File | Change |
|---|---|
| `src/features/book/book-catalog.ts` | Create: `CatalogBook`, `BookCatalog` port |
| `src/features/book/query-cache.ts` | Create: `QueryCache<V>` interface |
| `src/features/book/open-library-catalog.ts` | Create: adapter |
| `src/features/book/book-repository.ts` | Modify: `findByIsbn`, `saveWithAuthors` on interface and Drizzle class |
| `tests/helpers/in-memory-repositories.ts` | Modify: same two methods on `InMemoryBookRepository` |
| `src/features/book/book-service.ts` | Modify: optional catalog, fallback and import |
| `src/api/router.ts`, `src/server.ts` | Modify: wire `bookCatalog` |
| `src/config/env.ts`, `.env.example` | Modify: `OPEN_LIBRARY_URL` |
| `tests/unit/open-library-catalog.test.ts` | Create |
| `tests/unit/book-service.test.ts` | Modify |
| `tests/integration/book-repository.test.ts` | Modify |
| `docs/architecture/api_routes.md`, `docs/iterations/2/log.md`, `docs/iterations/2/LLM_LOG.md` | Modify |

---

### Task 1: Repository can find by ISBN and import with authors

**Files:**
- Modify: `src/features/book/book-repository.ts`
- Modify: `tests/helpers/in-memory-repositories.ts:53-93`
- Test: `tests/integration/book-repository.test.ts`

- [ ] **Step 1: Write the failing integration tests**

Add inside the `describe` of `tests/integration/book-repository.test.ts`, after the existing tests:

```ts
  test('findByIsbn returns the book with that ISBN-13, or null', async () => {
    const dune = Book.create({ title: 'Dune', isbn13: '9780441172719' });
    await repo.save(dune);

    assert.equal((await repo.findByIsbn(Isbn13.of('9780441172719')))?.id.value, dune.id.value);
    assert.equal(await repo.findByIsbn(Isbn13.of('9780451524935')), null);
  });

  test('saveWithAuthors links the authors, reusing one that already exists', async () => {
    const first = Book.create({ title: 'Good Omens', isbn13: '9780060853983' });
    const saved = await repo.saveWithAuthors(first, ['Terry Pratchett', 'Neil Gaiman']);
    const second = Book.create({ title: 'Mort', isbn13: '9780062225719' });
    await repo.saveWithAuthors(second, ['Terry Pratchett']);

    assert.equal(saved.id.value, first.id.value);
    const { rows: authorRows } = await pool.query('SELECT name FROM authors ORDER BY name');
    assert.deepEqual(
      authorRows.map((r) => r.name),
      ['Neil Gaiman', 'Terry Pratchett'],
    );
    assert.deepEqual(titles(await repo.search('pratchett', 10)), ['Good Omens', 'Mort']);
  });

  test('saveWithAuthors returns the existing book when the ISBN-13 is taken', async () => {
    const existing = Book.create({ title: 'Dune', isbn13: '9780441172719' });
    await repo.save(existing);

    const winner = await repo.saveWithAuthors(
      Book.create({ title: 'Dune (copy)', isbn13: '9780441172719' }),
      ['Frank Herbert'],
    );

    assert.equal(winner.id.value, existing.id.value);
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM books');
    assert.equal(rows[0].n, 1);
  });
```

Change the import line `import { Book, BookId } from '../../src/features/book/book.js';` to:

```ts
import { Book, BookId, Isbn13 } from '../../src/features/book/book.js';
```

Before writing these tests, check the two ISBNs `9780060853983` and `9780062225719` with `Isbn13.of` in a quick `tsx -e`. If one fails the check digit, replace it with another valid ISBN-13 (for example `9780140449136`).

- [ ] **Step 2: Run them to see them fail**

Run: `npx tsx --test tests/integration/book-repository.test.ts`
Expected: FAIL, `repo.findByIsbn is not a function` (and a type error for `saveWithAuthors`).

- [ ] **Step 3: Add the methods to the interface and the Drizzle class**

In `src/features/book/book-repository.ts`, add to `IBookRepository` after `findByIds`:

```ts
  findByIsbn(isbn: Isbn13): Promise<Book | null>;
  /**
   * Saves a new book with its authors (an author with the same name is reused). If another
   * book already has this ISBN-13, nothing is written and that book is returned instead.
   */
  saveWithAuthors(book: Book, authorNames: readonly string[]): Promise<Book>;
```

Add to `DrizzleBookRepository`, after `findByIds`:

```ts
  async findByIsbn(isbn: Isbn13): Promise<Book | null> {
    const rows = await this.db.select().from(books).where(eq(books.isbn13, isbn.value)).limit(1);
    const row = rows[0];
    return row ? toDomain(row) : null;
  }

  async saveWithAuthors(book: Book, authorNames: readonly string[]): Promise<Book> {
    return this.db.transaction(async (tx) => {
      // ON CONFLICT on the ISBN-13 makes two searches importing the same book at once safe.
      const inserted = await tx
        .insert(books)
        .values(toRow(book))
        .onConflictDoNothing({ target: books.isbn13 })
        .returning();
      if (inserted.length === 0) {
        const existing = await tx
          .select()
          .from(books)
          .where(eq(books.isbn13, book.isbn13!.value))
          .limit(1);
        return toDomain(existing[0]!);
      }

      for (const name of new Set(authorNames.map((n) => n.trim()).filter(Boolean))) {
        // authors.name is not unique, so look it up first.
        const found = await tx
          .select({ id: authors.id })
          .from(authors)
          .where(eq(authors.name, name))
          .limit(1);
        const authorId =
          found[0]?.id ??
          (await tx.insert(authors).values({ name }).returning({ id: authors.id }))[0]!.id;
        await tx
          .insert(bookAuthors)
          .values({ bookId: book.id.value, authorId })
          .onConflictDoNothing();
      }
      return toDomain(inserted[0]!);
    });
  }
```

`saveWithAuthors` is only called for books with an ISBN-13 (the catalogue drops the others), which is why `book.isbn13!` is safe.

- [ ] **Step 4: Add the same methods to the in-memory repository**

In `tests/helpers/in-memory-repositories.ts`, inside `InMemoryBookRepository` after `findByIds`:

```ts
  async findByIsbn(isbn: Isbn13): Promise<Book | null> {
    return [...this.books.values()].find((b) => b.isbn13?.equals(isbn)) ?? null;
  }

  // Authors are ignored: Book has none, and search here is title-only.
  async saveWithAuthors(book: Book): Promise<Book> {
    const existing = book.isbn13 ? await this.findByIsbn(book.isbn13) : null;
    if (existing) return existing;
    await this.save(book);
    return book;
  }
```

`Isbn13` is already imported in that file (it is used by `search`).

- [ ] **Step 5: Run the tests and typecheck**

Run: `npx tsx --test tests/integration/book-repository.test.ts && npm run typecheck`
Expected: all tests PASS, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/book/book-repository.ts tests/helpers/in-memory-repositories.ts tests/integration/book-repository.test.ts
git commit -m "feat: find books by isbn and import them with authors"
```

---

### Task 2: Catalog port, cache interface and Open Library adapter

**Files:**
- Create: `src/features/book/book-catalog.ts`
- Create: `src/features/book/query-cache.ts`
- Create: `src/features/book/open-library-catalog.ts`
- Test: `tests/unit/open-library-catalog.test.ts`

- [ ] **Step 1: Install lru-cache**

Run: `npm install lru-cache@^11`
Expected: `package.json` gains `"lru-cache": "^11.x.x"` under `dependencies`.

- [ ] **Step 2: Create the port and the cache interface**

`src/features/book/book-catalog.ts`:

```ts
/** A book found in an outside catalogue, already checked: the ISBN-13 is valid. */
export interface CatalogBook {
  title: string;
  isbn13: string;
  authors: string[];
  description: string | null;
  pageCount: number | null;
  coverUrl: string | null;
}

/**
 * Port to an outside book catalogue (Open Library today). Never throws: when the
 * catalogue is down or slow it answers with no books.
 */
export interface BookCatalog {
  search(query: string, limit: number): Promise<CatalogBook[]>;
}
```

`src/features/book/query-cache.ts`:

```ts
/**
 * What the catalogue needs from a cache. `LRUCache` from lru-cache already has this
 * shape; a Redis or Valkey class with the same two methods can replace it when the
 * backend runs on more than one instance.
 */
export interface QueryCache<V> {
  get(key: string): V | undefined;
  set(key: string, value: V): unknown;
}
```

- [ ] **Step 3: Write the failing adapter tests**

`tests/unit/open-library-catalog.test.ts`:

```ts
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { OpenLibraryCatalog } from '../../src/features/book/open-library-catalog.js';

const DUNE_DOC = {
  title: 'Dune',
  author_name: ['Frank Herbert'],
  isbn: ['0441172717', '9780441172719'],
  number_of_pages_median: 412,
  cover_i: 11481354,
  first_sentence: ['In the week before their departure to Arrakis...'],
};

function fakeFetch(body: unknown, status = 200) {
  const calls: string[] = [];
  const fn = async (url: string | URL | Request) => {
    calls.push(String(url));
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
  };
  return { fn: fn as typeof fetch, calls };
}

const quiet = { warn: () => {} };

describe('OpenLibraryCatalog', () => {
  test('maps a search result to a catalogue book', async () => {
    const { fn, calls } = fakeFetch({ docs: [DUNE_DOC] });
    const catalog = new OpenLibraryCatalog({ baseUrl: 'https://ol.test', fetchFn: fn, logger: quiet });

    const found = await catalog.search('dune', 20);

    assert.deepEqual(found, [
      {
        title: 'Dune',
        isbn13: '9780441172719',
        authors: ['Frank Herbert'],
        description: 'In the week before their departure to Arrakis...',
        pageCount: 412,
        coverUrl: 'https://covers.openlibrary.org/b/id/11481354-L.jpg',
      },
    ]);
    assert.match(calls[0]!, /^https:\/\/ol\.test\/search\.json\?q=dune&limit=20&fields=/);
  });

  test('skips results without a valid ISBN-13 and fills missing fields with null', async () => {
    const { fn } = fakeFetch({
      docs: [
        { title: 'No ISBN' },
        { title: 'Bad check digit', isbn: ['9780441172710'] },
        { title: 'Bare', isbn: ['9780441172719'] },
      ],
    });
    const catalog = new OpenLibraryCatalog({ fetchFn: fn, logger: quiet });

    assert.deepEqual(await catalog.search('x', 20), [
      { title: 'Bare', isbn13: '9780441172719', authors: [], description: null, pageCount: null, coverUrl: null },
    ]);
  });

  test('answers with no books when Open Library fails', async () => {
    const failing = [
      fakeFetch({}, 500).fn,
      fakeFetch('not json').fn,
      (async () => {
        throw new DOMException('timed out', 'TimeoutError');
      }) as typeof fetch,
    ];
    for (const fetchFn of failing) {
      const catalog = new OpenLibraryCatalog({ fetchFn, logger: quiet });
      assert.deepEqual(await catalog.search('dune', 20), []);
    }
  });

  test('serves the same query from the cache, ignoring case and spaces', async () => {
    const { fn, calls } = fakeFetch({ docs: [DUNE_DOC] });
    const catalog = new OpenLibraryCatalog({ fetchFn: fn, logger: quiet });

    await catalog.search('Dune', 20);
    const again = await catalog.search('  dune ', 20);

    assert.equal(calls.length, 1);
    assert.equal(again[0]!.title, 'Dune');
  });

  test('does not cache a failure', async () => {
    const { fn, calls } = fakeFetch({}, 500);
    const catalog = new OpenLibraryCatalog({ fetchFn: fn, logger: quiet });

    await catalog.search('dune', 20);
    await catalog.search('dune', 20);

    assert.equal(calls.length, 2);
  });
});
```

- [ ] **Step 4: Run them to see them fail**

Run: `npx tsx --test tests/unit/open-library-catalog.test.ts`
Expected: FAIL, cannot find module `open-library-catalog.js`.

- [ ] **Step 5: Write the adapter**

`src/features/book/open-library-catalog.ts`:

```ts
import { LRUCache } from 'lru-cache';
import { Isbn13 } from './book.js';
import type { BookCatalog, CatalogBook } from './book-catalog.js';
import type { QueryCache } from './query-cache.js';

const FIELDS = 'title,author_name,isbn,number_of_pages_median,cover_i,first_sentence';
const ONE_HOUR_MS = 60 * 60 * 1000;

interface OpenLibraryDoc {
  title?: unknown;
  author_name?: unknown;
  isbn?: unknown;
  number_of_pages_median?: unknown;
  cover_i?: unknown;
  first_sentence?: unknown;
}

export interface OpenLibraryCatalogOptions {
  baseUrl?: string;
  timeoutMs?: number;
  cache?: QueryCache<CatalogBook[]>;
  fetchFn?: typeof fetch;
  logger?: Pick<Console, 'warn'>;
}

/** Adapter: book search through https://openlibrary.org/dev/docs/api/search. */
export class OpenLibraryCatalog implements BookCatalog {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly cache: QueryCache<CatalogBook[]>;
  private readonly fetchFn: typeof fetch;
  private readonly logger: Pick<Console, 'warn'>;

  constructor(options: OpenLibraryCatalogOptions = {}) {
    this.baseUrl = (options.baseUrl ?? 'https://openlibrary.org').replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? 3000;
    this.cache = options.cache ?? new LRUCache<string, CatalogBook[]>({ max: 500, ttl: ONE_HOUR_MS });
    this.fetchFn = options.fetchFn ?? fetch;
    this.logger = options.logger ?? console;
  }

  async search(query: string, limit: number): Promise<CatalogBook[]> {
    const key = `${limit}:${query.trim().toLowerCase()}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({ q: query.trim(), limit: String(limit), fields: FIELDS });
      const response = await this.fetchFn(`${this.baseUrl}/search.json?${params}`, {
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.json()) as { docs?: OpenLibraryDoc[] };
      const found = (body.docs ?? []).flatMap((doc) => toCatalogBook(doc) ?? []);
      this.cache.set(key, found);
      return found;
    } catch (error) {
      // Failures are not cached, so the next search tries again.
      this.logger.warn(`Open Library search failed for "${query}": ${String(error)}`);
      return [];
    }
  }
}

function toCatalogBook(doc: OpenLibraryDoc): CatalogBook | null {
  const title = typeof doc.title === 'string' ? doc.title.trim() : '';
  const isbn13 = firstIsbn13(doc.isbn);
  if (!title || !isbn13) return null;

  const pages = doc.number_of_pages_median;
  const sentence = Array.isArray(doc.first_sentence) ? doc.first_sentence[0] : null;
  return {
    title,
    isbn13,
    authors: Array.isArray(doc.author_name)
      ? doc.author_name.filter((a): a is string => typeof a === 'string')
      : [],
    description: typeof sentence === 'string' ? sentence : null,
    pageCount: typeof pages === 'number' && Number.isInteger(pages) && pages > 0 ? pages : null,
    // Cover-id URLs are not rate limited; ISBN and OLID cover URLs are.
    coverUrl:
      typeof doc.cover_i === 'number'
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
        : null,
  };
}

function firstIsbn13(isbns: unknown): string | null {
  if (!Array.isArray(isbns)) return null;
  for (const raw of isbns) {
    try {
      if (typeof raw === 'string' && raw.replace(/[-\s]/g, '').length === 13) {
        return Isbn13.of(raw).value;
      }
    } catch {
      // Bad check digit: try the next one.
    }
  }
  return null;
}
```

- [ ] **Step 6: Run the tests, typecheck and lint**

Run: `npx tsx --test tests/unit/open-library-catalog.test.ts && npm run typecheck && npm run lint`
Expected: 5 tests PASS, no type or lint errors.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json src/features/book/book-catalog.ts src/features/book/query-cache.ts src/features/book/open-library-catalog.ts tests/unit/open-library-catalog.test.ts
git commit -m "feat: search open library behind a book catalog port"
```

---

### Task 3: BookService falls back to the catalogue and imports

**Files:**
- Modify: `src/features/book/book-service.ts`
- Test: `tests/unit/book-service.test.ts`

- [ ] **Step 1: Write the failing tests**

Add to `tests/unit/book-service.test.ts`. Extend the imports:

```ts
import type { BookCatalog, CatalogBook } from '../../src/features/book/book-catalog.js';
```

Add after the existing `describe`:

```ts
class FakeCatalog implements BookCatalog {
  readonly calls: string[] = [];
  constructor(private readonly found: CatalogBook[] = []) {}

  async search(query: string): Promise<CatalogBook[]> {
    this.calls.push(query);
    return this.found;
  }
}

const remote = (title: string, isbn13: string): CatalogBook => ({
  title,
  isbn13,
  authors: ['Someone'],
  description: null,
  pageCount: 300,
  coverUrl: null,
});

describe('BookService.search with a catalogue', () => {
  test('does not ask the catalogue when 5 books are found locally', async () => {
    const books = new InMemoryBookRepository();
    for (const n of [1, 2, 3, 4, 5]) await books.save(Book.create({ title: `Dune ${n}` }));
    const catalog = new FakeCatalog([remote('Dune Messiah', '9780441172696')]);

    const found = await new BookService(books, catalog).search('dune');

    assert.equal(found.length, 5);
    assert.deepEqual(catalog.calls, []);
  });

  test('imports catalogue books after the local ones', async () => {
    const books = new InMemoryBookRepository();
    await books.save(Book.create({ title: 'Dune' }));
    const catalog = new FakeCatalog([remote('Dune Messiah', '9780441172696')]);

    const found = await new BookService(books, catalog).search('dune');

    assert.deepEqual(
      found.map((b) => b.title.value),
      ['Dune', 'Dune Messiah'],
    );
    const imported = await books.findById(found[1]!.id);
    assert.equal(imported?.isCommunityAdded, false);
    assert.equal(imported?.pageCount?.value, 300);
  });

  test('reuses a book that already has the ISBN-13 instead of importing it again', async () => {
    const books = new InMemoryBookRepository();
    const existing = Book.create({ title: 'Some Other Title', isbn13: '9780441172719' });
    await books.save(existing);
    const catalog = new FakeCatalog([remote('Dune', '9780441172719')]);

    const found = await new BookService(books, catalog).search('dune');

    assert.deepEqual(
      found.map((b) => b.id.value),
      [existing.id.value],
    );
  });

  test('does not repeat a local book the catalogue also returns', async () => {
    const books = new InMemoryBookRepository();
    await books.save(Book.create({ title: 'Dune', isbn13: '9780441172719' }));
    const catalog = new FakeCatalog([remote('Dune', '9780441172719')]);

    const found = await new BookService(books, catalog).search('dune');

    assert.equal(found.length, 1);
  });

  test('keeps the local results when the catalogue has nothing', async () => {
    const books = new InMemoryBookRepository();
    await books.save(Book.create({ title: 'Dune' }));

    const found = await new BookService(books, new FakeCatalog()).search('dune');

    assert.deepEqual(
      found.map((b) => b.title.value),
      ['Dune'],
    );
  });

  test('returns at most 20 books', async () => {
    const books = new InMemoryBookRepository();
    const many = Array.from({ length: 25 }, (_, i) => {
      // Valid ISBN-13s 978000000000c with the right check digit for each i.
      const base = `97800000000${String(i).padStart(2, '0')}`;
      const sum = [...base].reduce((acc, d, j) => acc + Number(d) * (j % 2 === 0 ? 1 : 3), 0);
      return remote(`Book ${i}`, base + String((10 - (sum % 10)) % 10));
    });

    const found = await new BookService(books, new FakeCatalog(many)).search('book');

    assert.equal(found.length, 20);
  });
});
```

Check `9780441172696` with `Isbn13.of` first. If it is not valid, swap in another valid ISBN-13 such as `9780451524935`.

- [ ] **Step 2: Run them to see them fail**

Run: `npx tsx --test tests/unit/book-service.test.ts`
Expected: the new tests FAIL (the constructor ignores the catalogue, so only local books come back).

- [ ] **Step 3: Implement the fallback**

Replace `src/features/book/book-service.ts` with:

```ts
import { InvalidIdError } from '../../utils/uuid.js';
import { InvalidValueError, NotFoundError } from '../../utils/errors.js';
import { Book, BookId, Isbn13, type NewBookProps } from './book.js';
import type { IBookRepository } from './book-repository.js';
import type { BookCatalog, CatalogBook } from './book-catalog.js';

/** F-EXP-01: how many books one search returns. */
export const SEARCH_LIMIT = 20;
/** Below this many local results, the outside catalogue is asked too. */
export const CATALOG_FALLBACK_BELOW = 5;
const MAX_QUERY_LENGTH = 100;

// Application service: one method per use case on the book catalogue.
export class BookService {
  // Without a catalogue (tests, local work offline) search stays local only.
  constructor(
    private readonly books: IBookRepository,
    private readonly catalog?: BookCatalog,
  ) {}

  async register(props: NewBookProps): Promise<Book> {
    const book = Book.create(props);
    await this.books.save(book);
    return book;
  }

  async get(rawId: unknown): Promise<Book> {
    const book = await this.books.findById(BookService.parseId(rawId));
    if (!book) throw new NotFoundError('Book');
    return book;
  }

  // F-EXP-01: blank text is not an error, just no results. Local books come first;
  // when there are few, books from the catalogue are imported and added after them.
  async search(raw: string): Promise<Book[]> {
    const query = raw.trim().slice(0, MAX_QUERY_LENGTH);
    if (!query) return [];
    const local = await this.books.search(query, SEARCH_LIMIT);
    if (!this.catalog || local.length >= CATALOG_FALLBACK_BELOW) return local;

    const results = [...local];
    const seen = new Set(local.flatMap((b) => (b.isbn13 ? [b.isbn13.value] : [])));
    for (const found of await this.catalog.search(query, SEARCH_LIMIT)) {
      if (results.length >= SEARCH_LIMIT) break;
      if (seen.has(found.isbn13)) continue;
      const book = await this.importBook(found);
      if (!book || results.some((b) => b.id.equals(book.id))) continue;
      seen.add(found.isbn13);
      results.push(book);
    }
    return results;
  }

  private async importBook(found: CatalogBook): Promise<Book | null> {
    try {
      const existing = await this.books.findByIsbn(Isbn13.of(found.isbn13));
      if (existing) return existing;
      const book = Book.create({
        title: found.title,
        description: found.description,
        isbn13: found.isbn13,
        pageCount: found.pageCount,
        coverUrl: found.coverUrl,
        isCommunityAdded: false,
      });
      return await this.books.saveWithAuthors(book, found.authors);
    } catch (error) {
      // One bad record from the catalogue must not break the search.
      if (error instanceof InvalidValueError) return null;
      throw error;
    }
  }

  // A malformed id can never match a book, so it is reported as not found.
  private static parseId(rawId: unknown): BookId {
    try {
      return BookId.of(rawId);
    } catch (error) {
      if (error instanceof InvalidIdError) throw new NotFoundError('Book');
      throw error;
    }
  }
}
```

Before writing, check that `InvalidValueError` is exported from `src/utils/errors.js` (it is imported by `book.ts`) and that `BookId` has an `equals` method from `Uuid`. If `Uuid` has no `equals`, compare `b.id.value === book.id.value` instead.

- [ ] **Step 4: Run the tests, typecheck and lint**

Run: `npx tsx --test tests/unit/book-service.test.ts && npm run typecheck && npm run lint`
Expected: all tests PASS (the 3 old ones too), no errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/book/book-service.ts tests/unit/book-service.test.ts
git commit -m "feat: import books from the catalog when local search finds few"
```

---

### Task 4: Wire Open Library into the server

**Files:**
- Modify: `src/config/env.ts`
- Modify: `.env.example`
- Modify: `src/api/router.ts:50-120`
- Modify: `src/server.ts`

- [ ] **Step 1: Add the setting**

In `src/config/env.ts`, add to `env` after `corsOrigins`:

```ts
  // Open Library, the fallback book catalogue (F-EXP-01). Only search text is sent.
  openLibraryUrl: process.env.OPEN_LIBRARY_URL ?? 'https://openlibrary.org',
```

At the end of `.env.example`:

```
# Open Library, asked when a book search finds fewer than 5 local books.
OPEN_LIBRARY_URL=https://openlibrary.org
```

- [ ] **Step 2: Accept the catalogue in the router**

In `src/api/router.ts`, add the import:

```ts
import type { BookCatalog } from '../features/book/book-catalog.js';
```

In `ApiDependencies`, after `bookRepository?: IBookRepository;`:

```ts
  /** Outside catalogue asked when a search finds few local books; local only without it. */
  bookCatalog?: BookCatalog;
```

Add `bookCatalog,` to the destructuring in `apiRouter` after `bookRepository,`, and change the book routes line to:

```ts
    router.use(bookRoutes(new BookService(bookRepository, bookCatalog)));
```

- [ ] **Step 3: Pass the adapter in the server**

In `src/server.ts`, add the import:

```ts
import { OpenLibraryCatalog } from './features/book/open-library-catalog.js';
```

and in the `createApp({...})` call, after `bookRepository: new DrizzleBookRepository(db),`:

```ts
  bookCatalog: new OpenLibraryCatalog({ baseUrl: env.openLibraryUrl }),
```

- [ ] **Step 4: Run the whole suite**

Run: `npm run typecheck && npm run lint && npm test`
Expected: everything PASS. The API tests do not pass `bookCatalog`, so they never call Open Library.

- [ ] **Step 5: Try it by hand**

Run the backend (`npm run dev`) with a valid session token, and search a title the seed does not have:

```bash
curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:3000/book?q=the%20hobbit" | head -c 600
```

Expected: books with UUID ids and `covers.openlibrary.org/b/id/...` cover URLs. Run it a second time: the same ids come back (now from the local search).

- [ ] **Step 6: Commit**

```bash
git add src/config/env.ts .env.example src/api/router.ts src/server.ts
git commit -m "feat: use open library as the book search fallback"
```

---

### Task 5: Docs

**Files:**
- Modify: `docs/architecture/api_routes.md`
- Modify: `docs/iterations/2/log.md`
- Modify: `docs/iterations/2/LLM_LOG.md`

- [ ] **Step 1: API routes**

In `docs/architecture/api_routes.md`, find the `GET /book?q=` row (search for `?q=`) and append to its description:

```
When fewer than 5 books match, Open Library is searched too; its books (with an ISBN-13) are added to the catalogue and returned after the local ones.
```

- [ ] **Step 2: Iteration log**

At the bottom of `docs/iterations/2/log.md`:

```markdown
### 2026-11-11: Open Library fallback built (#120, F-EXP-01)

- Built from the [spec](../../superpowers/specs/2026-11-11-open-library-fallback-design.md) and the [plan](../../superpowers/plans/2026-11-11-open-library-fallback.md).
- `BookCatalog` port with an `OpenLibraryCatalog` adapter (3 s timeout, `lru-cache` for 1 h); `BookService.search` imports its books when fewer than 5 match locally. New `findByIsbn` and `saveWithAuthors` on the book repository. Setting `OPEN_LIBRARY_URL`.
- **Tests.** Backend N passing (M new).
```

Replace N and M with the numbers printed by `npm test`. Also update the Explore row of the **Status** table to say search falls back to Open Library.

- [ ] **Step 3: LLM log**

At the bottom of `docs/iterations/2/LLM_LOG.md`:

````markdown
### 2026-11-11: Open Library fallback implementation

- **Date:** 2026-11-11
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** backend, testing, docs

#### Prompt
```text
Implement docs/superpowers/plans/2026-11-11-open-library-fallback.md
```

#### Result
`BookCatalog` port, `OpenLibraryCatalog` adapter with an `lru-cache` query cache, import on search in `BookService`, `findByIsbn` and `saveWithAuthors`, wiring and tests.
````

- [ ] **Step 4: Commit**

```bash
git add docs/architecture/api_routes.md docs/iterations/2/log.md docs/iterations/2/LLM_LOG.md
git commit -m "docs: log open library fallback"
```
