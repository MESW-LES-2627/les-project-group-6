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
| Infrastructure | Draft v0.1, database host and local setup still open |
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

## Next steps

- Create the issues for the backend parts cut from #62 (layering, errors, config, CORS, logging, Vitest, ADR-0004 for the layering), and add `apps/frontend` as a new workspace (it needs its own `package.json`, `tsconfig.json` extending the root base, and ESLint config) when the frontend starts.
- Review the feature scope with the team, then update the MoSCoW tags in the requirements to match.
- Review the Core issues (#6 to #69) and answer their open questions, then add them to the Project board.
- Create the issues for Extras once Core is under way.
- Resolve the open questions in the requirements.
- Write the MVP definition, the vertical prototype plan and the CLAIM.
- Decide whether Supabase also serves as the database (new ADR), and close the other open decisions in [`infra.md`](../../architecture/infra.md).
- Update `table_UML.md` for Supabase Auth: remove `USER.password_hash` and `PASSWORD_RESET_TOKEN`, add `USER.timezone`.
- Write the release notes at the end of the iteration.
