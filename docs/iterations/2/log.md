# Iteration 2 log

A running record of what the team did and decided in iteration 2. The [release notes](release_notes.md) are the summary written at the end; this file is the day-to-day history. Newest entries go at the bottom. Earlier iterations are in their own logs ([iteration 0](../iteration_0/log.md), [iteration 1](../iteration_1/log.md)).

**Traceability chain:** requirement ID (`F-XXX-NN`) → GitHub issue (milestone `Iteration 2`) → PR → release notes.

## Status

| Area | State |
|---|---|
| Releases | One GitHub Release per sprint (`iter-0` to `iter-4`), made by hand with `iteration-release.yml`; `vX.Y.Z` stay as tags only. `iter-0` and `iter-1` released |
| Auth (F-AUTH-01) | Login is email and password only; username login removed from the form |
| Friends (F-SOC-01) | Friend request API (send, list incoming, accept, decline, remove) behind the auth middleware (PR #114) |
| Library & reading status (#28, F-LIB-01) | `startedOn`/`finishedOn` dates, delete and library routes behind the auth middleware (PR #115). The Library's **Add book** opens a search/manual modal and shelves the book as "Not started" |
| Library folders (#125, F-LIB-03) | Folder create/rename/delete and book membership behind the auth middleware, reusing `lists`/`list_books` (migration 0011); frontend sidebar CRUD and a book-page picker. Branch `feat/125-organize-library` |
| Library tags (#152, F-LIB-04) | Backend done: `user_tags`/`book_tags` (migration 0012), tag/untag routes and `tagIds` in the library. Frontend still mocked. Branch `feat/152-library-tags` |
| Explore (#126, F-EXP-04, F-EXP-01) | `/explore` page with search-as-you-type (fuzzy title, author and ISBN via `pg_trgm`, `GET /book?q=`) and Trending / Most read this week lists, `GET /explore`, migrations 0008–0009. Explore page merged in PR #141, fuzzy search in PR #142. Open Library fallback (#120) in PR #144; manual add of a missing book (#120, F-BOOK-02) from the search results |
| E2E tests (#127) | 16 Playwright tests and the `e2e.yml` workflow written, not run yet (fixtures and secrets missing) |
| Reviews (#122, F-LIB-02) | Rate 1–5 with an optional comment, edit and delete, only for In progress, Finished or DNF books. Book page shows my, friends' and public reviews and the public average; profile lists my reviews. Migration 0010. Draft PR #150 |
| Home (#148, F-HOME-01) | Real reading, groups (challenges with rank, book clubs), pending friend/group invites, friends reading now and group comments on `/home`; section skeletons while each load runs; streak and goals stay from the prototype until their APIs exist |
| Planning | Sprints planned on the [prioritized backlog](https://github.com/orgs/MESW-LES-2627/projects/23): 8 stories (49 points) in Iteration 2 (#120 to #127) |

## Log

### 2026-11-07: One GitHub Release per sprint

- Commit `5f7c586`, PR [#117](https://github.com/MESW-LES-2627/les-project-group-6/pull/117).
- **Decision: GitHub Releases are one per sprint, named `iter-0` to `iter-4`.** Asked for by the class: every merge that deployed a `feat` or `fix` made a release, so there were ten (`v0.1.0` to `v0.9.0`) after two sprints.
- [`release.yml`](../../../.github/workflows/release.yml) still runs semantic-release after each prod deploy, but `@semantic-release/github` was removed from the `release` key of `package.json`, so it only pushes the `vX.Y.Z` tag. The ten `v0.x` GitHub Releases were deleted; their tags were kept.
- New [`iteration-release.yml`](../../../.github/workflows/iteration-release.yml), run by hand at the end of the sprint: pick `iter-N` and the commit or branch, it tags it and creates the release (latest) with the iteration's `release_notes.md` and the PRs merged since the previous `iter-*` tag. The tag is pushed with git, because creating it through the API needs the `workflow` token scope. *Rejected:* a Friday schedule, because the end of a sprint can move and a wrong release is worse than a forgotten click.
- Past sprints released by hand: [`iter-0`](https://github.com/MESW-LES-2627/les-project-group-6/releases/tag/iter-0) on `ab9a315` (last merge of the first week, 2026-10-23, same commit as `v0.1.0`) and [`iter-1`](https://github.com/MESW-LES-2627/les-project-group-6/releases/tag/iter-1) on the existing tag `31f0e69` (2026-11-06). `iter-2` is next Friday.
- Documented in the README "Production deploy and versions" section.

### 2026-11-07: Login is by email only

- Commit `6015c62`.
- **Decision: the login form asks for an email, not "email or username".** Username login was never wired up: typing a username only showed "Username sign-in is not available yet". Supabase signs in by email, and mapping a username to an email needs a public lookup that leaks users' emails. *Rejected:* a backend username → email endpoint, for that reason.
- [`LoginView.vue`](../../../apps/frontend/src/views/LoginView.vue) now has an `Email` field (`type="email"`); [`auth.ts`](../../../apps/frontend/src/services/auth.ts) takes `email` and the unused username resolver hook and its message were removed. Tests and the [frontend README](../../../apps/frontend/README.md) updated. Usernames are still chosen at sign-up and shown in the app.

### 2026-11-08: Sprint planning with user stories and a prioritized backlog

- **Decision: we plan each one-week sprint from a prioritized backlog of user stories.** Asked for by the class: until now we picked tasks from the kanban ([project 9](https://github.com/orgs/MESW-LES-2627/projects/9)) with no priority, no plan and no acceptance criteria.
- **Board:** [project 23 "Sprint goals"](https://github.com/orgs/MESW-LES-2627/projects/23). Its `Iteration` field was changed from 2-week sprints to one week: Iteration 2 (2026-11-09 to 11-15), 3 (11-16 to 11-22), 4 (11-23 to 11-29). Each story has `Priority` (org issue field), `Estimate` (story points, Fibonacci) and `Iteration`. Items with no iteration are the unplanned backlog.
- **Stories:** issues with the new `user story` label and type Feature: a story sentence, Gherkin scenarios, and the technical tasks as sub-issues. New template [`00-user-story.yml`](../../../.github/ISSUE_TEMPLATE/00-user-story.yml).
- **Iteration 2 plan, in priority order** (49 points; the bottom stories move to Iteration 3 if not finished):

  | # | Story | Priority | Pts | Tasks |
  |---|---|---|---|---|
  | [#120](https://github.com/MESW-LES-2627/les-project-group-6/issues/120) | Search any book, add it if missing | High | 8 | #45 #48 #50 #51 #32 #35 #37 |
  | [#121](https://github.com/MESW-LES-2627/les-project-group-6/issues/121) | Reading streak and total minutes on my profile | High | 5 | #31 #34 #54 #60 |
  | [#122](https://github.com/MESW-LES-2627/les-project-group-6/issues/122) | Rate and review a book I read | High | 5 | #26 #27 |
  | [#123](https://github.com/MESW-LES-2627/les-project-group-6/issues/123) | Find a user by username, see the profile, send a friend request | High | 8 | #33 #36 #58 |
  | [#124](https://github.com/MESW-LES-2627/les-project-group-6/issues/124) | Challenge ends with a winner (left over from project 9) | High | 5 | #68 #69 #61 |
  | [#125](https://github.com/MESW-LES-2627/les-project-group-6/issues/125) | Organize my library in my own folders (mocked today) | Medium | 5 | to split |
  | [#126](https://github.com/MESW-LES-2627/les-project-group-6/issues/126) | Explore page: trending, most read this week, search | Low | 5 | to split, needs #120 |
  | [#127](https://github.com/MESW-LES-2627/les-project-group-6/issues/127) | Tech debt: e2e tests for every frontend page | Medium | 8 | to split |

- The old feature parents #9 #11 #15 #16 #17 #18 #19 were closed as superseded by these stories and removed from project 23; their tasks moved under the stories.

### 2026-11-16: Test metrics with make

- New `make coverage` runs each app's `test:coverage` script. Frontend uses `@vitest/coverage-v8` (text, HTML, lcov, json-summary in `apps/frontend/coverage/`); backend uses Node's built-in coverage with an lcov file in `apps/backend/coverage/`.
- **Decision: measure only code that can break.** Excluded: migrations and seeds (`src/database/`), DTOs, `server.ts`, frontend `main.ts`, `types/` and `mocks/`. *Rejected:* `c8` or a Jest migration for the backend, since Node 24 already measures coverage with no new dependency.
- New `make test-history` ([`scripts/test-history.sh`](../../../scripts/test-history.sh)) prints, for each PR merged into `main`, how many source and test files it changed. It is the evidence that tests arrive with each change.
- First run: backend 378 tests pass, 95.4% lines and 93.6% branches (with Postgres up and migrations applied); frontend 172 tests pass, 83.7% statements and 79.8% branches.
- **Decision: CI fails below 95% line coverage** in both apps (`--test-coverage-lines=95` in the backend, `thresholds.lines` in [`vitest.config.ts`](../../../apps/frontend/vitest.config.ts)). Backend and Frontend CI now run `test:coverage` and upload the report as an artifact. *Rejected:* a ratchet that locks the current numbers. **The frontend (84.8%) fails the gate until tests are added**, which also blocks frontend prod deploys, since CD calls CI. Start with `services/api.ts` and `chat-socket.ts`.


- Home: make F-SOC-04 friend presence opt-in (a settings choice) and replace the mock streak and goals once their APIs exist.
- Split #125, #126 and #127 into Task sub-issues and assign owners. #126 now has a [spec](../../superpowers/specs/2026-11-11-explore-page-design.md) to split from.
- In project 23, add the views that the API cannot create: **Current sprint** (board, filter `iteration:@current`, columns by Status) and group **Prioritized backlog** by Iteration.
- Check and close the open issues that look done in the code: #10 #25 (book page), #28 #30 (library and status), #43 #49 (session API and summary), #52 #55 #59 (group invites, done in #107).
- Create the e2e fixtures and GitHub secrets (see the [e2e README](../../apps/frontend/e2e/README.md)), then run the e2e suite twice and the workflow once (#127).
- Review and merge PR #150 (#122, #146).
- Fill in [`release_notes.md`](release_notes.md) before running "Iteration release" for `iter-2`.

### 2026-11-08: Component diagram updated to iteration 1

- New [iteration 1 component diagram](../../oop_assets/component_diagram_iteration_1.png), explained in [`design.md`](../../design.md) next to the [iteration 0 one](../../oop_assets/component_diagram_iteration_0.png). Both show the target architecture, including components not built yet.
- What changed from iteration 0: new Auth middleware, Users management, Social links, Group management and Book club services; Challenge management became the Book challenge service; the Leaderboard sync and Search engine services were removed (leaderboards are worked out when read, and book search is part of Books management).
- `design.md` now has a contents list and is organised by OOP iteration (1 to 3), each with a class diagram and a component diagram, plus event storming in iteration 1 and a change analysis in iteration 2. The two existing component diagrams are under iterations 1 and 2.
- Added UML class diagrams of the domain (Mermaid in [`design.md`](../../design.md), PNGs in `oop_assets/`) for OOP iterations 1 and 2. **Decision:** `Group` is an abstract class with `ChallengeGroup` and `BookClub` as subclasses, because both share members, roles, invites and chat; the leaderboard is a derived attribute instead of a stored class, matching the "computed on read" decision in `infra.md`.
- Wrote the [change analysis](../../oop_assets/change_analysis.md) for OOP iteration 2, linked from `design.md`. Scenario: adding book clubs. It includes a coupling analysis with the Balanced Coupling model ([modularity skill](https://github.com/vladikk/modularity)), a cohesion analysis, and the decision: a shared `Group` kernel with one module per kind of group (`7a919bd`, `2f8830c`). It also records three follow-ups as debt. The critical one is that the challenge standings and the club progress queries both repeat the counted-minutes rule by reading `reading_sessions` directly.

### 2026-11-08: Fixed the coupling problems found in the change analysis

- Branch `refactor/group-coupling`, commits `d1f3e37` and `ee0c762`. Not merged yet.
- **Reading activity through contracts.** Reading Session now publishes `ReadingActivityQuery` (which minutes count) and Reading Status publishes `ReadingProgressQuery`. Challenge standings and book club progress call them instead of reading `reading_sessions` and `reading_status` directly, so the counted-minutes rule lives in one place. *Rejected:* keeping the two read-side queries (CQRS) as they were, because they duplicated a core rule in two modules.
- **Group kind stored on the group.** Migration [0006](../../../apps/backend/src/database/migrations/0006_group_kind.sql) adds `groups.kind`, filled from `book_clubs` for existing rows (checked on a scratch database). The group roster and invite repositories no longer join `book_clubs`.
- Left as known debt: the club reads `updatedAt` as the finish date, and two modules still write their admin's `member` row. See section 7 of the [change analysis](../../oop_assets/change_analysis.md).
- **Tests.** Backend 190 passing (4 new integration tests for the activity query and the challenge standings).
- **Deploy:** migration 0006 runs with the CD on merge. No new environment variables.
- **CI:** `scripts/check-commits.sh` was removed with the `scripts/` folder (`fbbdf9a`), but `commitlint.yml` still called it, so the commit check failed on every pull request. The same check now runs inline in the workflow, and the README no longer lists `infra/` and `scripts/`.

### 2026-11-08: Event storming added to the design

- New [event storming board](../../oop_assets/eventstorming.png), shown in [`design.md`](../../design.md) under iteration 1, which was a placeholder until now.
- It maps the event flow in six subdomains (Authentication, Search engine, Group Sessions, Chat, Library, Profile) and marks the aggregates: User Account, Book, Book Challenge, Reading Session, Chat Message, Review and Reading Status.

### 2026-11-11: Friend request API behind the auth middleware (#33)

- PR [#114](https://github.com/MESW-LES-2627/les-project-group-6/pull/114) closing [#33](https://github.com/MESW-LES-2627/les-project-group-6/issues/33), for [F-SOC-01](../../requirements/requirements.md). Adds the `Friendship` aggregate (`request`, `accept`, `decline`), `FriendService`, the repository methods (`findById`, `findBetween`, `pendingFor`, `save`, `delete`) and [`friend-routes.ts`](../../../apps/backend/src/features/friend/friend-routes.ts). The original work log is in the [iteration 1 LLM log](../1/LLM_LOG.md).
- The branch was written before auth landed, so the requester came from `requesterId`/`userId` in the body, query or path. After merging `main` the routes sit behind `authenticate` + `requireUser` and take the reader from the token (`currentUserId`), like every other protected route: `POST /friend-requests` only takes `targetUserId`, `GET /user/:userId/friend-requests` became `GET /me/friend-requests`, and accept, decline and remove no longer read a `userId`. `GET /me/friends` (already used by the frontend) is kept. *Rejected:* keeping `/user/:userId/...` paths, because any reader could read another reader's requests.
- Integration tests now send a `FakeAuthProvider` token, check `401` without one, and check that a `requesterId` in the body is ignored. Documented in the [backend README](../../../apps/backend/README.md) and [`api_routes.md`](../../architecture/api_routes.md).

### 2026-11-11: Reading status dates and library routes behind the auth middleware (#28)

- PR [#115](https://github.com/MESW-LES-2627/les-project-group-6/pull/115) for [F-LIB-01](../../requirements/requirements.md): `started_on`/`finished_on` on `reading_status`, set on status changes and checked (`finishedOn` not before `startedOn`), `ensureInProgress` when a reading session starts, and delete and library routes. The original work log is in the [iteration 1 LLM log](../1/LLM_LOG.md).
- **Migration renumbered.** The branch's `0004_tidy_scorpion` clashed with `main`'s 0004 to 0006, so it was dropped and regenerated on top of them as [0007](../../../apps/backend/src/database/migrations/0007_reading_status_dates.sql) (same two `ALTER TABLE`s). It runs with the CD on merge.
- **Auth.** After merging `main` every route takes the reader from the token: `userId` in the body, query or path is ignored, `DELETE /reading-status/:id` now reports another reader's entry as not found (like `PATCH`), `DELETE /user/:userId/library/:bookId` became `DELETE /me/library/:bookId`, and `GET /library?userId=` was removed because `GET /me/library` already does it. *Rejected:* keeping the `userId` routes, because any reader could change another reader's library.
- **CI.** `scripts/check-commits.sh` was removed on `main`, so the PR's change allowing the `db` commit type moved into the inline check in [`commitlint.yml`](../../../.github/workflows/commitlint.yml) (the branch has a `db:` commit).
- Documented in the [backend README](../../../apps/backend/README.md) and [`api_routes.md`](../../architecture/api_routes.md).

### 2026-11-11: Explore page spec (#126)

- Commit `8557e66`. New [Explore page design](../../superpowers/specs/2026-11-11-explore-page-design.md) for story [#126](https://github.com/MESW-LES-2627/les-project-group-6/issues/126) (F-EXP-04, F-EXP-01). It covers a big search bar, a "Trending" list (most readers who added the book in 7 days) and a "Most read this week" list (most counted minutes in 7 days). The layout follows the old Explore mockup (`08-explore.png`) and reuses the global classes, `BookCoverImage` and the page header.
- **Decision: search is inline on Explore and reuses `GET /book?title=`.** When #120 lands, only the endpoint behind it changes. *Rejected:* a separate `/search` page, because that page belongs to #120.
- **Decision: `GET /explore` is served by an `ExploreService` that asks the published read contracts** (`ReadingActivityQuery.topBooks`, `ReadingProgressQuery.mostAdded`) and loads books with `findByIds`. *Rejected:* a query that reads `reading_sessions` and `reading_status` directly, because it would bring back the coupling fixed in `d1f3e37`.
- **Decision: "added to library" needs `reading_status.created_at`** (migration 0008, backfilled from `updated_at`), because `started_on` is the date reading started, not the date the book was added.
- Out of scope: reader search, friends and genre trending, Open Library, and trending on Home.

### 2026-11-11: Explore page built (#126)

- Branch `feat/explore-page`, commits `b1bb54b` to `dbd1f85`, following the [spec](../../superpowers/specs/2026-11-11-explore-page-design.md) and the [plan](../../superpowers/plans/2026-11-11-explore-page.md). Not merged yet.
- **Backend.**
  - [Migration 0008](../../../apps/backend/src/database/migrations/0008_reading_status_created_at.sql) adds `reading_status.created_at`, filled from `updated_at` for existing rows. It runs with the CD on merge.
  - The published contracts gained `ReadingActivityQuery.topBooks` (same counted-minutes rule) and `ReadingProgressQuery.mostAdded`, and `IBookRepository` gained `findByIds`.
  - The new `ExploreService` builds both lists over the last 7 days (10 books each, ties by title) without reading another module's tables, and `GET /explore` serves them (see [API routes](../../architecture/api_routes.md)).
- **Frontend.**
  - New `/explore` page ([`ExploreView.vue`](../../../apps/frontend/src/views/ExploreView.vue)) and the header's Explore link.
  - Built with `ExploreSearchBar`, `BookSearchResults` and `TrendingBookCard`, plus the existing global classes and `BookCoverImage`.
  - The search uses the existing `GET /book?title=` and keeps the query in `?q=`.
  - `GroupsPageHeader` moved to `layout/PageHeader`, since it has no groups logic.
- **Tests.** Backend 271 passing (11 new); frontend 138 passing (11 new). The page was checked in a headless browser at desktop and 375px widths with a mocked API, because there was no local Supabase setup.
- Open: when #120 lands, Explore's search should use its endpoint. Authors show "Unknown Author" until books store an author.

### 2026-11-11: Header search removed (#126)

- The header's search field (and its phone toggle) is gone: it emitted a `search` event nothing listened to, and book search now lives on the [Explore page](../../../apps/frontend/src/views/ExploreView.vue). The Explore column now takes the full page width like Home (`width: 100%`; the app shell is a flex column, so it had shrunk to its content).
- The Explore API test now backdates its `reading_status` row: the Docker Postgres clock ran a few ms ahead of Node, so a row stamped `now()` fell just after the window end.

### 2026-11-11: Trending suggestions while nothing trends (#126)

- **Decision: with no "added this week" activity, `GET /explore` returns `suggestions`**, up to 10 random books from the catalogue (`IBookRepository.random`, `ORDER BY random()`). The Trending tab shows them with a note, without the "#1" tag and with "A pick to start with" instead of a reader count. Real trending replaces them as soon as one book is added. *Rejected:* padding `trending` with random books, because it would show fake reader counts; and picking them in the frontend, because there is no endpoint that lists the catalogue.
- "Most read this week" keeps its empty message.


### 2026-11-11: Book search design: fuzzy, search-as-you-type (F-EXP-01)

- [Spec](../../superpowers/specs/2026-11-11-book-search-design.md) for typo-tolerant search on title, author and ISBN, with results that update while the reader types on Explore. Not built yet.
- **Decision: Postgres `pg_trgm` + `unaccent`** (migration 0009, GIN trigram indexes, `word_similarity`). *Rejected:* Elasticsearch / OpenSearch (another service to host and keep in sync, built for scale and features we don't need), and full-text search (no typo tolerance).
- **Decision: `GET /book?q=` replaces `GET /book?title=`** for both Explore and the groups `BookPicker`, so the app has one search behaviour.
- **Decision: Explore searches 300 ms after the last keystroke** (2+ characters), using `router.replace` while typing and `router.push` on Enter.

### 2026-11-11: Fuzzy search-as-you-type built (F-EXP-01)

- Built from the [spec](../../superpowers/specs/2026-11-11-book-search-design.md) and the [plan](../../superpowers/plans/2026-11-11-book-search.md), commits `9d81c81` to `66b44d4`.
- **Backend.**
  - [Migration 0009](../../../apps/backend/src/database/migrations/0009_book_search.sql) enables `pg_trgm` and `unaccent` and adds trigram indexes on book titles and author names.
  - `IBookRepository.search` replaces `findByTitle`: typo-tolerant title and author matching (`word_similarity`, threshold 0.5), and an ISBN-13 prefix with or without hyphens. Results come best match first.
  - `GET /book?q=` replaces `?title=` (see [API routes](../../architecture/api_routes.md)).
- **Decision: threshold 0.5, not the default 0.6.** "hary poter" scores exactly 0.6 against "Harry Potter…". Known limit: a swapped-letter typo in a 4-letter word ("dnue") is not found.
- **Decision: one indexed query per branch, joined with `UNION`.** A single `OR` across title, author and ISBN made Postgres scan every book (about 900 ms against 3–10 ms on 50k books, found in code review). For the same reason the ISBN prefix is a digit range on the btree, not `LIKE`.
- **Frontend.**
  - Explore searches 300 ms after the last keystroke (2+ characters). It replaces `?q=` while the reader types and pushes it on Enter, and cancels older requests.
  - `BookPicker` uses the same search unchanged.
- **Tests.** Backend 290 passing (19 new); frontend 145 passing (7 new).
- Follow-up: an index on `book_authors(author_id)` would speed up author matches on large catalogues.

### 2026-11-11: Open Library fallback designed (#120, F-EXP-01)

- New [spec](../../superpowers/specs/2026-11-11-open-library-fallback-design.md). When the local search finds fewer than 5 books, `GET /book?q=` asks Open Library through a `BookCatalog` port and imports the hits (keyed by ISBN-13) into `books`, so the database stays the source of truth and the frontend does not change.
- **Decision: import on search.** *Rejected:* import only when a reader picks a result (temporary ids, a new endpoint, frontend changes) and adding more seed books only (does not deliver #120).
- **Decision: no Redis.** Postgres caches book data; an in-memory `LRUCache` from the `lru-cache` package (1 h) caches Open Library queries; covers stay in the browser's HTTP cache. An Explore list cache is a follow-up.

### 2026-11-11: Open Library fallback built (#120, F-EXP-01)

- Built from the [spec](../../superpowers/specs/2026-11-11-open-library-fallback-design.md) and the [plan](../../superpowers/plans/2026-11-11-open-library-fallback.md), commits `bf444ea` to `fc41aa1`, draft PR [#144](https://github.com/MESW-LES-2627/les-project-group-6/pull/144).
- `BookCatalog` port with an `OpenLibraryCatalog` adapter (3 s timeout, `lru-cache` for 1 h). `BookService.search` imports its books when fewer than 5 match locally. New `findByIsbn` and `saveWithAuthors` on the book repository. New setting `OPEN_LIBRARY_URL`; new dependency `lru-cache`.
- **Tests.** Backend 308 passing (18 new). A real search for "the hobbit" returned 3 books with ISBN-13, authors and cover-id URLs.
- **Review fixes** (`33df6c6`, `40d2c9a`, `52dd9d9`): catalogue ISBNs are looked up in one query (`findByIsbns`) and only missing books are imported; a failed import is logged and skipped instead of failing the search; the search text is no longer logged. Duplicate authors under concurrent imports moved to [#143](https://github.com/MESW-LES-2627/les-project-group-6/issues/143).
- Follow-ups: Open Library titles can contain HTML entities (`&amp;`) and `first_sentence` may be in another language; the Explore list cache.

### 2026-11-11: Add a missing book by hand (#120, F-BOOK-02)

- On Explore, the search results end with **Add this book**. It opens a form (title prefilled with the search, author, pages, ISBN-13, description; only the title is required, "Title is required" otherwise). Saving creates the book with `POST /book`, puts it on the shelf as "Not started" with `PUT /library/:bookId`, and opens its book page. The cover is the default one that shows the title.
- `POST /book` now accepts `authors` (one name or a list) and saves them with `saveWithAuthors`, so the book is found by author too. A book whose ISBN-13 already exists is returned instead of duplicated.
- **Decision: no cover upload yet.** It needs file storage; left for a follow-up.
- **Tests.** Backend 309 passing (1 new); frontend 150 passing (5 new). Commits `42259ec`, `06db85f`, draft PR [#145](https://github.com/MESW-LES-2627/les-project-group-6/pull/145).

### 2026-11-12: Library folders built (#125, F-LIB-03)

- Branch `feat/125-organize-library`. The library folders are no longer mocked: readers can create, rename and delete private folders, put a book in several folders, and filter the library by folder. Deleting a folder never removes a book from the library or changes its reading status.
- **Decision: reuse `lists` and `list_books` instead of new folder tables.** They already model one owner and many books per list; folders are the `user_id`-owned rows and group lists keep `group_id`. [Migration 0011](../../../apps/backend/src/database/migrations/0011_library_folders.sql) adds a partial unique index on `(user_id, lower(name))` where `user_id is not null`, so folder names are unique per reader ignoring case and group lists are untouched. *Rejected:* new `folders`/`folder_books` tables, because they would duplicate the relation the schema already has.
- **Backend.** New [`features/library-folder/`](../../../apps/backend/src/features/library-folder/) feature with the `Folder` aggregate (`FolderName` trims and caps at 100 characters), `IFolderRepository` + `DrizzleFolderRepository`, `LibraryFolderService`, `FolderDto` and owner-scoped routes under `/me/library/folders`. The `LibraryMembership` port (implemented with `ReadingStatusRepository`) refuses to add a book that is not already in the reader's library. Duplicate names answer `409` with exactly `You already have a folder with this name` (`FOLDER_NAME_TAKEN`), including a race caught as a Postgres unique violation. `GET /me/library` now includes `folderIds` for each book. Routes are in [`api_routes.md`](../../architecture/api_routes.md) and the [backend README](../../../apps/backend/README.md).
- **Frontend.** The [library sidebar](../../../apps/frontend/src/components/library/LibrarySidebar.vue) creates folders inline and renames/deletes each row; [`LibraryView.vue`](../../../apps/frontend/src/views/LibraryView.vue) loads folders from the API and keeps the mock folders when there is no session. The [book page](../../../apps/frontend/src/views/BookDetailView.vue) passes folder objects to [`BookReadingPanel.vue`](../../../apps/frontend/src/components/library/BookReadingPanel.vue), which toggles several folders at once and leaves the reading status alone.
- **Tests.** 9 new backend unit tests and an integration suite for the folder API and `folderIds` (Postgres required); 7 new frontend tests across the sidebar, library view and book page. The local Postgres was not running, so the integration suite runs in CI.

### 2026-11-13: e2e tests designed (#127)

- New [spec](../../superpowers/specs/2026-11-13-e2e-tests-design.md) for one main-path Playwright test per frontend route, run against the production build, the real backend and the shared database. A `setup` project signs in once as a dedicated test user and reuses the session.
- **Decision: production database, dedicated test user.** The project is academic. Tests only create and remove rows their own user owns; no truncation or reseeding.
- **Decision: permanent test fixtures, only reversible actions.** The backend has no delete route for groups, books or profiles, so tests use a fixed group and seeded book owned by the test user and only change shelf, status and session state. *Rejected:* creating new data in each test (piles up in the database), test-only delete routes.
- **Decision: a GitHub Actions workflow (`e2e.yml`) builds and starts the stack, on `main` pushes and manual dispatch only, not a PR check.** *Rejected:* running on every PR (writes test rows to the shared database each time), local only (nothing enforced). The spec lists this and the shared database as deviations from #127's acceptance criteria.

### 2026-11-13: e2e tests built (#127)

- Built from the [spec](../../superpowers/specs/2026-11-13-e2e-tests-design.md) and the [plan](../../superpowers/plans/2026-11-13-e2e-tests.md): commits `1099dac` to `b1d8079` (Playwright setup, helpers, shared login, a spec for every route) and `b997c5c` (the [`e2e.yml`](../../../.github/workflows/e2e.yml) workflow). See the [e2e README](../../../apps/frontend/e2e/README.md).
- 13 tests are written and listed by `playwright test --list`, but they have **not been run yet**: the fixtures (test users, book, group) do not exist and the GitHub secrets are not set. The workflow has not run either.
- Deviation from the plan: `apps/frontend/.gitignore` has `!.env.e2e.example`, because the root `.gitignore` ignores `.env.*`.
- Code review fixes (`90ec8f8`): the login submit and the `?redirect=` check would have failed every run; the profile reset now refuses to delete a user it did not create; the session test needs the fixture book in "reading" and fails clearly if another session is running. Draft PR [#149](https://github.com/MESW-LES-2627/les-project-group-6/pull/149).

### 2026-11-13: Rate and review a book (#122, F-LIB-02)

- Designed and built from the [spec](../../superpowers/specs/2026-11-13-rate-review-book-design.md) and the [plan](../../superpowers/plans/2026-11-13-rate-review-book.md), branch `feat/rate-review-book`, draft PR [#150](https://github.com/MESW-LES-2627/les-project-group-6/pull/150).
- **Backend.** New `features/review/` module on the existing `reviews` table: `Rating` (1 to 5) and `ReviewComment` (trimmed, up to 2,000 characters) value objects, a `Review` aggregate, a Drizzle repository that upserts on `(user_id, book_id)`, a `ReviewQuery` read model and a `ReviewService`. Each `ReadingState` now says whether it `allowsReview`. Routes `PUT`/`DELETE /book/:bookId/review`, `GET /book/:bookId/reviews` and `GET /users/:userId/reviews` (see the [backend README](../../../apps/backend/README.md)). Migration `0010_review_per_book` adds `updated_at`, the unique constraint and an index.
- **Frontend.** `BookThoughtsPanel` saves, edits and deletes my review and is disabled with a hint for Not started books. The book page's friend and public lists and the public average come from the API; the sort control, "Read more" and "found helpful" were removed. The profile has a new Reviews section.
- **Decision: one review per reader per book**; saving again replaces it. *Rejected:* one per read-through (needs a link to each finished read).
- **Decision: who sees a review follows the author's profile** (public: everyone; private: the author and accepted friends), and only public profiles count in the average (F-LIB-02 rule 5, Q4). The audience selector in the mock was removed. *Rejected:* a per-review audience setting.
- **Decision: the public list shows the 10 newest reviews only.** Sorting and "Read more" wait for a later story.
- Note: the board split this story into review (#122) and comment (#146) the same day; this work also covers the comment.
- **Tests.** Backend 349 passing (40 new); frontend tests for the panel, book page and profile updated and added. `make check` passes.

### 2026-11-13: Home page with real reading, groups and invites (#148, F-HOME-01)

- [HomeView.vue](../../../apps/frontend/src/views/HomeView.vue) now loads the reader's library and active session, active challenge groups with the reader's rank, book clubs and pending friend/group invites. The parts without an API (streak, year goals, activity, friends reading now, trending) keep the prototype's mock data.
- **Decision: one independent load per section.** Reading, groups and invites have their own loading and error state, so a failing section shows a short error without blanking the page. Challenge details load with `Promise.allSettled`, so a group without standings still shows its name and days left.
- **Decision: one-click start or resume.** The hero uses the book of the running session when there is one, otherwise the most recently updated book in progress. The button reads "Resume session" for that book and "Start session" otherwise; other in-progress books are listed under "Also in progress".
- Empty states: a new reader is invited to add a first book or explore books; empty groups and invites show a short message instead of an error. Accepting a group invite calls `POST /group-invites/:id/accept`, removes it from the list and reloads the groups.
- New frontend API helpers `getActiveReadingSession`, `getFriendRequests` and `answerFriendRequest`; the shared `isSignedIn` computed lives in the [session store](../../../apps/frontend/src/stores/session.ts). The friend-request DTO has no display name yet, so real requests show "A reader" until the backend returns one.
- **Tests.** New [HomeView.api.spec.ts](../../../apps/frontend/src/views/__tests__/HomeView.api.spec.ts) covers resume, start, also-in-progress, rank and days left, both invites, the empty states and one failing section; the signed-out prototype tests still pass. Frontend 157 passing, typecheck and lint clean.

### 2026-11-13: Home circle sections from real data (#148, F-SOC-03, F-SOC-04)

- **Backend.** New read-side [`features/circle/`](../../../apps/backend/src/features/circle/circle-query.ts) with three routes: `GET /me/friends/reading`, `GET /me/circle/comments?limit=` and `GET /me/friends/trending` (see [API routes](../../architecture/api_routes.md)). [`CircleService`](../../../apps/backend/src/features/circle/circle-service.ts) asks the Friend feature for the reader's friends, so friendship rules stay out of the query; [`DrizzleCircleQuery`](../../../apps/backend/src/features/circle/circle-query.ts) does the joins.
- **Decision: "Reading now" is one book per friend and only needs an in-progress status**, not a new setting. A running session marks that book `readingNow` and wins over a book updated more recently; friends reading right now are sorted first. The opt-in from F-SOC-04 is not modelled yet, so see the follow-up below. *Rejected:* returning every in-progress book per friend, because the Home card is one line per friend.
- **Decision: "From your circle" is the existing group chat, read across groups.** Comments are non-deleted `text` messages from every group the reader belongs to (challenges and book clubs share `member`), newest first, default 5 and at most 20. System messages ("X joined the group") are left out. *Rejected:* a separate comments table or comments on activity events, because the chat already stores the discussion and has no event feed to attach to.
- **Decision: "Trending among friends" is the Explore ranking scoped to friends.** Books ranked by distinct friends who added them in the last 7 days (`reading_status.created_at`), top 6, ties by title. Empty list when nothing was added.
- **Frontend.** [`HomeView.vue`](../../../apps/frontend/src/views/HomeView.vue) loads the three sections independently, each with its own loading, error and empty state; signed-out visitors keep the mock. The circle comments link to their group, and the reading-now list shows a dot when a session is running. New helpers `getFriendsReading`, `getCircleComments` and `getFriendsTrending` in [`api.ts`](../../../apps/frontend/src/services/api.ts); new `HomeFriendReading` and comment-link types in [`types/home.ts`](../../../apps/frontend/src/types/home.ts).
- **Tests.** Backend unit `circle-service.test.ts` and integration `circle-api.test.ts` (routes guarded, reading-now ordering and active-book preference, comment filtering/limit and non-member exclusion, 7-day trending, empty lists). Frontend Home tests cover the three sections, their empty states and a failing section. The integration test needs PostgreSQL and was not run in this environment.
- **Follow-ups.** F-SOC-04 presence should become opt-in (a setting) before friends can be shown as reading right now; the README status and the Home mock for streak and goals remain.

### 2026-11-13: "Trending among friends" removed from Home (#148)

- Removed the **Trending among friends** section and its backend support added earlier the same day. The Home page now ends with the groups/circle columns; the bottom padding moved to `.home`.
- Backend: dropped `GET /me/friends/trending`, `CircleQuery.trending`, the service method and the 7-day ranking code. The remaining circle routes are `GET /me/friends/reading` and `GET /me/circle/comments` (see [API routes](../../architecture/api_routes.md)).
- Frontend: removed `getFriendsTrending` and `ApiFriendTrending`, the `TrendingBook`/`HomeData.trending` types, the Home mock entries and the section's loading, error and empty states. The three now-unused cover imports left `mocks/home.ts`.
- **Decision: remove the endpoint too, not only the card.** Keeping a route nothing calls would be dead code with its own tests and docs. The Explore page keeps its own trending list, which is a different feature (all readers, `GET /explore`).
- Tests: removed the trending cases from `circle-service.test.ts`, `circle-api.test.ts` and `HomeView.api.spec.ts`; the reading-now and comments tests remain.

### 2026-11-13: Add a book from the Library (F-LIB-01, F-BOOK-02)

- The **Add book** button in the [library plate](../../../apps/frontend/src/views/LibraryView.vue) now opens a modal ([`AddBookModal.vue`](../../../apps/frontend/src/components/library/AddBookModal.vue)) instead of doing nothing. It works like Explore: search the catalog by title, author or ISBN (300 ms after the last keystroke) and add a result, or open the manual form to create a book no source knows.
- **Reuse, no new API.** The modal calls the existing `searchBooks` (`GET /book?q=`), `addBook` (`POST /book`) and `addToLibrary` (`PUT /library/:bookId`). The manual form is the Explore [`AddBookForm`](../../../apps/frontend/src/components/explore/AddBookForm.vue). A new book is shelved as **Not started** (F-LIB-01) and the library switches to **All books** so it is visible.
- **No duplicate adds.** Books already on the shelf show **In library** instead of **Add**; sending `not-started` for an in-progress or finished book would move it back on the shelf.
- New shared modal shell [`components/common/AppModal.vue`](../../../apps/frontend/src/components/common/AppModal.vue): labelled dialog, backdrop and Escape to close, focus trap and restored focus, page scroll locked. The signed-out prototype still adds a manual book locally, without the API.
- **Tests.** 7 tests for `AddBookModal`, 3 for `AppModal`, and 1 for the library view (open the modal, add by hand, see the book). Frontend 191 passing; typecheck, lint and format clean. Frontend README updated.

### 2026-11-13: Book page skeleton while loading

- Opening a book from the library briefly showed **Book not found** before its details: the view rendered the missing state until `GET /me/library` or `GET /book/:id` answered. The [book page](../../../apps/frontend/src/views/BookDetailView.vue) now has a `loading` flag and renders a new [`BookDetailSkeleton.vue`](../../../apps/frontend/src/components/library/BookDetailSkeleton.vue) that mirrors the hero and three-column layout (cover, panels and rail) while the request runs. The missing state only shows after the API confirms that the book does not exist.
- **Race guard.** A request token stops a slower response for the previous `:bookId` from replacing the current book when the route changes, and the cached `apiBook` and reviews are cleared on navigation.
- **Tests.** A new `BookDetailView` test holds the library request open, checks the skeleton is shown and "Book not found" is not, then resolves it and checks the title. Frontend 192 passing; typecheck, lint and format clean.

### 2026-11-13: Home section skeletons while loading

- Each Home section now shows a shimmer placeholder instead of a plain "Loading…" line while its request runs, so the page keeps its shape until the data arrives. The [home view](../../../apps/frontend/src/views/HomeView.vue) has skeletons for the bedside book, groups, circle comments, friends reading now and pending invites, all built from the design tokens with a reduced-motion fallback.
- **Decision: one skeleton per section, not a full-page loader.** The sections load independently (reading, groups, invites, friends, circle), so a full-page loader would hide the sections that are already ready. Each skeleton keeps its section's height and heading, and the real empty/error state only shows once that request finishes.
- **Accessibility.** Every skeleton block is `role="status"` with `aria-busy="true"` and an `.sr-only` label ("Loading your reading…", etc.); the decorative bars are `aria-hidden`.
- **Tests.** A new `HomeView.api.spec.ts` test holds all five requests open, checks the skeletons and their screen-reader labels are shown and the empty states are not, then resolves them and checks the empty states replace the skeletons. Frontend 193 passing; typecheck, lint, format and build clean.

### 2026-11-13: Library folder form layout

- The **New folder** and **Rename** forms in the [library sidebar](../../../apps/frontend/src/components/library/LibrarySidebar.vue) put the name field and both actions on one line in the 220px column, which left the controls cramped. The field now spans the row and **Create**/**Cancel** (or **Save**/**Cancel**) sit side by side below it.
- **Polish.** Opening the create form focuses the name field, the submit button stays disabled until the name has visible characters, and **Escape** cancels either form. The buttons now match the input height and the sidebar's font size.
- **Tests.** A new `LibrarySidebar` test covers the disabled submit and the Escape cancel. Frontend 194 passing; typecheck, lint and format clean.

### 2026-11-18: Home e2e coverage (#148, #127)

- Extended [`apps/frontend/e2e/home.spec.ts`](../../../apps/frontend/e2e/home.spec.ts) from the single greeting check to four tests for the real-data Home: the hero book and its session link, all sections loading without an alert, the groups matching the API, and the section skeletons while the Home requests are held.
- **Decision: derive expectations from the API.** The tests call `GET /me/library`, `/me/reading-sessions/active`, `/me/groups` and `/me/book-clubs` with the test user's token and compare the page against the responses. That way they do not depend on the optional fixtures (friends, invites, comments) that the shared test user may not have. The skeleton test delays every `/api/me/**` response with Playwright's routing, so the loading state is deterministic.
- **Not run.** `.env.e2e` and the permanent fixtures (test user, book, group) are still missing, so the suite was only listed (`playwright test --list`: 16 tests in 13 files); typecheck, lint and format pass. The status table now counts 16 tests.

### 2026-11-14: User profile view and friend request (#123, #36, #58)

- Branch `feat/friends-us`. Covers viewing other users' profiles by username and interacting via friend requests.
- **Backend.**
  - Added `getProfileByUsername` on `UserService` (`apps/backend/src/features/user/user-service.ts`) with `IFriendRepository` and `IReadingSessionRepository` injection.
  - Implemented `GET /users/:username` route in `me-routes.ts`. Looks up user profiles case-insensitively, handles self-detection (`isSelf`), evaluates privacy visibility (`F-PROF-02`), checks friendship status with the viewer (`none`, `pending_sent`, `pending_received`, `friends`, `self`), and computes reading streak and reading session statistics.
  - 8 new unit tests in `apps/backend/tests/unit/user-service.test.ts` covering visibility, self view, pending requests, accepted friends, and error handling.
  - Integration test added to `apps/backend/tests/integration/me-api.test.ts`.
- **Frontend.**
  - Added `UserView.vue` (`apps/frontend/src/views/UserView.vue`) for route `/users/:username`. Based on `ProfileView.vue` and `ProfileBookplate.vue` with an actions slot for friendship interactions.
  - Interactive friendship controls: "Add friend" for strangers, "Friend request sent" status, "Accept" and "Decline" buttons for incoming requests, and "Friends" badge with friend removal.
  - Enforces privacy: displays a dedicated private profile card explaining that reading activity and reviews are only visible to confirmed friends. When visible, displays reading streaks (`StreakCalendar.vue`), reading time (`ReadingTime.vue`), and user reviews (`ReviewList.vue`).
  - Redirects to `/profile` if the viewer opens their own username profile.
  - Added API client methods in `apps/frontend/src/services/api.ts`: `getUserProfile`, `sendFriendRequest`, `getFriendRequests`, `acceptFriendRequest`, `declineFriendRequest`, `removeFriend`.
  - Registered route `/users/:username` in `apps/frontend/src/router/index.ts`.
  - Added 9 unit tests in `apps/frontend/src/views/__tests__/UserView.spec.ts` and router test in `apps/frontend/src/router/__tests__/index.spec.ts`.

### 2026-11-15: Reader search on Explore (#123, #58, F-SOC-02, F-EXP-01)

- Extended Explore tab with dedicated reader search matching the book search design.
- **Backend.**
  - Added `search(query, limit)` to `IUserRepository` and implemented in `DrizzleUserRepository`, `InMemoryUserRepository`, and `FakeUserRepository`.
  - Added `searchUsers(rawQuery, limit)` in `UserService` (`apps/backend/src/features/user/user-service.ts`) returning `UserSearchResultDto[]`.
  - Mounted `GET /users?q=` in `me-routes.ts` behind authentication.
  - 3 new unit tests in `user-service.test.ts` and HTTP integration test in `me-api.test.ts`. Backend 248 unit tests passing.
- **Frontend.** 
  - Added `searchUsers` client function in `apps/frontend/src/services/api.ts`.
  - Added [`UserSearchBar.vue`](../../../apps/frontend/src/components/explore/UserSearchBar.vue) matching `ExploreSearchBar.vue` styling.
  - Added [`UserSearchResults.vue`](../../../apps/frontend/src/components/explore/UserSearchResults.vue) displaying matching readers, initials avatar, display name, `@username`, private badge, bio, and "View profile" link.
  - Integrated both search bars and results into [`ExploreView.vue`](../../../apps/frontend/src/views/ExploreView.vue) with debounce and URL synchronization (`?uq=`).
  - Added unit tests: `UserSearchBar.spec.ts`, `UserSearchResults.spec.ts`, and updated `ExploreView.spec.ts`. Frontend 188 unit tests passing.



### 2026-11-15: Prod migrations repaired

- Backend CD (prod) did not start for `1df6167`, `525c948` and `c05a6cd`: GitHub Actions hit the account's spending limit. Migration 0010 never reached prod, so saving a review answered 500 (missing `reviews.updated_at` and the `(user_id, book_id)` constraint).
- Prod had 0011 recorded with an older timestamp (run by hand from the folders branch before its rebase), so `db:migrate` tried 0010 and 0011 together and failed on the existing index. Fixed by hand in one transaction: applied 0010, recorded it, and set 0011's timestamp to the journal value. Then `db:migrate` applied 0012 (tags). Prod now has 13 migrations.
- **Rule from this:** only CD migrates prod. A migration run from a branch can leave history that no longer matches `main`.

### 2026-11-15: Library tags backend (#152, F-LIB-04)

- New story [#152](https://github.com/MESW-LES-2627/les-project-group-6/issues/152), branch `feat/152-library-tags`. Readers can add free tags to books in their library and remove them.
- **Decision: new `user_tags` and `book_tags` tables** ([migration 0012](../../../apps/backend/src/database/migrations/0012_library_tags.sql), RLS on). *Rejected:* reusing `lists` like folders, since a tag has no visibility or group owner and would mix two concepts in one table.
- **Decision: tags are created on first use and deleted when no book has them**, so there is no separate create/rename/delete. Names are trimmed and stored in lower case, unique per reader.
- **Backend.** New [`features/library-tag/`](../../../apps/backend/src/features/library-tag/) feature (`Tag` aggregate, `TagName`, `DrizzleTagRepository`, `LibraryTagService`, routes), reusing the `LibraryMembership` port so only books in the library can be tagged. `GET /me/library` now includes `tagIds`. Routes in [`api_routes.md`](../../architecture/api_routes.md).
- **Tests.** 7 unit tests pass; the integration suite needs Postgres and runs in CI.
- **Next:** frontend (tag a book on the book page, real tags in the library sidebar filter).


### 2026-11-16: Mutation testing and requirement traceability

- New `make mutation` runs Stryker in both apps ([backend](../../../apps/backend/stryker.config.mjs), [frontend](../../../apps/frontend/stryker.config.mjs)). **Decision: mutate only logic** (backend domain model and services, re-checked by the unit tests; frontend stores, services, utils and router). Repositories and routes are left to the integration tests, which are too slow to re-run for every mutant. *Rejected:* in-place mutation for the frontend, since an interrupted run leaves mutated files in `src/`. The sandbox goes in `<repo>/.stryker-tmp/` so `tsconfig.base.json` still resolves.
- First numbers: backend `review.ts` 89.8%; frontend about 75% after 1,031 of 1,158 mutants (the run did not finish). Full runs are still to do.
- New `make traceability` ([`scripts/traceability.mjs`](../../../scripts/traceability.mjs)) joins a `// @req F-…` tag on the first line of each test file with [`features_priority.md`](../../requirements/features_priority.md). All 87 test files are tagged, and the rule is in [AGENTS.md](../../../AGENTS.md). Result: 14 of 17 Core requirements have tests; F-AUTH-02, F-PROF-02 and F-READ-04 have none because they are not built yet.

### 2026-11-16: Mutation testing moved to its own workflow

- New [Mutation workflow](../../../.github/workflows/mutation.yml) runs Stryker for both apps every Monday and on manual dispatch, writes the score per file to the run summary and uploads the HTML report. Stryker's incremental file is cached between runs, so only changed code is mutated again.
- **Decision: not a pull request check.** A full run takes about 25 minutes per app, which would make every PR wait. *Rejected:* running it in Backend and Frontend CI.
