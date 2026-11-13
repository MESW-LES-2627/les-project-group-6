# Iteration 2 log

A running record of what the team did and decided in iteration 2. The [release notes](release_notes.md) are the summary written at the end; this file is the day-to-day history. Newest entries go at the bottom. Earlier iterations are in their own logs ([iteration 0](../iteration_0/log.md), [iteration 1](../iteration_1/log.md)).

**Traceability chain:** requirement ID (`F-XXX-NN`) → GitHub issue (milestone `Iteration 2`) → PR → release notes.

## Status

| Area | State |
|---|---|
| Releases | One GitHub Release per sprint (`iter-0` to `iter-4`), made by hand with `iteration-release.yml`; `vX.Y.Z` stay as tags only. `iter-0` and `iter-1` released |
| Auth (F-AUTH-01) | Login is email and password only; username login removed from the form |
| Friends (F-SOC-01) | Friend request API (send, list incoming, accept, decline, remove) behind the auth middleware (PR #114) |
| Library & reading status (#28, F-LIB-01) | `startedOn`/`finishedOn` dates, delete and library routes behind the auth middleware (PR #115) |
| Explore (#126, F-EXP-04, F-EXP-01) | `/explore` page with search-as-you-type (fuzzy title, author and ISBN via `pg_trgm`, `GET /book?q=`) and Trending / Most read this week lists, `GET /explore`, migrations 0008–0009. Explore page merged in PR #141, fuzzy search in PR #142. Open Library fallback (#120) in PR #144; manual add of a missing book (#120, F-BOOK-02) from the search results |
| E2E tests (#127) | 13 Playwright tests and the `e2e.yml` workflow written, not run yet (fixtures and secrets missing) |
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

## Next steps

- Split #125, #126 and #127 into Task sub-issues and assign owners. #126 now has a [spec](../../superpowers/specs/2026-11-11-explore-page-design.md) to split from.
- In project 23, add the views that the API cannot create: **Current sprint** (board, filter `iteration:@current`, columns by Status) and group **Prioritized backlog** by Iteration.
- Check and close the open issues that look done in the code: #10 #25 (book page), #28 #30 (library and status), #43 #49 (session API and summary), #52 #55 #59 (group invites, done in #107).
- Create the e2e fixtures and GitHub secrets (see the [e2e README](../../apps/frontend/e2e/README.md)), then run the e2e suite twice and the workflow once (#127).
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
