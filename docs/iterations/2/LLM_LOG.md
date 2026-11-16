# LLM Usage Log - Iteration 2

## Template

````markdown
### YYYY-MM-DD: [Short Topic / Task Description]

- **Date:** YYYY-MM-DD
- **Author:** [Name]
- **Model:** [e.g. Gemini 3.8 Flash, Claude Sonnet 4.6, GPT-4o]
- **Tool:** [e.g. Antigravity, ChatGPT, Cursor, GitHub Copilot]
- **Domain:** [e.g. docs, database, architecture, frontend, backend, testing]

#### Prompt
```text
[Insert prompt here]
```

#### Explanation of Changes
[Brief explanation of what was changed, generated, or decided.]
````

---

## Logs

### 2026-11-07: One GitHub Release per sprint

- **Date:** 2026-11-07
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** ci, docs

#### Prompt
```text
currently we have 10 releases being the last one as v0.9.0. However, we have a request to have one release per sprint, being the names as iter-0, iter-1, iter-2, iter-3 and the last one, iter-4. The tags can be a lot, but release must be tjsut these. The next release on the next friday is iter-2. How can we do this? can we trigger the release mannually? this way we will trigger the next one?
```
(Then confirmed: implement it, delete the existing releases, and create the past ones, iter-0 for the first week and iter-1 until 2026-11-06.)

#### Explanation of Changes
Removed `@semantic-release/github` from the semantic-release config so `release.yml` only tags `vX.Y.Z`. Added `.github/workflows/iteration-release.yml`, a manual workflow that tags a commit `iter-N` and creates its GitHub Release from the iteration's release notes plus the PRs since the previous `iter-*` tag. Deleted the ten `v0.x` releases (tags kept) and created `iter-0` (`ab9a315`) and `iter-1` (`31f0e69`). Updated the README, AGENTS.md (current iteration is now 2), the docs index and the iteration 2 log.

### 2026-11-07: Email-only login

- **Date:** 2026-11-07
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** frontend, testing, docs

#### Prompt
```text
ok, so, I'm not being able to login with my username, just the email and pass. In this sense, can we remove the email or username texts, remove the message "Username sign-in is not available yet. Please use your email address."
```

#### Explanation of Changes
Changed the login field from "Email or username" to an `Email` input (`type="email"`) in `LoginView.vue`. In `auth.ts`, `SignInInput.identifier` became `email`, and the unused `UsernameResolver` hook and its "Username sign-in is not available yet" error were removed. Updated `auth.spec.ts` (dropped the username tests), `LoginView.spec.ts`, the frontend README and the iteration 2 log.

### 2026-11-08: Prioritized backlog and sprint plan with user stories

- **Date:** 2026-11-08
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** planning, docs

#### Prompt
```text
https://github.com/orgs/MESW-LES-2627/projects/23/views/1 I created a prioritized backlog that is empty right now. We already have a kanban but the teacher askes us to do like this:
- plan the user stories to be done in each sprint (a week)
currently we are just picking tasks and doing without priority, without planning, without gherkin user stories descriptions. Can we do this here?
for this sprint (iteration_2) i was thinking of: [e2e tests for every page; search a book or add it manually; streak and total minutes on the profile; comments and reviews; library folders; explore page with trends, most read of the week and search; search a user by username, see the profile and send a friend request]
add any missing one from https://github.com/orgs/MESW-LES-2627/projects/9
```
(Then: "can I organize by sprints?", and approved closing the old parent issues.)

#### Explanation of Changes
Checked the code to see which features are still missing or mocked, and added the challenge winner story left over from project 9. Wrote 8 user stories with Gherkin scenarios as issues #120 to #127, moved the existing task issues under them as sub-issues, and closed the old parents. On project 23, changed the Iteration field to one-week sprints and gave each story a Priority, story points and Iteration 2. Added the user story issue template and updated the README and the iteration log. The team still has to review the points and priority order.


### 2026-11-08: Component diagram for iteration 1

- **Date:** 2026-11-08
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** architecture, docs

#### Prompt
```text
@docs/oop_assets/component_diagram_iteration_0.png I made this diagram in the first week of the repo. Something changed during the realease iter-1? can I updated this somehow?
```

