# Book search: fuzzy, search-as-you-type: design

- **Requirement:** F-EXP-01 (search books by title, author or ISBN)
- **Builds on:** [Explore page design](2026-11-11-explore-page-design.md) (#126)
- **Date:** 2026-11-11

## Goal

On Explore, the results update while the reader types, without a submit. A book is found even when the reader makes a small typo, leaves out an accent, types only part of the title, types the author instead of the title, or pastes an ISBN with hyphens. The same search powers the book picker in groups.

## Scope

In scope:

- Migration `0009`: the `pg_trgm` and `unaccent` extensions, an immutable `f_unaccent` wrapper and GIN trigram indexes.
- `IBookRepository.search(query, limit)` replaces `findByTitle`.
- `GET /book?q=` replaces `GET /book?title=` for both callers (Explore and `BookPicker`).
- Search while typing on Explore (300 ms debounce).

Out of scope:

- Searching descriptions, and word stemming (full-text search).
- Open Library results (#120).
- Reader search.
- "Did you mean…?" suggestions and highlighting the matched text.

## Decisions

| Decision | Chosen | Rejected and why |
| --- | --- | --- |
| Search engine | Postgres `pg_trgm` + `unaccent` | **Elasticsearch / OpenSearch:** another service to host (too heavy for Render's free tier), a second store to keep in sync, and harder CI. It pays off with millions of documents, facets or tuned relevance, and we need none of these. **Meilisearch / Typesense:** lighter, but still a second store to sync. **Full-text search (`tsvector`):** matches whole words and stems, but does not tolerate typos, which is the main need. It can be added later for descriptions. |
| Similarity function | `word_similarity` (`<%`), which compares the query to the best-matching part of the text | `similarity` (`%`) compares whole strings, so a half-typed "the hobb" scores low against a long title. |
| Accents | `unaccent` through an `IMMUTABLE` wrapper `f_unaccent`, used in the indexes and the query | Without it, "memorias" would not find "Memórias". |
| ISBN | Exact or prefix match on digits only (`-` and spaces removed) | Fuzzy ISBN matching would return wrong books for a single wrong digit. |
| Endpoint | Replace `GET /book?title=` with `GET /book?q=` for both callers | A separate Explore-only endpoint would leave two search behaviours in the app. |
| Debounce | In the view, 300 ms, at least 2 characters. `router.replace` while typing, `router.push` on Enter | Pushing every keystroke would flood the back history. A shared `useDebounce` composable is not worth it for two callers that debounce differently. |

## Backend

### Migration `0009_book_search.sql`

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- unaccent() is STABLE, so it cannot be used in an index. This wrapper names
-- the dictionary explicitly and is safe to mark IMMUTABLE.
CREATE OR REPLACE FUNCTION f_unaccent(text) RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
  AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

CREATE INDEX books_title_trgm_idx ON books USING gin (f_unaccent(lower(title)) gin_trgm_ops);
CREATE INDEX authors_name_trgm_idx ON authors USING gin (f_unaccent(lower(name)) gin_trgm_ops);
```

- `books.isbn13` already has a `UNIQUE` btree index, which serves the ISBN prefix match.
- The migration is registered in Drizzle's `meta/_journal.json`, like `0000` to `0008`.
- **Extension schema.** On Supabase, extensions usually live in the `extensions` schema. Locally (Docker `postgres:17-alpine`) `CREATE EXTENSION` puts them in `public`. A wrapper that hard-codes `public.unaccent` would then fail on Supabase. The wrapper looks up the schema where `unaccent` is installed (`pg_extension` joined with `pg_namespace`) and builds the function with `EXECUTE format(...)` in a `DO` block. The trigram operators also need that schema on the `search_path` in production. The plan must verify both against a Supabase database before merging.
- Migration `0005` (RLS, Supabase API roles revoked) does not affect functions or indexes, so nothing else needs revoking.
- `schema.sql` and `database/schema.ts` are updated to match (Drizzle `index(...).using('gin', sql\`...\`)`).

### `IBookRepository.search(query: string, limit: number): Promise<Book[]>`

This replaces `findByTitle`. `DrizzleBookRepository` builds one SQL query.

1. **Normalise.** `q = f_unaccent(lower(:query))`. The query arrives already trimmed.
2. **ISBN.** `digits = query` with `-` and spaces removed. If `digits` is 10 to 13 digits, `isbn13 LIKE digits || '%'` is one of the match conditions. Its rank is highest.
3. **Text match.** This uses `LEFT JOIN book_authors` / `authors`, grouped by book, so a book with several authors appears once.
   - If the query has 3 or more characters: `q <% f_unaccent(lower(books.title)) OR q <% f_unaccent(lower(authors.name))`.
   - Otherwise: `f_unaccent(lower(title)) LIKE q || '%' OR f_unaccent(lower(name)) LIKE q || '%'`. Trigrams are unreliable on 1 or 2 characters.
   - `%` and `_` in the reader's text are escaped before any `LIKE`.
4. **Rank** (descending):
   1. ISBN match
   2. title starts with `q`
   3. `max(greatest(word_similarity(q, title), word_similarity(q, author name)))`
   4. then by title, ascending
5. **Limit.** `LIMIT :limit`.
6. **Threshold.** Keep the default `pg_trgm.word_similarity_threshold` (0.6). If the typo cases in the tests need a lower value, set it per query with `SET LOCAL` inside a transaction. Never set it globally.

Authors are often missing today (books show "Unknown Author" until they store one). Author matching therefore only helps books that have authors. Search by title and ISBN does not depend on it.

### In-memory repository (unit tests)

`search` lowercases the title, author names and query and strips their accents (`normalize('NFD')`), then returns books whose title or author contains the query, or whose ISBN starts with the query's digits. Order: ISBN match, title prefix, then title. It is not fuzzy: the integration tests cover the real matching.

### `BookService.search(raw: string)`

- Trims the text. Empty → `[]` without calling the repository.
- Cuts it to 100 characters.
- Calls `books.search(q, 20)`.

### `GET /book?q=`

- In `book-routes.ts`. It reads `req.query.q`, and a non-string `q` counts as empty.
- Response: `ApiBook[]` through `toBookDto`, in ranked order. The shape is unchanged.
- `401` without a session, as before. An empty or missing `q` returns `200 []`, never `400`.
- `?title=` is removed in the same change, once both frontend callers use `q`.

## Frontend

### `services/api.ts`

`searchBooks(query: string, signal?: AbortSignal): Promise<ApiBook[]>` calls `/book?q=${encodeURIComponent(query)}`. The signal is passed to `fetch`, so a newer keystroke can cancel the older request.

### `views/ExploreView.vue`

- **Draft.** `ExploreSearchBar`'s `v-model` drives `draft`.
- **While typing.** A watcher on `draft` clears any pending timer and starts a 300 ms one. When it fires:
  - if `draft.trim()` has 2 or more characters → `router.replace({ name: 'explore', query: { q: draft.trim() } })`;
  - otherwise → `router.replace({ name: 'explore', query: {} })`, which hides the results panel.
- **Enter / Search button.** Cancels the timer and runs `router.push` with the same rule, so a deliberate search stays in the back history.
- **Fetch.** The existing `watch(query, …)` stays the only place that calls `searchBooks`. It aborts the previous request (`AbortController`) and keeps the `latestSearch` guard. An aborted request is ignored, not shown as an error.
- **URL → draft sync.** The existing line `draft.value = q` becomes `if (draft.value.trim() !== q) draft.value = q`. This keeps a trailing space while the reader types, but still fills the field on load and on back/forward.
- **Loading.** "Searching…" shows only while there are no results yet. While the reader keeps typing, the previous results stay visible until the new ones arrive, so the panel does not flicker.
- The timer is cleared in `onBeforeUnmount`.

### `components/explore/ExploreSearchBar.vue`

The hint changes from "Book title" to "Title, author or ISBN". Nothing else changes.

### `components/groups/BookPicker.vue`

Keeps its own 250 ms debounce and calls the new `searchBooks(text)`. Behaviour is otherwise unchanged, and it gains fuzzy, author and ISBN matching.

## Error handling

- Empty or very short queries are not errors: the API returns `[]` and the view hides the panel.
- A failed request shows the existing "Search is unavailable right now." An aborted request shows nothing.
- If an extension is missing, the migration fails at deploy time, not at query time.

## Testing

Backend:

- **`tests/integration/book-repository.test.ts`** (real Postgres; replaces the `findByTitle` cases):
  - Title typo: "hary poter" finds *Harry Potter and the Philosopher's Stone*.
  - Partial title: "the hobb" finds *The Hobbit: There and Back Again*.
  - Accents: "memorias" finds *Memórias Póstumas de Brás Cubas*.
  - Author, with a typo: "saramgo" finds a book by José Saramago. A book with two matching authors appears once.
  - ISBN with and without hyphens, and an ISBN prefix. The ISBN match ranks first.
  - A title prefix ranks above a weaker fuzzy match.
  - Unrelated text returns `[]`. A 2-character query matches prefixes only. `limit` caps the results.
  - `%` and `_` in the query are matched literally.
- **`tests/unit/book-service.test.ts`:** the query is trimmed. Empty text returns `[]` without calling the repository. Text is cut to 100 characters. The limit is 20.
- **`tests/integration/book-api.test.ts`:** `GET /book?q=` returns `200` with ranked books. Without auth it returns `401`. An empty or missing `q` returns `200 []`.

Frontend (Vitest, fake timers):

- **`views/__tests__/ExploreView.spec.ts`**:
  - Typing "dun" does not search before 300 ms, then searches once and calls `router.replace` with `?q=dun`.
  - Typing quickly searches once, for the last value.
  - A slower, older response does not overwrite newer results.
  - Under 2 characters, `q` is removed and the panel hides.
  - Enter searches immediately, with `router.push`.
  - A trailing space typed in the field is kept.
  - Loading `?q=dune` fills the field and searches.
  - The existing tests are updated to the new flow.
- **`components/explore/__tests__/ExploreSearchBar.spec.ts`:** the new hint text.
- **`components/groups/__tests__/BookPicker.spec.ts`:** the `searchBooks` mock matches the new signature. Its behaviour is unchanged.

## Docs to update with the implementation

- `docs/iterations/2/log.md`: an entry for the decision and the implementation.
- `docs/iterations/2/LLM_LOG.md`: an entry.
- `docs/architecture/api_routes.md`: `GET /book?q=` and its matching rules.
- `apps/backend/src/database/schema.sql` and `schema.ts`: the extensions, function and indexes.
- `README.md`: no change, because no folders change.
