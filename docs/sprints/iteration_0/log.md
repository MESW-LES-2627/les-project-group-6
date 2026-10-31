# Iteration 0 log

A running record of what the team did and decided in iteration 0. The [release notes](release_notes.md) are the summary written at the end; this file is the day-to-day history. Newest entries go at the bottom.

**Traceability chain:** requirement ID (`F-XXX-NN`) → GitHub issue (milestone `Iteration 0`) → PR → release notes.

## Status

| Area | State |
|---|---|
| Repository and structure | Done |
| Product vision | Done |
| Requirements (v1.1) | Done, open questions remain (section 3 of the requirements) |
| UI design (Figma) | Done, snapshot exported |
| Tech stack decision (ADR-0001) | Accepted |
| External dependencies decision (ADR-0002) | Accepted |
| Issue templates | Done |
| Kanban board (GitHub Project) | Created |
| Database tables model | v1.0 drafted |
| Feature scope (Core / Extras / Optional) | Draft v0.1, to review with the team |
| Infrastructure | PostgreSQL 17 Docker Compose setup + local connection pooling done; prod CD with migrations, version tags and commit message check |
| Database connection and migrations (#63) | Done (connection pooling, migrations with Drizzle, health check, repository pattern, integration tests) |
| Backend domain model (OOP/DDD) | Rich entities with value objects, `ReadingStatus` lifecycle with the State pattern, use cases, Data Mappers and a library query object |
| Vertical prototype book CRUD (#78) | Done: Book CRUD, ReadingStatus tracking, user library endpoint, database seed with covers, and integration tests |
| Frontend routes (#64) | Initial routes implemented |
| Authentication UI and Supabase skeleton | Reference-based `/login` forms and adapter/integration tests implemented; credentials, trusted username flow, provider UI and live session lifecycle pending |
| Frontend foundations (#64) | Shared tokens and Lora/Inter typography, Home health status, lint/format/typecheck/component tests and CI implemented |
| Library page prototype (#76) | Responsive `/library` UI with reusable card and shelves components, filters, tests, and API integration with user library endpoint |
| Book detail page | Responsive `/library/:bookId` with reading, edition, thoughts, reviews and reading-club panels, and API reading status updates |
| Active reading session | Responsive `/session/:bookId` with a separate timer, progress editor, session notes and group-counting rail; save wiring still to do |
| Profile page prototype | `/profile` with app header and footer, mock data and empty states, built on the #64 skeleton |
| Product issues created from the requirements | Core done (#6 to #69), to review and add to the board; Extras not started |
| Backend skeleton (#62) | Runs: TypeScript + Express, `/health`, lint and typecheck; layering, errors and config still to do |
| MVP, vertical prototype, CLAIM, release notes | Empty, to be written |

## Log

### 2026-10-10: Requirements

- Wrote `docs/product/requirements.md` (version 1.1). It lists every feature with a stable ID (`F-AUTH-01`, `F-BOOK-02`, `F-READ-03`, ...) and the detailed business requirements by area: access and onboarding, home, books and library, reading sessions, profile, social, groups, explore, gamification, retrospective and notifications.
- Open questions are kept in section 3 of the same file.

### 2026-10-16: Repository

- Created the repository and added the `docs/` folder (`cdc91df`).

### 2026-10-17: Repository setup and documentation

- **Repo initialization** (`53c44e4`, `bf51ce5`): created the monorepo layout with `apps/frontend`, `apps/backend`, `infra`, `scripts` and `docs`. Added `.gitignore` and removed the placeholder files.
- **README** (`813cecb`): documented the project overview, the main features and the repository structure.
- **Documentation import** (`d424f22`): added the ADRs, the design, the product documents, the sprint documents and the OOP documents.
  - **Vision**: `docs/sprints/iteration_0/vision.md`.
  - **Design**: the Figma file ("Reading app") and 18 desktop screen snapshots in `docs/design/screens/`, covering authentication, onboarding, home, library, book detail, explore, sessions, groups, challenges, book clubs, profile, notifications and retrospective.
  - **OOP documents**: folders for iterations 0 to 4 (domain model, component diagrams, event storming, and so on).
- **Decision: tech stack** ([ADR-0001](../../ADRs/0001-choose-tech-stack.md)): TypeScript with Vue on the frontend and TypeScript on Node on the backend, without an opinionated framework such as NestJS.
  - *Why:* one language for all five members, shared types between the apps, and an architecture we write ourselves, so the OOP patterns stay visible in the code.
  - *Rejected:* NestJS (hides the design), Java or C# backend (second language, types not shared), React (the team knows Vue).
  - *Risks:* we write more structure ourselves, and only two members know Vue today.
- **Decision: external dependencies** ([ADR-0002](../../ADRs/0002-external-dependencies.md)):
  - **Supabase Auth** for login, sign-up and password reset.
  - **Open Library API** for book metadata and search.
  - **Resend** for email, only if notifications become a requirement.
  - Each service sits behind an interface we own (`AuthProvider`, `BookCatalog`, `Notifier`), external data is mapped into our domain model, and secrets stay in environment variables.
  - *Optional later:* a local copy of book data as a fallback when Open Library is slow or down.
  - Using Supabase for the database is **not** decided and needs its own ADR.
- **Agent instructions** (`8dd27c4`): added `AGENTS.md` (keep the README structure up to date) and the design color palette: Burgundy `#6f1d1b`, Gold `#bb9457`, Dark brown `#432818`, Copper `#99582a`, Cream `#ffe6a7`.
- **GitHub issue templates** (`6120659`): feature, bug, refactor and tests, in `.github/ISSUE_TEMPLATE/`. Blank issues are disabled. A pull request template was also added.
- **Kanban board**: created the GitHub Project board on the organization, with the columns To do, Doing, In review, QA and Done.

### 2026-10-17: Iteration logs and docs index

- Added this log and the rule in [`AGENTS.md`](../../../AGENTS.md) to keep it updated (`ad52fb1`). Empty `log.md` files were created for iterations 1 to 4 (`e5d9c9c`).
- Added [`docs/README.md`](../../README.md), an index that explains every folder and file in `docs/` and marks which ones are still empty. `AGENTS.md` now requires keeping it up to date.

- Filled in `.gitignore` (editor folders, `.env` files and secrets, `node_modules`, build output, coverage, logs, caches) and stopped tracking `.vscode/`. `.env.example` stays tracked.

### 2026-10-17: Database tables model

- Added the `docs/architecture/` folder for technical models, with the database tables UML [`table_UML.md`](../../architecture/table_UML.md) (v1.0). It is derived from `LES-UML.drawio` (17 skeleton classes) and the requirements v1.1, and adds the tables needed to cover them (friendships, library entries, streaks, goals, group members, badges, notifications, ...).
- Main mapping decisions, explained in the file: `ReadingStatus` and `ChallengeStatus` are lookup tables, `Club` and `Challenge` are subtypes of a shared `groups` table (F-GRP-01), and `List` serves both as a private shelf (F-LIB-03) and a public curated list (F-EXP-05).
- *Why a new folder:* the model covers the whole project, not one iteration, and it describes tables rather than domain classes, so it does not belong in `OOP_documents/` or `sprints/`.

### 2026-10-17: Feature scope

- Added [`features_priority.md`](../../product/features_priority.md) (draft v0.1). The full requirements are too much for 4 sprints, so they are cut into **Core** (sprints 1–2: auth, book search and add, library, timer, daily streak, profile, friends, challenge with leaderboard, Home), **Extras** (sprints 3–4, ordered by value, starting with book club) and **Optional** (backlog).
- *Why:* deliver a small app that works end to end first, then grow it. Challenge was chosen as the Core group type because it proves groups and leaderboards with the simplest rules; book club is the first Extra.
- Nine requirements marked Must are moved down (onboarding, import, folders, book club, chat, badges, notifications, public ratings, user search). The file lists them; the MoSCoW tags in the requirements are not changed until the team agrees.

### 2026-10-17: Infrastructure

- Added [`infra.md`](../../architecture/infra.md) (draft v0.1): for Core we run a Postgres database, one Node backend (Render) and a static Vue frontend (Vercel or Netlify), plus Supabase Auth and Open Library. GitHub Actions deploys on every merge to `main`, and a scheduled ping keeps the free tiers awake.
- **Decision: live public URL at every iteration.** The class requires it, so a local demo is not enough.
- **Decision: compute on read, no background jobs.** Streaks, totals, challenge status, leaderboards and winners are calculated from the stored sessions when they are read. *Why:* no scheduler and no midnight jobs, and the backend stays stateless. *Rejected:* stored values kept up to date, which need a scheduled job. Cached tables in `table_UML.md` wait until queries get slow.
- **Decision: our own `users` table with the same UUID as the Supabase user.** Supabase handles identity; everything else links to our `User`. The backend verifies the Supabase JWT on each request.
- **Decision: days are counted in the user's timezone**, stored on the user.
- Still open: Supabase Postgres as the database, separate frontend host vs. served by the backend, and the local database setup.

### 2026-10-17: Core issues

- Created the GitHub issues for every Core feature in [`features_priority.md`](../../product/features_priority.md), using the Feature issue form: 18 parent issues (#6 project setup, #7 to #23 one per requirement ID) and 46 sub-issues, each sized for one PR. Every parent has acceptance criteria, scope and cuts, the work by layer, implementation options with pros and cons, the API and data it touches, and open questions.
- Linked the order with GitHub "blocked by" dependencies, between parents (e.g. Home #23 is blocked by #12, #14, #15, #17, #20, #22) and between sub-issues.
- Added labels: `feature`, `core`, `sprint 1`, `sprint 2`, layer labels (`frontend`, `backend`, `database`, `infra`) and `area: ...` labels.
- Added three setup sub-issues under #6: #70 a spike comparing hosts, costs and deploying from source vs. a Docker image (blocks #66), #71 release versioning with a tag and GitHub Release per iteration (blocked by #66), and #72 pre-commit hooks and Conventional Commits (blocked by #62).
- Decisions proposed in the issues, to confirm when reviewing them: Hono + Drizzle + Postgres in Docker for local work (#6), case-insensitive usernames (#7), a session counts on the day it started (#15, #21), a challenge's window is fixed in UTC from the creator's timezone (#21), and winners reuse the leaderboard service (#21, #22).

### 2026-10-17: LLM interaction logs template

- Added standardized `LLM_LOG.md` files across all iterations (`docs/sprints/iteration_0` to `iteration_4`) to track team LLM and AI assistant usage, prompts, models, and changes.
- Updated [`docs/README.md`](../../README.md) to index the LLM log files.

### 2026-10-18: Backend setup (#62)

- Narrowed issue #62 to the project setup only: TypeScript on Node, tooling, scripts and a running server. Layering, error handling, config validation, CORS, logging and tests were cut from it and still need their own issues.
- Added the npm workspace root shared by both apps: `package.json` (workspaces, root `lint`, `typecheck`, `build`, `format:check` scripts), `tsconfig.base.json` (strict flags), `.nvmrc` (Node 24 LTS), `.editorconfig` and Prettier. Later replaced by isolated apps (see the entry below).
- **Decision: thin root, per-app TypeScript and ESLint configs.** The Vue frontend needs `bundler` resolution, DOM types, `vue-tsc` and `eslint-plugin-vue`; the Node backend needs `NodeNext` and Node types. *Rejected:* one TS/ESLint config for both, which would be full of exceptions; and a self-contained backend with no root, which would mean moving config later.
- Added `apps/backend`: Hono on `@hono/node-server`, `tsx watch` for `dev`, `tsc` for `build`, ESLint (flat config, `typescript-eslint`), and `GET /health` returning `{ "status": "ok" }`. `createApp()` is separate from `server.ts` so tests can call the app without a port. See [apps/backend/README.md](../../../apps/backend/README.md).
- TypeScript is pinned to 6.0 because `typescript-eslint` does not support TypeScript 7 yet.

### 2026-10-18: Switch to pnpm

- Replaced npm with pnpm: `pnpm-lock.yaml` replaces `package-lock.json` (imported, so versions are unchanged) and `packageManager` pins `pnpm@10.18.0`. READMEs updated.
- **Decision: pnpm instead of npm.** *Why:* its strict `node_modules` fails locally when an app imports a dependency it did not declare, and it gives catalogs for the single-version-per-dependency policy once the frontend exists. *Rejected:* staying on npm, which is simpler and ships with Node but hides undeclared dependencies through hoisting. Switched now because no CI or frontend depends on npm yet.

### 2026-10-18: Isolated apps, no shared root config

- Reversed the thin-root setup from the "Backend setup (#62)" entry: removed the root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json` and root lockfile, and moved `.nvmrc`, `.editorconfig`, `.prettierrc.json` and `.prettierignore` into `apps/backend`. The backend's `tsconfig.json` now holds the strict flags itself, and it has its own `pnpm-lock.yaml`, `packageManager`, `engines` and `format`/`format:check` scripts. Install and run from inside `apps/backend` (`pnpm install`, `pnpm dev`).
- **Decision: every app is fully isolated.** *Why:* each app can pick its own Node, TypeScript and tooling versions, with no shared lockfile to conflict on and a simple per-folder deploy and CI. *Rejected:* the shared root (one lockfile, one style, `packages/shared`), which costs less to maintain but couples the apps. *Trade-off:* formatting config is duplicated in each app, and code shared between apps has to be copied or published.
- pnpm is kept (decision above). `apps/frontend` should follow the same layout when it is added.

### 2026-10-18: Express instead of Hono

- Added [ADR-0003](../../ADRs/0003-backend-http-framework.md): the backend HTTP layer is **Express 5**, replacing Hono from the first skeleton. `app.ts` and `server.ts` were rewritten (`createApp()` still returns the app, `server.ts` calls `listen`), `hono` and `@hono/node-server` were removed, and `express` and `@types/express` were added. `GET /health` is unchanged and checked.
- *Why:* team familiarity and ecosystem matter more than Hono's portability and typing, and performance is not a constraint. *Rejected:* Hono (smaller ecosystem, edge portability we do not need) and Fastify (more structure and learning curve than needed). The cost is looser request typing, so inputs must be validated at the boundary.
- The "Backend setup (#62)" entry above still says Hono; it records what was done that day.

### 2026-10-18: Makefile

- Added a root `Makefile` with `install`, `dev`, `build`, `start`, `lint`, `typecheck`, `format`, `format-check`, `test`, `check` and `clean`. It only runs each app's own pnpm scripts, so it adds no shared config and the apps stay isolated. It loops over `apps/*`, skips apps without the script, and `APP=backend` limits a target to one app. `make check` is what CI should run. There are no tests yet, so `make test` does nothing until a `test` script exists.

### 2026-10-18: Back to a shared root config

- Reversed the isolated-apps decision above: the repository is a **pnpm workspace with a shared root** again. The root holds `package.json` (private, `packageManager`, scripts that run in every workspace), `pnpm-workspace.yaml` (`apps/*`, esbuild install script), one `pnpm-lock.yaml`, `tsconfig.base.json`, `.nvmrc`, `.editorconfig`, `.prettierrc.json` and `.prettierignore` (now also ignoring `docs/` and `.github/`). `apps/backend` keeps only its own `package.json`, ESLint and TypeScript config (its `tsconfig.json` extends the root base), and no longer has its own lockfile, Node version file or Prettier config.
- **Decision: shared root config, global files.** *Why:* one lockfile, one Node version and one code style for every app, changed in one place, and `packages/shared` becomes possible when the frontend needs the backend's types. *Rejected:* fully isolated apps, which let each app upgrade alone but copy the formatting config into every app and make shared code harder. *Trade-off:* a single lockfile can conflict when two people add dependencies, and a change to shared files has to be checked against every app.
- The `Makefile` now runs `install` and `format` once at the root, because there is one lockfile and one Prettier config. The other targets still run each app's own scripts.
- Still open: `.nvmrc` says Node 24 but `engines` says `>=22.13`.

### 2026-10-18: Node 24 LTS enforced

- Aligned the Node version: `engines.node` in the root `package.json` is now `>=24`, matching `.nvmrc` and `@types/node` 24, and a root `.npmrc` sets `engine-strict=true` so `pnpm install` fails on an older Node instead of only warning. This closes the mismatch listed as open above. Found while testing: `make dev` crashed on Node 18 because `--env-file-if-exists` needs a newer Node.
- **Decision: Node 24.** *Why:* it is the Active LTS today (security fixes until April 2028) and the version the lockfile and checks were run on. *Rejected:* Node 22 (maintenance only, and the code is typed for 24) and Node 26 (becomes LTS in late October 2026; nothing the backend needs and would mean re-testing).

### 2026-10-18: Setup and run guide

- Rewrote the "Getting started" section of the [README](../../../README.md): prerequisites (Git, nvm, make, with a Windows/WSL note), setup from clone to install, and tables with each `make` target next to the plain pnpm command, plus troubleshooting for the wrong Node version, a missing pnpm and a busy port. *Why:* testing the setup showed that a terminal on an old Node fails in confusing ways, and not everyone will have `make`.

### 2026-10-18: CI workflows (#65)

- Added one GitHub Actions workflow per app: [`backend-ci.yml`](../../../.github/workflows/backend-ci.yml) runs install (`pnpm install --frozen-lockfile` with the pnpm cache), lint, format check, typecheck, test and build on pull requests to `main` and on push to `main`; [`frontend-ci.yml`](../../../.github/workflows/frontend-ci.yml) has the same steps but is commented out until `apps/frontend` exists. Files are named `<app>-ci.yml` so the future deploy workflows can sit next to them as `<app>-cd.yml`, each with its own concurrency group. Both use `permissions: contents: read`, pinned major versions of the actions, no secrets, cancel older runs on the same branch, and Node from `.nvmrc`.
- **Decision: one workflow per app with path filters.** *Why:* the frontend and backend are built and deployed separately, so a backend change should not wait for frontend checks. Changes to the shared root config (lockfile, `tsconfig.base.json`, Prettier, Node version) trigger both. *Rejected:* a single `ci.yml` with both jobs (as first written in #65), simpler but runs everything on every change. *Trade-off:* a path-filtered check that does not run stays "pending" if it is marked as required in branch protection, so the required checks need care.
- Added a backend `test` script (`tsx --test "src/**/*.test.ts"`, the Node.js test runner) and a root `test` script. It passes while there are no tests, so CI is green now and starts checking as soon as the first `*.test.ts` lands. The test runner can still be replaced (for example by Vitest) in its own ADR.
- Still open from #65: the Postgres service container and `db:migrate` (no database yet), `packages/shared` (does not exist yet) and the branch protection rule on `main` (needs an admin).

### 2026-10-22: Database connection and migrations setup (#63)

- Added [`docker-compose.yml`](../../../docker-compose.yml) running PostgreSQL 17 on port `5432` for isolated local development.
- Created [`schema.sql`](../../../apps/backend/database/schema.sql) under `apps/backend/database/` defining the full relational table specification from `table_UML.md`.
- Configured Drizzle Kit via [`apps/backend/drizzle.config.ts`](../../../apps/backend/drizzle.config.ts) with migrations stored in `apps/backend/database/migrations/`.
- Implemented database connection pooling with `pg.Pool` (`createPool`, `createDb`) and wired health check endpoint `GET /health` (`status: 'ok', db: 'ok'`).
- Added example clean architecture domain entity and repository interface (`User`, `IUserRepository` in `src/domain/user.ts`) and Drizzle implementation (`DrizzleUserRepository` in `src/infrastructure/repositories/drizzle-user-repository.ts`).
- Set up backend test structure under `apps/backend/tests/` (`helpers/`, `integration/`) with integration tests for health check and user repository.
- Documented [ADR-0004: Database Host, Access Library and Migrations](../../ADRs/0004-database-access-and-migrations.md) (PostgreSQL 17, Drizzle ORM and Drizzle Kit).
- Added PostgreSQL 17 service container and migration step to GitHub Actions ([`.github/workflows/backend-ci.yml`](../../../.github/workflows/backend-ci.yml)) for CI test execution.
- Added production migration job `migrate-production` to [`.github/workflows/backend-ci.yml`](../../../.github/workflows/backend-ci.yml) targeting Supabase using `PROD_DATABASE_URL` upon merge to `main`.
- Updated [`apps/backend/README.md`](../../../apps/backend/README.md) and [`docs/README.md`](../../README.md).

### 2026-10-22: CLAIM with deployed environments

- Started the [iteration 0 CLAIM](CLAIM.md) with the production and staging links for the frontend and backend (the `api-` links, which also serve `/health`) and a short summary: both apps deployed in prod and stg on Render, database on Supabase.

### 2026-10-22: Vision features beyond the MVP

- Rewrote the "Features beyond the MVP" table in [`Vision.md`](Vision.md) with the team's feature list: real-time chat, reading journal, recommendations, reading sessions and streaks, club discussions, custom challenges, badges and yearly retrospective, shelves and reading status, and friends. The previous proposals not in the list (yearly goal, activity feed, quotes and highlights, notifications, mobile app) were removed from the table.

### 2026-10-22: Iteration 0 release notes

- Filled [`release_notes.md`](release_notes.md): frontend and backend deployed, Supabase database with Supabase Auth as the planned authentication, mocked profile and library pages, and basic routes to create, save and get books.

### 2026-10-23: MVP feature list

- Rewrote [`mvp.md`](mvp.md): it now opens with the 6 MVP features (authentication, clubs and challenges with real-time text chat and leaderboard, library, search, gamification, friends) followed by 14 user stories. Out of scope: photos and videos in the chat, recommendations, onboarding and email notifications.
- **Decision:** one-to-one messages, reading statistics and user-created challenges left the MVP list, and "reading session" was dropped as a separate story (the streak counts days with reading logged). *Why:* they were not in the feature list agreed by the team. The MoSCoW tags in the requirements may need to follow.

### 2026-10-25: OOP/DDD review skill

- Added the project skill [`oop-ddd-review`](../../../.claude/skills/oop-ddd-review/SKILL.md) to review `apps/backend` for raw OOP, DDD and design patterns, following the teacher's advice to avoid ORMs and frameworks that make design decisions for us.
- Decided: keep Drizzle **only as a query builder** inside `infrastructure/`. Repositories and Data Mappers stay hand-written, the relational API (`relations.ts`, `db.query`, `with:`) is forbidden, and related data is loaded with explicit SQL joins. Rejected: full ORMs (Prisma, TypeORM, Sequelize, MikroORM) because they shape the domain model. Switching to raw `pg` is still open.
- The skill flags anemic entities, primitive obsession, aggregate boundary and layering violations, and recommends DDD, PoEAA and GoF patterns (State, Strategy, Observer, Specification and others) to add or substitute.

### 2026-10-25: Backend OOP/DDD refactor

Applied the fixes found by the first `oop-ddd-review` run, one commit each. The [backend README](../../../apps/backend/README.md#folder-layout) has the new folder layout.

- `d4f4601` Removed `relations.ts` and stopped passing the schema to `drizzle()`, so the relational API can no longer be used.
- `7c991a5` Added a `UNIQUE (user_id, book_id)` constraint to `reading_status` ([migration 0001](../../../apps/backend/src/database/migrations/0001_reading_status_user_book_unique.sql) removes older duplicates first) and made `save()` a single atomic upsert. *Why:* find-then-insert could create duplicate rows under concurrent requests.
- `c7c39f5` Added `DomainError` families and value objects (`BookId`, `UserId`, `ReadingStatusId`, `BookTitle`, `Isbn13` with check digit, `PageCount`, `PageProgress`, `Email`, `Username`).
- `94d74b0`, `9ba953f` Made `Book` and `User` rich entities with a private constructor, `create`/`register` and `reconstitute` factories, plus `BookMapper` and `UserMapper` Data Mappers. The API returns DTOs, so the JSON contract used by the frontend is unchanged. Clients can no longer choose a book's id.
- `d314f0b` Modelled the reading lifecycle with the **State** pattern (`NotStarted`, `InProgress`, `Finished`, `DidNotFinish`). Each state owns its transitions and its effect on page progress: finishing jumps to the last page, re-reading a finished book restarts at page 0, abandoning keeps the page, and pages cannot exceed the book's page count. The rules moved from `app.ts` into the `SetReadingStatus` and `UpdateReadingStatus` use cases, and the overloaded repository `update()` was removed. *Rejected:* a plain transition table, because progress handling already depends on the state.
- `2dec36d` Moved the library page join out of the write repository into a `LibraryQuery` (CQRS read side) returning plain views.
- `b5425a3` Split `app.ts` into routers per resource backed by book use cases. `createApp()` is the composition root (manual DI, no container), and one error handler maps domain errors to 400/404/409.
- Tests went from 18 to 58: new unit tests for value objects, entities, the reading lifecycle and the use cases (with in-memory repositories), plus integration tests for the reading status repository and API.
- Frontend impact: `PUT /reading-status` now answers 409 for forbidden moves (e.g. `not-started` → `did-not-finish`) and 400 for pages beyond the book's page count. When the target status is `finished` or `not-started`, the page is ignored.

### 2026-10-25: Backend folders by feature

`1634e8f` (PR #90).

- **Decision: group the backend by feature, not by layer.** `src/` now has `features/` (`book`, `reading`, `user`, `library`), `api/`, `config/`, `middleware/`, `utils/` and `database/`. Each feature folder holds the entity file (entity plus its value objects), the repository file (interface, Drizzle implementation and mapper), one service and the routes with their DTO. *Why:* changing books meant opening `domain/`, `application/`, `infrastructure/` and `http/`, and the 46 files were mostly 10–25 line wrappers. `src/` now has 27 TypeScript files. The [backend README](../../../apps/backend/README.md#folder-layout) has the layout.
- **Decision: one application service per feature instead of one class per use case.** `BookService` has `register`, `get`, `search` and `remove`; `ReadingStatusService` has `set` and `update`. *Why:* the use case classes had the same constructor and a single `execute`. One can be split out again if it grows its own dependencies.
- **Decision: the database lives in `src/database/`** (schema, pool, migrate, seed and the SQL migrations), replacing the separate `apps/backend/database/` folder. *Rejected:* a root-level `database/` package, because only the backend talks to Postgres.
- The DDD rule that entities and services do not know Drizzle, `pg` or Express is now enforced by ESLint (`no-restricted-imports` in [`eslint.config.js`](../../../apps/backend/eslint.config.js)) instead of by the folder tree. The [`oop-ddd-review`](../../../.claude/skills/oop-ddd-review/SKILL.md) skill was updated to the new paths.
- No behaviour change: the API and its JSON contract are the same, and the 58 tests pass.

### 2026-10-27: Production CD, version tags and commit message check (#6)

- Added [`backend-cd-prod.yml`](../../../.github/workflows/backend-cd-prod.yml) and [`frontend-cd-prod.yml`](../../../.github/workflows/frontend-cd-prod.yml): on every merge to `main` that changes the app, they run its CI, apply the migrations to the production database (backend), deploy that commit to Render through the API, wait until live, print the Render build log and check the service. They replace Render Auto-Deploy on prod and the `migrate-production` job of `backend-ci.yml`. Why: migrations run before the code that needs them, and a failed deploy is visible as a red run with each step listed, like the stg workflows. Rejected: one `cd-prod.yml` for both apps (no per-app entry in Actions), a Render pre-deploy command (paid instances only), and building the image in Actions and pushing it to GHCR (would need the prod service recreated as an image service).
- Version tags `vX.Y.Z` with a GitHub Release of the same name, made by [`release.yml`](../../../.github/workflows/release.yml) with semantic-release once every prod CD of the merge has succeeded from Conventional Commits, configured in the `release` key of the root [`package.json`](../../../package.json). A `v0.1.0` tag was created by hand on `main` so versions start in `0.x`. Rejected: python-semantic-release (needs `pyproject.toml` or a separate config file, and Python in the job), a hand-written bump script (more code to maintain), and committing version bumps to `main` (needs a token that bypasses branch protection).
- Added [`commitlint.yml`](../../../.github/workflows/commitlint.yml) and [`scripts/check-commits.sh`](../../../scripts/check-commits.sh): every PR commit must follow `<type>(<scope>): <description>`. A plain script instead of `@commitlint/cli` to avoid new dependencies.
- The CI workflows run on PRs and are called by the prod CD workflows (`workflow_call`) instead of running on push. Created the [`v0.1.0` release](https://github.com/MESW-LES-2627/les-project-group-6/releases/tag/v0.1.0).
- See the [README](../../../README.md#continuous-integration) for the setup (secrets, variables, Auto-Deploy off).

### 2026-10-27: GitHub deployment environments per app

- The deploy jobs record their deploys in GitHub environments named after the app: `backend` and `frontend` for prod, `backend-stg` and `frontend-stg` for stg, each with the live URL. Replaces the auto-created `production` and `production-frontend` environments, which were deleted. Why: one environment per app and stage keeps a separate deploy history and URL for each on the repository page.

### 2026-10-27: Release workflow permission fix

- [`release.yml`](../../../.github/workflows/release.yml) failed with HTTP 403 when listing the prod CD runs of the merged commit: its token had no `actions: read`. Added that permission.
- It then failed in `actions/setup-node@v5` with "Unable to locate executable file: pnpm": v5 turns on the pnpm cache by itself from `packageManager` in the root `package.json`, and this job does not install pnpm. Set `package-manager-cache: false`.

## Next steps

- Write an ADR restricting Drizzle to a query builder (decided in the OOP/DDD review entry above).
- Show the 400/409 messages from `PUT /reading-status` in the book reading panel.

- Create the issues for the backend parts cut from #62 (layering, errors, config, CORS, logging, the test runner), and add `apps/frontend` as a new workspace (it needs its own `package.json`, `tsconfig.json` extending the root base, and ESLint config) when the frontend starts.
- Turn on branch protection on `main` (required `backend` check and one approval), and uncomment `frontend-ci.yml` when `apps/frontend` exists.

### 2026-10-22: Frontend routes (#64)

- Added the initial Vue Router routes: `/` redirects to `/login` (the requirements say the authentication page appears when the app opens), `/login` and `/home` show placeholders, and unknown paths show the not-found page.
- Added router tests for the root redirect, home route and unknown-path fallback.

### 2026-10-22: Frontend tokens, health status and checks (#64)

- Extended [CSS tokens](../../../apps/frontend/src/assets/styles/tokens.css) with semantic aliases, typography and spacing. Based on the [Home](../../design/screens/05-home.png) and [authentication](../../design/screens/01-authentication.png) screenshots, use Lora for headings and Inter for body/controls, with warm neutral surfaces alongside the unchanged brand palette.
- Added a [Home health status](../../../apps/frontend/src/views/HomeView.vue) using the [API service](../../../apps/frontend/src/services/api.ts), including loading, backend response and error states. Use a same-origin `/api` proxy locally rather than adding backend CORS for development; production needs equivalent host routing or an explicit API URL with CORS. See the [frontend guide](../../../apps/frontend/README.md).
- Made lint and tests suitable for CI (no automatic edits or watch mode), added Prettier commands and [component coverage](../../../apps/frontend/src/views/__tests__/HomeView.spec.ts) for successful and failed health calls, and enabled [frontend CI](../../../.github/workflows/frontend-ci.yml). Verified lint, formatting, vue-tsc, 7 tests and production build; the running Vite proxy returned `{ "status": "ok" }` from `/api/health`. Production smoke verification awaits deployment.

### 2026-10-22: Fix local health request CORS error

- The ignored frontend `.env` still pointed directly to `http://localhost:3000`, bypassing the configured Vite proxy. Changed its API base to `/api`; no backend change is needed for the same-origin development setup. Added [troubleshooting instructions](../../../apps/frontend/README.md) for stale environment overrides and restarting Vite.

### 2026-10-22: Backend deploy to Render

- Added a backend [`Dockerfile`](../../../apps/backend/Dockerfile) and a root [`.dockerignore`](../../../.dockerignore). The Dockerfile is multi-stage on `node:24-alpine`: it builds with the workspace lockfile from the repository root, keeps only production dependencies (`pnpm deploy --prod`) and runs as the `node` user. Tested locally: the image builds and `/health` answers. Render settings are in the [README](../../../README.md).
- **Decision: host the backend on Render (free tier) as a Docker web service linked to the repository.** *Why:* the repo owner approved the Render GitHub app, so Render builds and deploys on push with no CD workflow or registry; Docker keeps the local and deployed runtime the same. *Rejected:* pushing a prebuilt image to GHCR from Actions (only needed while Render had no repo access), a personal mirror of the repo (forking is disabled), AWS EC2 and Oracle VMs (we would manage OS, HTTPS and billing), Vercel serverless for the API (no long-lived process). *Trade-off:* the free instance has 0.1 vCPU and 512 MB and sleeps after 15 minutes idle, so the first request after a pause is slow. Chat realtime is planned on Supabase Realtime so the backend does not hold WebSockets.

### 2026-10-22: Backend staging deploy

- Added [`backend-cd-stg.yml`](../../../.github/workflows/backend-cd-stg.yml): a manual workflow that deploys the branch picked in "Use workflow from" to a separate Render stg service, through the Render API (switch the service branch, deploy that commit, wait for `live`, check `/health`). Prod keeps Render auto-deploy from `main`.
- **Decision: drive stg with the Render API from a workflow.** *Why:* the team wants to choose which branch goes to stg; a Render deploy hook always deploys the service's configured branch, so it cannot. *Rejected:* Render auto-deploy for stg (fixed branch), deploy hooks (fixed branch), Render preview environments (paid plan), building images in GHCR (more moving parts and a registry credential). *Trade-off:* needs a Render API key as a repository secret, which only the repo admin can add, and the key has access to the whole Render workspace.

### 2026-10-22: Frontend staging deploy

- Added [`frontend-cd-stg.yml`](../../../.github/workflows/frontend-cd-stg.yml), the frontend twin of the backend stg workflow: it deploys the branch picked in "Use workflow from" to a Render static site through the Render API and checks that the site answers. Needs the variable `RENDER_FRONTEND_STG_SERVICE_ID`. Render settings are in the [README](../../../README.md).
- **Decision: the frontend is a Render static site, not a Docker service.** *Why:* `vite build` produces plain files, a static site is served from Render's CDN and has no instance to sleep, and it needs no image. *Rejected:* an nginx Dockerfile (extra build time for no benefit on Render). *Trade-off:* a static site has no proxy, so `/api/*` is a Render rewrite to the backend, and the free workspace bandwidth (about 5 GB/month) is shared with the backend. The build command must not run `corepack enable` (read-only `/usr/bin` on Render).

### 2026-10-22: Library page prototype (#76)

- Added the responsive [`/library` page](../../../apps/frontend/src/views/LibraryView.vue) from the [library design](../../design/screens/06-library.png), with the hero, search and filter bar, status tabs, three-column book grid and footer note. The layout collapses to two columns and then one, the filters stack and the status tabs scroll on small screens.
- Split the UI into a reusable [book card](../../../apps/frontend/src/components/library/LibraryBookCard.vue) and a separate [“Your shelves” side menu](../../../apps/frontend/src/components/library/LibrarySidebar.vue), as requested. The card covers the cover, title, author, status, progress, page count, summary, folder/tag chip and menu; the side menu covers shelves, folders, tags and the “Shelves, not duplicates” tip.
- Added the library domain types, filter/progress/sort helpers and mock data in [`types/library.ts`](../../../apps/frontend/src/types/library.ts), [`utils/library.ts`](../../../apps/frontend/src/utils/library.ts) and [`mocks/library.ts`](../../../apps/frontend/src/mocks/library.ts), plus six [cover crops](../../../apps/frontend/src/assets/covers). Search, status, folder, tag, genre and sort controls work against the mock data; the default “Autumn reading” folder reproduces the design content. API wiring, folder management and the card menu come later.
- Reused the shared tokens and global styles from the [frontend foundations](#2026-10-22-frontend-tokens-health-status-and-checks-64) and added the small surface, divider and progress pieces the page needs. No new ADR: this is the agreed Vue/TypeScript stack and the existing palette, with the library-specific layout kept in the view and components.
- Added component and view tests, the `/library` route and route test, and documented the route and source layout in [`apps/frontend/README.md`](../../../apps/frontend/README.md). Verified formatting, lint, `vue-tsc`, 16 tests, the production build and screenshots at 1264 px, 800 px and 390 px.

### 2026-10-22: Book detail page

- Added the responsive [`/library/:bookId` page](../../../apps/frontend/src/views/BookDetailView.vue) from the [book-detail design](../../design/screens/07-book-detail.png) (`9b6e8d3`). Library cards now open the page from the cover, title or body, while the card itself keeps its existing menu and status controls.
- Split the page into [reading](../../../apps/frontend/src/components/library/BookReadingPanel.vue), [edition](../../../apps/frontend/src/components/library/BookEditionPanel.vue), [thoughts](../../../apps/frontend/src/components/library/BookThoughtsPanel.vue), [review](../../../apps/frontend/src/components/library/ReviewItem.vue) and [reading-club](../../../apps/frontend/src/components/library/ReadingClubPanel.vue) components. The Emma mock reproduces the design content, with a portrait [detail cover](../../../apps/frontend/src/assets/covers/emma-detail.png) and a generic fallback for other books.
- Added the detail route and tests for the view, library-card navigation and router. Unknown ids show a friendly message and a link back to the library. Verified the responsive layout at desktop and mobile widths; the backend book endpoint and real review/club data are still placeholders.

### 2026-10-22: Active reading session

- Added the responsive [`/session/:bookId` page](../../../apps/frontend/src/views/ActiveSessionView.vue) from the [active-session design](../../design/screens/10-active-session.png) (`9b6e8d3`), opened by the “Start session” button on the [book reading panel](../../../apps/frontend/src/components/library/BookReadingPanel.vue).
- Built the [timer as a separate component](../../../apps/frontend/src/components/session/ReadingTimer.vue) with running and paused states, pause/resume/stop events and autoplay. The page keeps the page and percentage fields in sync, shows the session note and saves-back count, and brings the eligible groups, profile-total explanation and locked rules into a responsive right rail.
- Added [session types](../../../apps/frontend/src/types/session.ts), [mock session data](../../../apps/frontend/src/mocks/session.ts), the session route and timer/view/router tests. “Stop & save” returns to the book detail page for now; persisting the session is deferred until the backend endpoints exist. The layout was checked against the 1266×886 reference and at 390 px without horizontal overflow.

### 2026-10-22: Profile page prototype on the #64 skeleton

- Built the profile page at `/profile` from the "Bookmarked profile" HTML design reference, as Vue components in [`src/components/profile/`](../../../apps/frontend/src/components/profile/) (bookplate, currently reading, shelf, recently added, chapter level, streak, reading time, challenges, folders, monthly recap). Each section has its own empty state; `/profile?state=new` shows them all. Data comes from typed mocks until the API exists. Added a shared `AppHeader` (nav, search, notifications, account menu) and `AppFooter` in `App.vue`, hidden on `/login` through `meta.hideAppChrome`.
- The prototype was first built on a separate frontend skeleton made in parallel with #64. **Decision: drop that skeleton and keep the #64 one.** *Why:* #64 has the fuller setup (Oxlint, Prettier, API proxy, health check, router tests) and is the one the team reviews. Only the profile code was moved over: its tokens were renamed to the #64 names where the meaning matched (for example `--color-primary`, `--color-border`, `--color-text-muted`, and spacing on the `--space-N` = N × 0.25rem scale), and the tokens #64 does not have were added to [`tokens.css`](../../../apps/frontend/src/assets/styles/tokens.css). Pinia was dropped because no store exists yet. `Bookplate` and `Shelf` were renamed `ProfileBookplate` and `BookShelf` for the multi-word component-name lint rule. Added a router test for `/profile`. Lint, format, typecheck, tests (8) and build pass.
- **Decision: warm neutrals from our palette, not the reference's grey-greens.** *Why:* AGENTS.md says UI uses the five palette colors. *Rejected:* adding the reference's `#EEF0EC` and `#1B1F1C` as palette colors.
- **Decision: profile headings follow the #64 typography (Lora headings, Inter body).** *Why:* one heading style across the app, as set in the [design README](../../design/README.md). Headings get Lora from the global `h1`–`h6` rule only; the per-component heading font override was removed. Book titles on the shelf spines also use Lora. *Rejected:* the earlier prototype choice of sans for the profile name and section titles.
- **Decision: one type scale.** Replaced the profile's `--text-*` sizes and its hard-coded pixel sizes with the `--font-size-*` scale, extended from 5 to 10 steps (`2xs` 11px, `xs` 13px, `sm` 14px, `base` 16px, `md` 18px, `lg` 24px, `xl` 32px, `2xl` 40px, `3xl` 48px, `display` 56px). The #64 values did not change. Profile sizes moved to the nearest step (for example 15px to 16px, 26px to 24px).
- Fixed a sideways scroll on phones: the hidden hover tooltips of the covers near the right edge made the page wider than the screen. They are now off on touch screens (`hover: none`), where they could not be shown anyway.
- **Open:** Caveat, used for the handwritten reading-time note, is not loaded yet and falls back to the system cursive.

### 2026-10-22: Vertical prototype book CRUD (#78)

- Created domain entity `Book` and repository interface `IBookRepository` in [`apps/backend/src/domain/book.ts`](../../../apps/backend/src/domain/book.ts).
- Implemented `DrizzleBookRepository` in [`apps/backend/src/infrastructure/repositories/drizzle-book-repository.ts`](../../../apps/backend/src/infrastructure/repositories/drizzle-book-repository.ts) with operations for saving, finding by ID, finding by title substring (`ilike`), and deleting books.
- Added Express endpoints in [`apps/backend/src/app.ts`](../../../apps/backend/src/app.ts):
  - `POST /book`: creates a new book (`201 Created`, requires `title`).
  - `GET /book?title=...`: lists books or filters by title substring (`200 OK`).
  - `GET /book/:id`: returns single book by UUID (`200 OK` or `404 Not Found`).
  - `DELETE /book/:id`: deletes book by UUID (`204 No Content` or `404 Not Found`).
- Added integration test suites in `apps/backend/tests/integration/`:
  - [`book-repository.test.ts`](../../../apps/backend/tests/integration/book-repository.test.ts): repository CRUD operations against PostgreSQL.
  - [`book-api.test.ts`](../../../apps/backend/tests/integration/book-api.test.ts): HTTP endpoint verification with `withApp`.
- Updated backend test script to `--test-concurrency=1` to prevent database table truncation race conditions.
- Updated [`apps/backend/README.md`](../../../apps/backend/README.md) with API endpoints documentation.

### 2026-10-23: Reading status, user library, and seed script (#78)

- Implemented `ReadingStatus` entity and `IReadingStatusRepository` in [`apps/backend/src/domain/reading-status.ts`](../../../apps/backend/src/domain/reading-status.ts), supporting status types (`not-started`, `in-progress`, `finished`, `did-not-finish`), page progress, and user library aggregation.
- Implemented `DrizzleReadingStatusRepository` in [`apps/backend/src/infrastructure/repositories/drizzle-reading-status-repository.ts`](../../../apps/backend/src/infrastructure/repositories/drizzle-reading-status-repository.ts) with upsert handling on conflict (`user_id`, `book_id`) and user library retrieval joining `reading_status` and `books`.
- Added Express endpoints in [`apps/backend/src/app.ts`](../../../apps/backend/src/app.ts):
  - `PUT /reading-status`: creates or updates user reading status and page progress (`200 OK`).
  - `GET /user/:userId/library`: returns list of user library items with book metadata and status, supporting optional `?status=` filter (`200 OK`).
- Added database seed script [`apps/backend/src/infrastructure/database/seed.ts`](../../../apps/backend/src/infrastructure/database/seed.ts) (`pnpm db:seed`): seeds demo reader user (`demo_reader`), 6 books with high-resolution Open Library cover URLs, and initial `not-started` reading status entries linking the demo user to all seeded books so the library is immediately populated for vertical prototype testing.
- Updated [`apps/backend/README.md`](../../../apps/backend/README.md) with reading status endpoints and seed documentation.


### 2026-10-23: Frontend and backend connection for library and reading status

- Connected the responsive [`/library` view](../../../apps/frontend/src/views/LibraryView.vue) to `GET /user/:userId/library` through [`api.ts`](../../../apps/frontend/src/services/api.ts), fetching the demo user's seeded books and synchronizing shelf counts dynamically. Keeps seamless fallback to mock data when offline or in unit tests.
- Connected [`/library/:bookId` view](../../../apps/frontend/src/views/BookDetailView.vue) to load book details and current reading status by UUID from the backend.
- Added interactive reading status editor to [`BookReadingPanel.vue`](../../../apps/frontend/src/components/library/BookReadingPanel.vue), allowing the reader to update status (e.g. to `in-progress`) and current page (e.g. to `10`) via `PUT /reading-status`.
- Added Express CORS middleware in [`apps/backend/src/app.ts`](../../../apps/backend/src/app.ts) with `Access-Control-Allow-Origin: *` and preflight `OPTIONS` handling to support cross-origin API calls from the deployed frontend static site.
- Updated [`apps/frontend/README.md`](../../../apps/frontend/README.md) and [`apps/backend/README.md`](../../../apps/backend/README.md).

### 2026-10-25: DTOs in their own files and the reading-status folder

`dc75f99` (DTOs), `a44c823` (folder rename).

- Moved each feature's DTO and its mapper out of the routes file into `<name>-dto.ts`: [`book-dto.ts`](../../../apps/backend/src/features/book/book-dto.ts) (`BookDto`, `toBookDto`) and [`reading-status-dto.ts`](../../../apps/backend/src/features/reading-status/reading-status-dto.ts) (`ReadingStatusDto`, `toReadingStatusDto`). The routes files now only translate HTTP to service calls. `library` already returns the plain views of its query, and `user` has no routes, so neither got a DTO file.
- Updated the [backend README](../../../apps/backend/README.md#folder-layout) and the [`oop-ddd-review`](../../../.claude/skills/oop-ddd-review/SKILL.md) skill layout. No behaviour change: the JSON contract is the same and the 58 tests pass.
- **Decision: rename the `features/reading/` folder to `features/reading-status/`.** *Why:* every file inside, the `ReadingStatus` class, the `reading_status` table, the `/reading-status` endpoint and the docs already use "reading status"; a bare `reading` could be confused with the active reading session. *Rejected:* `book-status`, because the aggregate belongs to a user and a book together (each reader has their own status for the same book), and it would clash with any future catalogue status of a book itself.

## Next steps

- Finish Supabase project configuration, trusted username authentication/uniqueness, OIDC UI approval, session callbacks/guards, logout, password recovery and onboarding (see frontend guide).

- Create the issues for the backend parts cut from #62 (layering, errors, config, CORS, logging, the test runner, ADR-0004 for the layering).
- Prod CD setup (repo admin): add `PROD_DATABASE_URL`, `RENDER_BACKEND_PROD_SERVICE_ID` and `RENDER_FRONTEND_PROD_SERVICE_ID`, and turn Auto-Deploy off on both prod services.
- Require the `commitlint` check on `main` with branch protection.
- Create the Render stg service (Auto-Deploy off), create the Render stg static site for the frontend, add the `RENDER_API_KEY` secret and the `RENDER_BACKEND_STG_SERVICE_ID` and `RENDER_FRONTEND_STG_SERVICE_ID` variables (repo admin), and use a separate Supabase project for stg.
- Turn on branch protection on `main` (required `backend` check and one approval), add the Postgres service to the backend workflow when the database lands. Frontend CI is now enabled.
- Implement folder and card menu actions on the library page, wire session persistence for the active reading session, and replace remaining static review/club mock data.
- Review the feature scope with the team, then update the MoSCoW tags in the requirements to match.
- Review the Core issues (#6 to #69) and answer their open questions, then add them to the Project board.
- Create the issues for Extras once Core is under way.
- Resolve the open questions in the requirements.
- Write the MVP definition, the vertical prototype plan and the rest of the CLAIM.
- Decide whether Supabase also serves as the database (new ADR), and close the other open decisions in [`infra.md`](../../architecture/infra.md).
- Update `table_UML.md` for Supabase Auth: remove `USER.password_hash` and `PASSWORD_RESET_TOKEN`, add `USER.timezone`.
- Decide whether to load Caveat for the handwritten notes.
- Write the release notes at the end of the iteration.