#### Result
Compared the iteration 0 component diagram with the backend feature modules, `api_routes.md`, `infra.md` and the iteration 1 log, and listed what changed. Robert redrew the iteration 1 diagram by hand. Claude rewrote `docs/design.md` to explain both diagrams and reviewed the source and target of each arrow against the code.

### 2026-11-08: UML class diagrams for OOP iterations 1 and 2

- **Date:** 2026-11-08
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** architecture, docs

#### Prompt
```text
ok, now, I need to create a class diagram using UML 2.0 for iteration 0 and iteration 1. Based on the differente of the component diagram of iteration 0 and 1, create for me. Some things I remember right now that could be helpful: challenge groups and book clubs maybe are inheritance of groups because they reuse classes. etc. help me, we already have some class implemented but this class diagram is not focused in  implementation but domain.
```

#### Result
Generated two domain class diagrams in Mermaid (UML 2.0 notation: generalization, composition, multiplicities, enumerations, derived attributes) from the two component diagrams, the domain classes in `apps/backend/src/features/` and `table_UML.md`. Added them to `docs/design.md` with a list of what changed, and rendered PNGs to `docs/oop_assets/`.

### 2026-11-08: Change analysis (adding book clubs)

- **Date:** 2026-11-08
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5 (main agent and one subagent)
- **Tool:** Claude Code
- **Domain:** architecture, docs

#### Prompt
```text
add the analysis in a separate md in oop_assets and just reference in design.md. For the coupling analysis you can use this skill: https://github.com/vladikk/modularity span a subagent to use this skill
```

#### Result
A subagent applied the Balanced Coupling model from the modularity skill (integration strength, distance, volatility) to the book club change, comparing the code at `fd29f4b`, `7a919bd` and `2f8830c`. Claude wrote `docs/oop_assets/change_analysis.md` from that analysis. It covers the scenario, the coupling tables before and after, cohesion, the options and the decision, and is linked from `design.md`.

### 2026-11-08: Reduce coupling between groups and reading data

- **Date:** 2026-11-08
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** backend, database, docs

#### Prompt
```text
ok, so, about the section 7 of what is not ideal. can we do something to improve this and reduce coupling?
```

#### Result
Added `ReadingActivityQuery` (reading-session) and `ReadingProgressQuery` (reading-status), and made the challenge standings and the book club progress use them instead of reading those tables (`d1f3e37`). Added `groups.kind` with migration 0006, filled in for existing groups, and removed the `book_clubs` joins from the group roster and invite repositories (`ee0c762`). Added 4 integration tests (190 passing) and simplified the change analysis, adding a section 7 on the fixes.

### 2026-11-08: Event storming review and added to the design

- **Date:** 2026-11-08
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** docs, architecture

#### Prompt
```text
I made this eventstorming of the project. its correct? what can be the aggregates?
about the point 1 what are the events you think we can change?
now, add this image name as eventstorming in oop_assets and add to design.md as reference
```

#### Result
Reviewed the event storming board: flagged UI interactions written as domain events (to remove or turn into read models), commands written as clicks, streak and badge policies triggered by opening the profile, and technical steps in the chat flow, and suggested aggregates per subdomain. Added the updated board as `docs/oop_assets/eventstorming.png` and filled in the event storming section of `design.md` with the image and a table of the aggregates per subdomain.

### 2026-11-11: Auth middleware on the friend request API and merge with main

- **Date:** 2026-11-11
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** backend, testing, docs

#### Prompt
```text
https://github.com/MESW-LES-2627/les-project-group-6/pull/114 and https://github.com/MESW-LES-2627/les-project-group-6/pull/115 these 2 PRs needs to add the auth middleware. Add for me and resolve the conflicts with main
```

#### Explanation of Changes
Merged `main` into PR #114 and resolved the conflicts. The friend routes now take the acting reader from the token (`currentUserId`) instead of `requesterId`/`userId` in the body or path, and `GET /user/:userId/friend-requests` became `GET /me/friend-requests`. Rewrote the integration tests to authenticate with `FakeAuthProvider`, and moved the PR's docs from the old `docs/sprints/` folder into `docs/iterations/`.

### 2026-11-11: Auth middleware on the reading status routes and merge with main

- **Date:** 2026-11-11
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** backend, database, testing, docs

