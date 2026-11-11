# Open Library fallback for book search

Date: 2026-11-11 · Story: [#120](https://github.com/MESW-LES-2627/les-project-group-6/issues/120) "Search any book, add it if missing" · Requirement: F-EXP-01

## Goal

`GET /book?q=` finds books the catalogue does not have yet by asking Open Library ([infra.md](../../architecture/infra.md), row 5). The local database stays the source of truth: every book a reader can see has a row in `books`.

## Behaviour

1. `BookService.search` runs the local fuzzy search (`pg_trgm`) with limit 20.
2. If it returns **5 or more** books, those are the answer. Open Library is not called.
3. Otherwise it asks the `BookCatalog` port for up to 20 books.
4. Each remote hit whose ISBN-13 is not already in the local results is:
   - reused if `books` already has that ISBN-13 (`findByIsbn`), or
   - **imported**: `Book.create` with `isCommunityAdded = false`, saved with its authors (`saveWithAuthors`).
5. The answer is local results first, then imported ones, cut to 20.

Hits without a valid ISBN-13 are skipped. If Open Library fails (timeout of 3 s, non-200, bad JSON), the adapter logs a warning and returns `[]`, so the search returns the local results. A search never fails because of Open Library.

The frontend does not change: imported books have real UUIDs, so Explore links to `/book/:id` and "add to library" work as before.

*Rejected:* import only when a reader picks a result. It needs temporary external ids, a new endpoint and frontend changes. The cost of importing on search (unused rows in `books`) is acceptable at our scale.

## Components (all in `apps/backend/src/features/book/` unless noted)

| Unit | Responsibility |
|---|---|
| `book-catalog.ts` | Port. `CatalogBook { title, isbn13, authors[], description, pageCount, coverUrl }` and `BookCatalog.search(query, limit)`. |
| `open-library-catalog.ts` | Adapter. Calls `{OPEN_LIBRARY_URL}/search.json?q=&limit=&fields=title,author_name,isbn,number_of_pages_median,cover_i,first_sentence` with native `fetch` and `AbortSignal.timeout(3000)`. Picks the first ISBN that passes `Isbn13.of`. Cover URL is `https://covers.openlibrary.org/b/id/{cover_i}-L.jpg` (cover-id URLs are not rate limited; ISBN/OLID ones are), `null` without `cover_i`. Takes a `QueryCache` (default: an `LRUCache`) and serves repeat queries from it. |
| `query-cache.ts` | `QueryCache<V>` interface (`get(key)`, `set(key, value)`). The [`lru-cache`](https://www.npmjs.com/package/lru-cache) package (v11, new dependency) already has this shape, so `new LRUCache({ max: 500, ttl: 3_600_000 })` is passed as is. A Redis/Valkey class with the same two methods can replace it if we run more than one backend instance. |
| `book-service.ts` | `new BookService(books, catalog?)`. Without a catalog, search stays local only. |
| `book-repository.ts` | New `findByIsbn(isbn)` and `saveWithAuthors(book, authorNames)`: one transaction that inserts the book (`onConflictDoNothing` on ISBN-13, then reads back the winner, for two searches importing the same book at once), upserts each author by name and links them in `book_authors`. |
| `src/api/router.ts`, `src/server.ts` | `router` takes an optional `bookCatalog`; `server.ts` passes `new OpenLibraryCatalog()`. |
| `.env.example`, `src/config/env.ts` | `OPEN_LIBRARY_URL`, default `https://openlibrary.org`. |

## Caching

- **Book data:** Postgres is the cache. Imported books are local rows, so library pages, book pages and repeat searches never call Open Library.
- **Open Library queries:** the adapter keeps results in an `LRUCache` keyed by the trimmed, lowercased query (TTL 1 h, max 500 entries). Lost on restart, which is fine.
- **Covers:** not cached by the backend. The browser loads them from `covers.openlibrary.org` and keeps them in its HTTP cache; `BookCoverImage` shows the default cover when one fails.
- **No Redis:** Supabase does not offer it, the backend is one Render process, and [infra.md](../../architecture/infra.md) keeps caches out until a real need appears.
- **Follow-up, not in this spec:** a 5-minute `LRUCache` for the Explore lists in `ExploreService`.

Only the search text is sent to Open Library, nothing about the reader.

## Testing

- **Unit, `book-service.test.ts`:** fake `BookCatalog` with the in-memory repository. Catalog not called with 5+ local hits; remote books imported and merged after local ones; an existing ISBN-13 reused, not duplicated; a catalog that returns `[]` still gives the local results; limit of 20 kept.
- **Unit, `open-library-catalog.test.ts`:** stubbed `fetch` with a JSON fixture. Mapping of fields and cover URL; results without an ISBN-13 skipped; timeout, 500 and bad JSON give `[]`; a second identical query is served from the cache.
- **Integration, `book-repository.test.ts`:** `findByIsbn`, `saveWithAuthors` creates authors once and links them, and a second save of the same ISBN-13 keeps one row.
- No test calls the real Open Library.

## Docs to update with the code

[api_routes.md](../../architecture/api_routes.md) (`GET /book?q=` may import from Open Library), the iteration 2 [log](../../iterations/2/log.md) and [LLM log](../../iterations/2/LLM_LOG.md).
