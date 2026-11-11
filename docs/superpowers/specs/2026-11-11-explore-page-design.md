# Explore page: design

- **Story:** [#126 Explore page: trending, most read this week, search](https://github.com/MESW-LES-2627/les-project-group-6/issues/126)
- **Requirements:** F-EXP-04 (trending), F-EXP-01 (search)
- **Depends on:** #120 (book search). This story reuses the catalogue search that already exists and does not wait for #120.
- **Date:** 2026-11-11

## Goal

A reader opens **Explore** from the header and sees a large search bar. Below it are two ranked lists: **Trending this week** and **Most read this week**. Submitting a search shows matching books on the same page. Clicking any book opens its book page, where the reader can add it to their library.

## Scope

In scope:

- `GET /explore`, which returns both ranked lists.
- A migration that adds `reading_status.created_at`.
- The `/explore` route, `ExploreView`, and three small components, following the Explore mockup.
- Inline search that uses the existing `GET /book?title=`.
- Linking the header's Explore nav item.

Out of scope:

- User search (F-EXP-01 "Readers").
- Friends and genre trending lists.
- Open Library results and "Add this book" (#120).
- Trending on Home.

## Decisions

| Decision | Chosen | Rejected and why |
| --- | --- | --- |
| Search behaviour | Inline on Explore, using the existing `searchBooks()` → `GET /book?title=` | A separate `/search` page belongs to #120. Header search reuse widens the scope. |
| Lists | Both "Trending" and "Most read this week", as in the acceptance criteria | Building only one would drop a scenario from the story. |
| Backend shape | One endpoint, `GET /explore`, served by an `ExploreService` that composes the published read contracts (`ReadingActivityQuery`, `ReadingProgressQuery`) and `IBookRepository.findByIds` | A query reading `reading_sessions` and `reading_status` directly would repeat the counted-minutes rule and bring back the coupling removed on 2026-11-08 (`d1f3e37`). Two endpoints would mean two requests and two loading states. |
| "This week" for minutes | Sessions that **ended** in the last 7 days | `started_at`, because it would differ from the counted-minutes rule that challenges and clubs use. |

## Backend

Explore does **not** read `reading_sessions` or `reading_status` itself. Since the coupling fix of 2026-11-08 (`d1f3e37`), other modules ask the published read contracts (`ReadingActivityQuery`, `ReadingProgressQuery`), so each rule stays in one module. Explore asks each contract for its ranking and then loads the books.

### Migration `0008`

- Add `reading_status.created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP`.
- Backfill existing rows with `created_at = updated_at`, so old rows do not all count as "added this week".
- Update `database/schema.ts` and `schema.sql` to match.
- The `started_on` column from `0007` does not cover this. It is the date reading started, not the date the book was added to the library.

### New contract methods

- **`ReadingActivityQuery.topBooks({ from, to, limit })`** returns `Promise<{ bookId: string; minutes: number }[]>`.
  - It sums counted minutes across **all** readers, using the same rule as `countedMinutes`: a session counts once it has ended, and only if `ended_at` is in `[from, to)`.
  - It keeps books with a sum above 0 and returns at most `limit` rows.
  - Order: minutes descending, then `bookId`. Title ties are settled in the service.
- **`ReadingProgressQuery.mostAdded({ from, to, limit })`** returns `Promise<{ bookId: string; readers: number }[]>`.
  - It counts `COUNT(DISTINCT user_id)` where `created_at` is in `[from, to)`.
  - It returns at most `limit` rows, ordered by readers descending.
- **`IBookRepository.findByIds(ids: BookId[])`** returns `Promise<Book[]>`, a single `WHERE id IN (...)`. It is added to the Drizzle repository and to the in-memory test repository.

### `features/explore/explore-service.ts`

```ts
export interface RankedBook<T> { book: Book; score: T }   // minutes or readers

export class ExploreService {
  constructor(activity: ReadingActivityQuery, progress: ReadingProgressQuery,
              books: IBookRepository, clock: Clock) {}
  overview(): Promise<{ mostReadThisWeek: RankedBook<number>[]; trending: RankedBook<number>[] }>;
}
```

- The window is `[clock() - 7 days, clock())`, and each list is capped at **10**.
- Both rankings are fetched in parallel. Then one `findByIds` loads the union of their book ids.
- The ranking order is kept. Equal scores are ordered by title. Ids whose book no longer exists are dropped.

### `features/explore/explore-routes.ts`

- `GET /explore` sits behind the auth middleware, like every other route. It maps books with the existing `toBookDto`.
- Response:

```json
{
  "mostReadThisWeek": [{ "book": { "id": "…", "title": "…", "coverUrl": null, "...": "…" }, "minutes": 320 }],
  "trending": [{ "book": { "...": "…" }, "readers": 4 }]
}
```

- When there is no activity, the response is `200` with empty arrays, never an error.
- The route is wired in `api/router.ts` (an optional dependency, like `libraryQuery`) and `server.ts`, which reuses the existing `DrizzleReadingActivityQuery` and `DrizzleReadingProgressQuery` instances.

## Frontend

The layout follows the Explore mockup from the design (`docs/design/screens/08-explore.png`, removed in `dd3c73a`; get it with `git show dd3c73a^:docs/design/screens/08-explore.png`). Only the parts in this story's scope are built: the hero, the search panel, the Books results panel and the trending section. The mockup's Readers panel, "Because you love…", "The Sunday shelf", and the "Among friends" and "Your genres" tabs are left out.

### Reused, not rebuilt

- **Global classes** (`assets/styles/main.css`): `.page-column`, `.panel`, `.panel-heading`, `.eyebrow`, `.section-heading`, `.section-meta`, `.page-tabs`/`.page-tab`, `.field-input`, `.button`, `.button-outline`, `.button-small`, `.tag`/`.tag-highlight`, `.muted`, `.text-link` and `.sr-only`.
- **Components:**
  - `BookCoverImage`, for covers, including the title-only fallback cover.
  - `GroupsPageHeader`, for the eyebrow, title and subtitle. Despite its name it has no groups logic, so this story moves it to `components/layout/PageHeader.vue` and updates the Groups imports. Nothing else changes in it.
- **API mapping:** `mapApiBookToLibraryBook` (cover URL and author) and `searchBooks()`.

### Routing and header

- In `router/index.ts`, add `{ path: '/explore', name: 'explore', component: () => import('../views/ExploreView.vue') }`.
- In `AppHeader.vue`, set the Explore nav item to `to: '/explore'` and remove the "no route yet" comment.

### API (`services/api.ts`)

- Add an `ApiExplore` type and `getExplore(): Promise<ApiExplore>`, which calls `getJson('/explore', 'Failed to load Explore')`.

### Layout

```
AppHeader (Explore active)
DISCOVER SOMETHING GOOD                               ← PageHeader (eyebrow)
Follow your curiosity.                                ← title
Your next favorite book might be one search away.     ← subtitle
┌ .panel ───────────────────────────────────────────────────────────┐
│ Search books                                                       │ ← ExploreSearchBar
│ [ .field-input: Dune                              ] [🔍 Search]    │
│ Book title                                                         │
└────────────────────────────────────────────────────────────────────┘
┌ .panel (only when ?q= is set) ────────────────────────────────────┐
│ Books                                    3 results · Clear         │ ← BookSearchResults
│ [cover] Dune · Frank Herbert                          [View]       │
│ [cover] Dune Messiah · Frank Herbert                  [View]       │
│   or: No books match "Dune".                                       │
└────────────────────────────────────────────────────────────────────┘
A good time to pick these up.                         ← .section-heading
[ Trending ] [ Most read this week ]                  ← .page-tabs
┌card┐ ┌card┐ ┌card┐ ┌card┐                          ← TrendingBookCard × up to 10
│cover│ #1 TRENDING  (.tag-highlight, first card only)
│     │ Title (serif) / author / "4 readers added it"  [View book]
```

The cards sit in a 4-column grid, with 2 columns under 900px and 1 under 600px.

### Components (`components/explore/`)

- **`ExploreSearchBar.vue`**
  - A `.panel` holding a `role="search"` form: the visible label "Search books", a `.field-input` (`type="search"`), a `.button` with the search icon and "Search", and a muted hint "Book title".
  - Props: `modelValue`. Emits: `update:modelValue` and `submit(query: string)`.
- **`BookSearchResults.vue`**
  - A `.panel` with the heading "Books", a `.section-meta` "N results", and a **Clear** `.link-button`.
  - Each row shows a small `BookCoverImage`, the title, the muted author, and a `.button-outline.button-small` "View" `RouterLink` to `book-detail`.
  - Props: `query`, `books`, `loading`, `error`. Emits: `clear`.
  - States:
    - Loading: a muted "Searching…" line.
    - No results: `No books match "<q>".`
    - Error: "Search is unavailable right now."
- **`TrendingBookCard.vue`**
  - A bordered card (the `.panel` look) holding a `BookCoverImage`, an optional `rankLabel` (`.tag.tag-highlight`, for example "#1 Trending"), the serif title, the muted author, and a `metric` line.
  - A `.button-outline.button-small` "View book" `RouterLink` goes to `book-detail`, where the reader adds the book to their library. This matches the "Open a book" scenario.
  - Props: `book` (a `LibraryBook` from the mapper), `metric`, `rankLabel?`.
  - There is no inline "Add to library" button. Adding happens on the book page, as the acceptance criteria say, so this story does not duplicate the add-to-library flow.

### `views/ExploreView.vue`

- **Header:** `PageHeader` with the eyebrow "Discover something good", the title "Follow your curiosity." and the subtitle "Your next favorite book might be one search away."
- **Search:**
  - The search is driven by `route.query.q`. Submitting a non-empty query runs `router.push({ query: { q } })`, and a `q` change runs `searchBooks(q)`.
  - Clear, or submitting an empty query, removes `q` and hides the results panel.
  - Reload and the back button keep the search.
  - The trending section stays visible below the results, as in the mockup.
- **Trending section:**
  - On mount the view calls `getExplore()` once.
  - Tabs: **Trending** (default; metric "N readers added it", or "1 reader added it") and **Most read this week** (metric "N min read"). The first card's rank label is "#1 Trending" or "#1 This week".
  - States:
    - Loading: a muted "Loading…" line.
    - Error: "Couldn't load trending books." with a **Try again** `.button-outline`.
    - Empty: "No books added this week yet." for Trending and "No reading logged this week yet." for Most read. These are plain muted text, never an error.

## Error handling

- The API answers `401` without a session, which is the existing `apiFetch` behaviour.
- Empty data is a valid `200`. The UI only shows an error when the request fails, never when a list is empty.

## Testing

Backend:

- **`tests/integration/reading-activity-query.test.ts`** (extended) for `topBooks`:
  - It sums minutes across readers.
  - Running sessions and sessions that ended outside the window are excluded.
  - Results are ranked and capped at `limit`.
  - An empty DB returns `[]`.
- **`tests/integration/reading-status-repository.test.ts`**, or a new `reading-progress-query.test.ts`, for `mostAdded`:
  - A reader is counted once per book.
  - Rows created before the window are excluded. This also covers the migration backfill (`created_at = updated_at`).
  - Results are ranked and capped.
- **`tests/integration/book-repository.test.ts`**: `findByIds` returns the books that exist and ignores unknown ids.
- **`tests/unit/explore-service.test.ts`**, with in-memory fakes and a fixed clock:
  - The 7-day window is passed to both contracts.
  - The ranking order is kept, and ties are ordered by title.
  - Missing books are dropped.
  - Empty contracts give empty lists.
- **`tests/integration/explore-api.test.ts`**:
  - `GET /explore` without auth returns `401`.
  - With auth it returns `200` with `{ mostReadThisWeek, trending }`.

Frontend (Vitest):

- **`views/__tests__/ExploreView.spec.ts`**, with `getExplore` and `searchBooks` mocked:
  - The Trending tab shows by default. Switching to "Most read this week" shows those books and the minutes metric.
  - Empty arrays show the empty texts. A failure shows **Try again**, and clicking it fetches again.
  - Submitting "Dune" sets `?q=Dune` and shows the results panel above the trending section. Clear removes the panel.
  - Book cards and result rows link to `book-detail`.
- **`components/explore/__tests__/ExploreSearchBar.spec.ts`**: submit emits the trimmed query.
- **`components/explore/__tests__/BookSearchResults.spec.ts`**: rows, the results count, the no-results text and the clear event.
- **`components/explore/__tests__/TrendingBookCard.spec.ts`**: title, author, metric, the optional rank label and the link.
- **`components/layout/__tests__/AppHeader.spec.ts`**: Explore links to `/explore`.
- **Existing Groups tests** still pass after `GroupsPageHeader` moves to `layout/PageHeader`.

## Acceptance criteria mapping

| Scenario | Covered by |
| --- | --- |
| Most read this week | `ReadingActivityQuery.topBooks` with a 7-day window, top 10 by counted minutes |
| Trending | `ReadingProgressQuery.mostAdded` with a 7-day window, top 10 by distinct readers who added the book |
| Search from Explore | `ExploreSearchBar` → `searchBooks` → same `GET /book` results as book search, shown in `BookSearchResults` |
| Open a book | `TrendingBookCard` and `BookSearchResults` link to `book-detail`, which already offers "add to library" |
| Not enough activity | Empty arrays → each tab's empty-state text, no error |

## Docs to update with the implementation

- Add an entry to `docs/sprints/iteration_2/log.md` (Status and Next steps).
- Add an entry to `docs/sprints/iteration_2/LLM_LOG.md`.
- `README.md` structure: no change for the code, because `features/explore` and `components/explore` are inside the existing folders.
- `docs/architecture` API routes list: add `GET /explore`.