#### Prompt
```text
https://github.com/MESW-LES-2627/les-project-group-6/pull/114 and https://github.com/MESW-LES-2627/les-project-group-6/pull/115 these 2 PRs needs to add the auth middleware. Add for me and resolve the conflicts with main
push and merge both prs
```

#### Explanation of Changes
Merged `main` into PR #115 and resolved the conflicts. Regenerated the reading status dates migration as 0007, made every reading status and library route take the reader from the token, added an ownership check to `removeById`, replaced `DELETE /user/:userId/library/:bookId` with `DELETE /me/library/:bookId` and dropped `GET /library?userId=`. Rewrote the integration tests to use `FakeAuthProvider`, added `db` to the commit types in `commitlint.yml`, and moved the PR's docs into `docs/iterations/`.

### 2026-11-11: Explore page spec

- **Date:** 2026-11-11
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** docs, architecture, frontend, backend

#### Prompt
```text
I will do this user story https://github.com/orgs/MESW-LES-2627/projects/23/views/10?pane=issue&itemId=297555567&issue=MESW-LES-2627%7Cles-project-group-6%7C126
here some infos to create the spec:
- keep the style patern of UI. reuse components if possible
- We need to create the explore page. The explore page yill have a big search bar to search by books and below some books on trend.
```

#### Result
Wrote the [Explore page design](../../superpowers/specs/2026-11-11-explore-page-design.md) after two questions: search is inline using the existing `GET /book`, and both lists from the story are built. The backend composes the published read contracts (`ReadingActivityQuery`, `ReadingProgressQuery`) and adds `reading_status.created_at` (migration 0008). The UI follows the old Explore mockup and reuses the global classes and existing components.

### 2026-11-11: Explore page implementation

- **Date:** 2026-11-11
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** backend, database, frontend, testing, docs

#### Prompt
```text
implement the spec
```

#### Result
Wrote the [implementation plan](../../superpowers/plans/2026-11-11-explore-page.md) and built it test-first.
- **Backend:** migration 0008 (`reading_status.created_at`), the `topBooks` and `mostAdded` contract methods, `findByIds`, `ExploreService` and `GET /explore`.
- **Frontend:** the `/explore` page with search, results and trending cards, the header link, and the move of the page header to `layout/`.
- **Tests:** 22 new tests. All checks pass (backend 271 tests, frontend 138 tests, typecheck and lint).

### 2026-11-11: Explore trending suggestions

- **Date:** 2026-11-11
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** backend, frontend, testing, docs

#### Prompt
```text
nice, now, when we have no activity, can you get some random books to add on trending?
```

#### Result
Added `IBookRepository.random`, a `suggestions` list in `ExploreService` and `GET /explore` (only while nothing trends), and the Trending tab's fallback cards with a note. Also removed the unused header search in favour of the Explore page. New tests for the repository, the service, the route and the view.


### 2026-11-11: Book search design (fuzzy, search-as-you-type)

- **Date:** 2026-11-11
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** architecture, database, docs

#### Prompt
```text
my /explore route must debouce and return the books while I am writing. Also, I would like to implement fuzzy seach or full text seach. How can I do this? maybe a postgres plugin? elasticsearch? how can I achieve this? the idea is to find books with name even if the name have tiny errors
```

#### Result
Brainstormed the options (pg_trgm, full-text search, Elasticsearch) and wrote the [book search spec](../../superpowers/specs/2026-11-11-book-search-design.md): pg_trgm + unaccent over title, author and ISBN behind `GET /book?q=`, and a 300 ms search-as-you-type on Explore.

### 2026-11-11: Fuzzy search-as-you-type implementation

- **Date:** 2026-11-11
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5 (with Sonnet subagents for mechanical tasks)
- **Tool:** Claude Code
- **Domain:** database, backend, frontend, testing, docs

#### Prompt
```text
Implement docs/superpowers/plans/2026-11-11-book-search.md (subagent-driven development)
```

#### Result
Migration 0009 (`pg_trgm`, `unaccent`, trigram indexes), `IBookRepository.search` replacing `findByTitle` (rewritten to UNION indexed branches after code review), `Isbn13.prefixFrom`, `GET /book?q=`, a cancellable `searchBooks`, and a 300 ms search-as-you-type on Explore, with integration, unit and view tests.

### 2026-11-11: Open Library fallback design

- **Date:** 2026-11-11
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** architecture, backend, docs

#### Prompt
```text
What do you suggest in this phase, add more books to the database or connect to an api like openbook? / add open library as a fallback then / we probably will need a type of cache [...] can we use postgres as cache or maybe in mem?
```

#### Result
Design spec for an Open Library fallback behind a `BookCatalog` port, with import on search, an in-memory `LRUCache` (lru-cache package) for Open Library queries and no Redis.

### 2026-11-11: Open Library fallback implementation

- **Date:** 2026-11-11
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5 (with Sonnet subagents per task)
- **Tool:** Claude Code
- **Domain:** backend, testing, docs

#### Prompt
```text
Implement docs/superpowers/plans/2026-11-11-open-library-fallback.md (subagent-driven development)
```

#### Result
`BookCatalog` port, `OpenLibraryCatalog` adapter with an `lru-cache` query cache, import on search in `BookService`, `findByIsbn` and `saveWithAuthors`, wiring and 14 new tests.

### 2026-11-11: Add a missing book by hand

- **Date:** 2026-11-11
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** backend, frontend, testing, docs

#### Prompt
```text
now, I want to do this user story (#120). If I search by a book that i am not finding. I can create a book mannually in my library and use it. For now, dont add the cover photo upload, just the metadata and save to database
```

#### Result
`POST /book` saves authors; new `AddBookForm` on Explore, opened from "Add this book" under the search results, which creates the book, adds it to the library as "Not started" and opens it; `addBook`/`addToLibrary` API helpers; 5 new tests.


### 2026-11-12: Library folders (F-LIB-03, #125)

- **Date:** 2026-11-12
- **Author:** Nimot Imran
- **Model:** Big Pickle
- **Tool:** OpenCode
- **Domain:** database, backend, frontend, testing, docs

#### Prompt
```text
Implement F-LIB-03 "Library folders" on branch feat/125-organize-library: create private folders with unique names per reader (ignoring case), add a book to several folders without changing its reading status, filter by folder, rename and delete folders (deleting keeps the books). A duplicate name must show exactly "You already have a folder with this name". Follow the existing DDD feature layout and the frontend design/components; determine whether an API is needed and implement it end to end if so. Do not commit or push.
```

#### Explanation of Changes
- Reused `lists`/`list_books` for folders and added migration 0011 with a partial unique index on `(user_id, lower(name))`.
- Added the `features/library-folder/` backend feature (aggregate, repository, membership port, service, DTO, routes) and wired it into `api/router.ts` and `server.ts`; `GET /me/library` now returns `folderIds`.
- Added frontend API helpers, folder CRUD in `LibrarySidebar`, folder state/filtering in `LibraryView`, and a multi-folder picker in `BookReadingPanel`/`BookDetailView`, keeping the mock fallback when there is no session.
- Added backend unit and integration tests plus frontend tests, and updated the backend README, API routes and iteration log.

### 2026-11-12: Fix folders lost on refresh and zero book counts

- **Date:** 2026-11-12
- **Author:** Nimot Imran
- **Model:** Big Pickle
- **Tool:** OpenCode
- **Domain:** frontend, testing, docs

#### Prompt
```text
the data is not persists, when I refresh the folders I created are lostt, also the number of books in the folder is always 0, fix the number to represent the book in the folder
```

#### Explanation of Changes
- Gated the library and folder API calls on `session.state.status === 'ready'` instead of "did a request succeed", and made the API library authoritative even when empty, so mock books with slug ids no longer block folder membership saves.
- Always call folder CRUD when signed in; a signed-in reader starts with an empty shelf and folder list, and a failed load clears the mocks and shows an error instead of silently keeping prototype data. The book page follows the same rule for its folder picker.
- Derived each folder count from the loaded shelf (`book.folderIds`), with the API/mock count only as a signed-out fallback.
- Added `LibraryView.api.spec.ts` (4 tests) for the empty library, derived counts, API folder creation surviving a remount and multi-folder filtering; frontend suite 161 passing.

### 2026-11-13: e2e test design (#127)

- **Date:** 2026-11-13
- **Author:** Robert Gleison
- **Model:** Claude Haiku 5.5
- **Tool:** Claude Code
- **Domain:** testing, docs

#### Prompt
```text
/superpowers:brainstorming https://github.com/orgs/MESW-LES-2627/projects/23/views/10?pane=issue&itemId=297555572&issue=MESW-LES-2627%7Cles-project-group-6%7C127 implement this taask. I want to create e2e tests. can you help me?
```

#### Result
Design spec `docs/superpowers/specs/2026-11-13-e2e-tests-design.md` for Playwright e2e tests (auth via a shared setup, production build and shared database, per-test data, CI on main and manual dispatch). Decisions were made with the user during brainstorming. No code yet.


### 2026-11-13: e2e tests implementation (#127)

- **Date:** 2026-11-13
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5 (controller) with Claude Sonnet subagents
- **Tool:** Claude Code
- **Domain:** testing, ci, docs

#### Prompt
```text
implement the e2e plan with subagent-driven development
```

#### Result
Playwright config, helpers and a spec for every route in `apps/frontend/e2e/` (13 tests, not run yet: fixtures and secrets missing), the `.github/workflows/e2e.yml` workflow, and the e2e docs.

### 2026-11-13: Rate and review a book (#122)

- **Date:** 2026-11-13
- **Author:** Robert Gleison
- **Model:** Claude Haiku 5.5 (design), Claude Opus 5.5 (plan and code)
- **Tool:** Claude Code
- **Domain:** backend, database, frontend, testing, docs

#### Prompt
```text
/superpowers:brainstorming I want to implement this https://github.com/orgs/MESW-LES-2627/projects/23/views/10?pane=issue&itemId=297555530&issue=MESW-LES-2627%7Cles-project-group-6%7C122 user stry. can you help me?
whrite the spec for me
creat he implementation plan and implement but in a separate branch
```

#### Result
Design spec and implementation plan in `docs/superpowers/`, decided with the user (one review per book, visibility follows the profile, no audience selector, real friend and public lists, first page only). Built the `features/review/` backend module, migration 0010, four routes, the review panel, book page lists and profile Reviews section, with unit, integration and component tests.

### 2026-11-15: Library tags backend and prod migration repair

- **Date:** 2026-11-15
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** backend, database

#### Prompt
```text
We don't have the tags implementation yet, right? I can save books to my folders but I cant add tags to them
-> yes (open an issue and build it like folders)
I can't save a review: {"rating":5,"comment":"..."} this returns me 500 error. Why?
-> i added in the .env, can you run the migrations for me please? run the tags too
-> create a pr to the tag feature
```

#### Explanation of Changes
Opened #152 and built the tags backend following the folders feature: `user_tags`/`book_tags` tables (migration 0012), `Tag` aggregate, repository, service, routes, `tagIds` on library items, unit and integration tests and docs. Traced the review 500 to Backend CD never starting (GitHub Actions spending limit) and a mismatched 0011 record in prod; repaired the prod migration history by hand and applied 0010 to 0012.

---

### 2026-11-16: Test coverage and test history with make

- **Date:** 2026-11-16
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** testing

#### Prompt
```text
[pasted the course rubric for test metrics] this is how we are evaluating the tests in this academic repo. How can I get test metrics of this repo?
-> can we do this with makefile?
-> run for me to see if something is missing
-> ok, so, can we add in the CI the min of 95% of coverage to pass in CI? (chose: 95% everywhere now)
```

#### Explanation of Changes
Added `test:coverage` scripts to both apps (Vitest v8 coverage on the frontend, Node's built-in coverage on the backend) that leave out code with no logic, plus `make coverage` and `make test-history`. The second runs a new `scripts/test-history.sh` that lists source vs test files changed per merged PR. Updated the README. Then added a 95% line-coverage gate to both apps and switched Backend and Frontend CI to run coverage and upload the report.

---

### 2026-11-16: Mutation testing and requirement traceability

- **Date:** 2026-11-16
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** testing

#### Prompt
```text
ok, so, what other metric we can have other than coverage to have a good grade on tests
-> do the mutation tests and the traceability
-> create a pr
```

#### Explanation of Changes
Set up Stryker in both apps (`make mutation`), limited to domain, service and store logic. Tagged every test file with the requirement IDs it checks and wrote `scripts/traceability.mjs` (`make traceability`), which reports tests per requirement and layer and lists untested requirements. Added the tagging rule to AGENTS.md.
