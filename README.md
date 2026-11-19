# Bookmarked

Bookmarked is a web app that helps readers build a lasting reading habit, with friends and groups keeping each other reading. It works like a fitness tracker for books:

- a **session timer** measures real reading time for a book;
- **streaks, yearly goals, badges, XP and levels** reward consistency;
- a **personal library** keeps every book with its status, rating, review, folders and tags;
- **friends, profiles and an activity feed** make reading social;
- **groups** run reading **challenges** and **book clubs**, with chat and leaderboards;
- **search, explore and trending books** help readers find what to read next.

> **University project.** Group 6's project for the **Software Engineering Lab (LES)** course of the master's degree, also used for the OOP course deliverables.

See the [product vision](docs/iterations/0/Vision.md) and the [requirements](docs/requirements/requirements.md).

## Iterations

| Iteration | Claim |
|---|---|
| 0 | [CLAIM.md](docs/iterations/0/CLAIM.md) |
| 1 | [CLAIM.md](docs/iterations/1/CLAIM.md) |
| 2 | [CLAIM.md](docs/iterations/2/CLAIM.md) |
| 3 | [CLAIM.md](docs/iterations/3/CLAIM.md) |
| 4 | [CLAIM.md](docs/iterations/4/CLAIM.md) |

## Architecture

```
 ┌──────────────────────┐   login / session (supabase-js)   ┌───────────────────────────┐
 │ Frontend             │ ────────────────────────────────▶ │ Supabase Auth             │
 │ Vue 3 SPA (Vite)     │                                   └───────────────────────────┘
 └──────────┬───────────┘                                                ▲
            │ REST (JSON) + Socket.IO chat                               │ verifies the JWT
            │ Authorization: Bearer <Supabase JWT>                       │
            ▼                                                            │
 ┌──────────────────────┐ ───────────────────────────────────────────────┘
 │ Backend              │
 │ Node.js + Express    │   book search and details, cached   ┌───────────────────────────┐
 │ TypeScript, Drizzle  │ ──────────────────────────────────▶ │ Open Library API          │
 └──────────┬───────────┘                                     │ (openlibrary.org)         │
            │ SQL                                             └───────────────────────────┘
            ▼
 ┌──────────────────────┐
 │ PostgreSQL           │
 │ Supabase (stg, prod) │
 │ Docker (local)       │
 └──────────────────────┘
```

- **Frontend** (`apps/frontend`): Vue 3 single-page app. The reader logs in with Supabase Auth, and every API call sends the Supabase access token. Group chat uses Socket.IO.
- **Backend** (`apps/backend`): Express API organised by feature (`src/features/<feature>/` with routes, service, repository and domain model). It checks the Supabase JWT on every route except `/health`, holds the business rules and is the only part that talks to the database and to Open Library.
- **Book catalogue**: books come from the public [Open Library API](https://openlibrary.org/developers/api). The backend searches it, saves the books readers use in its own `books` table and caches queries, so the frontend never calls Open Library directly.
- **Database**: PostgreSQL. Supabase hosts it in staging and production; `docker-compose.yml` runs it locally. The schema lives in Drizzle (`apps/backend/src/database/`) with SQL migrations.
- **Deploy**: GitHub Actions run CI on every pull request and deploy both apps to Render (production on every push to `main`, staging on demand).

See [docs/architecture/](docs/architecture/) for the infrastructure, API routes and data model.

## Repository structure

```
.
├── apps/
│   ├── backend/                   # Express API (TypeScript)
│   │   ├── src/
│   │   │   ├── api/               # router and health route
│   │   │   ├── config/            # environment variables
│   │   │   ├── database/          # Drizzle schema, migrations, seed, pool
│   │   │   ├── features/          # one folder per feature: routes, service, repository, domain
│   │   │   ├── middleware/        # auth (Supabase JWT), CORS, error handling
│   │   │   ├── utils/
│   │   │   ├── app.ts             # Express app
│   │   │   └── server.ts          # HTTP + Socket.IO server entry point
│   │   ├── tests/                 # unit/, integration/, helpers/
│   │   ├── Dockerfile
│   │   ├── drizzle.config.ts
│   │   └── stryker.config.mjs     # mutation testing
│   └── frontend/                  # Vue 3 SPA (Vite)
│       ├── src/
│       │   ├── components/
│       │   ├── views/             # one component per page
│       │   ├── router/            # routes and auth guard
│       │   ├── services/          # API client, auth, chat socket
│       │   ├── stores/            # session store
│       │   ├── utils/
│       │   ├── types/
│       │   ├── mocks/             # mock data only for features not built yet (home, profile)
│       │   └── assets/
│       ├── e2e/                   # Playwright end-to-end tests
│       ├── playwright.config.ts
│       ├── vitest.config.ts
│       └── stryker.config.mjs     # mutation testing
├── docs/
│   ├── README.md                  # documentation index
│   ├── architecture/              # includes password-recovery.md
│   ├── requirements/
│   ├── iterations/                # 0–4; active iteration 2
│   ├── oop_assets/
│   ├── design.md
│   └── superpowers/               # specs and implementation plans
├── .github/
│   └── workflows/
│       ├── e2e.yml                # e2e suite on main and manual dispatch
│       └── mutation.yml           # Stryker mutation testing, weekly and manual
├── .agents/
├── .claude/skills/            # project skills for Claude Code (e.g. oop-ddd-review)
├── AGENTS.md
├── Makefile
│   ├── architecture/              # infrastructure, API routes, data model
│   ├── iterations/                # one folder per iteration: CLAIM, log, LLM_LOG, release notes
│   │   ├── 0/ … 4/
│   ├── requirements/              # requirements and feature priority
│   ├── oop_assets/                # class, component and event-storming diagrams
│   ├── superpowers/               # design specs and implementation plans
│   └── design.md
├── scripts/
│   ├── test-history.sh            # tests vs source files per merged PR
│   └── traceability.mjs           # tests per requirement from @req tags
├── .github/workflows/             # CI, CD (staging, prod), e2e, mutation, releases, commitlint
├── .claude/skills/                # project skills for AI agents
├── AGENTS.md                      # instructions for AI coding agents
├── Makefile                       # shortcuts for the commands below
├── docker-compose.yml             # local PostgreSQL
├── package.json                   # pnpm workspace root scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json             # strict TypeScript flags shared by the apps
└── .nvmrc                         # Node 24 LTS
```

### `apps/`

The application source code. Each app is a pnpm workspace with its own `package.json`, `tsconfig.json` (extending the root base) and ESLint config. Tooling shared by every app lives in the repository root (see [Root config](#root-config)).

- `apps/frontend/`: the Vue 3 web client with shared CSS tokens, a home page prototype, a profile page prototype and groups pages (list, create, challenge, book club) backed by the API with mock groups kept for the design demo, and other prototypes with mock data, router and component tests, ESLint, Prettier, vue-tsc and Vitest. See [apps/frontend/README.md](apps/frontend/README.md) for commands and production API routing.
  Authentication uses Supabase Auth: `/login` (log in / sign up), a session store in `src/stores/`, a router guard, `/forgot-password`, `/reset-password`, `/complete-profile` and sign out from the header. Every API call sends the Supabase token. See the frontend guide for the environment variables.
- `apps/backend/`: the server, API and business logic (TypeScript, Node.js, Express). Every route except `/health` verifies the Supabase JWT and takes the user from it; `/me` creates and reads the reader's profile. See [apps/backend/README.md](apps/backend/README.md) for how to run it.

### Makefile

Shortcuts for the pnpm workspace. `install` and `format` run once at the root; the other targets run each app's own pnpm scripts. Run `make help` to list the targets: `install`, `dev`, `build`, `lint`, `typecheck`, `format`, `format-check`, `test`, `coverage`, `mutation`, `traceability`, `test-history`, `check` (everything CI should run) and `clean`. Add `APP=backend` to limit a target to one app. New folders in `apps/` are picked up automatically, and apps without a given script are skipped.

### Root config

Shared by every app, so a change is made in one place:

- `package.json` and `pnpm-workspace.yaml`: the pnpm workspace (one `pnpm install` and one `pnpm-lock.yaml` for all apps; `packageManager` pins the pnpm version) and root scripts that run in every workspace: `lint`, `typecheck`, `test`, `build`, `format`, `format:check`.
- `tsconfig.base.json`: the strict TypeScript flags; each app's `tsconfig.json` extends it.
- `.nvmrc`: the Node.js version, 24 LTS (run `nvm use`). `engines` in `package.json` requires the same version, and `.npmrc` sets `engine-strict=true` so `pnpm install` fails on an older Node.
- `.editorconfig`, `.prettierrc.json` and `.prettierignore`: the same formatting everywhere.

Per-app files stay in each app: `package.json`, `tsconfig.json`, ESLint config, `.env.example` and, for deployed apps, a `Dockerfile` (built from the repository root, see `.dockerignore`). Each app still has its own CI workflow and deploy.

### `docs/`

All project documentation. See [docs/README.md](docs/README.md) for an index that explains each folder and file.

- `docs/architecture/`: API routes, infrastructure, table UML and the [password recovery guide](docs/architecture/password-recovery.md), including external Supabase setup and live verification steps.
- `docs/requirements/`: [requirements](docs/requirements/requirements.md) and [feature priorities](docs/requirements/features_priority.md).
- `docs/iterations/`: iteration deliverables and running project/AI logs (active iteration 2).
- `docs/oop_assets/` and `docs/design.md`: diagrams, analysis and design references.
- `docs/superpowers/`: feature specifications and implementation plans.

### `.github/`

GitHub configuration: the pull request template, the issue templates (`ISSUE_TEMPLATE/`: user story, feature, bug, refactor and tests) and the CI workflows (`workflows/`). Sprints are planned on the [prioritized backlog](https://github.com/orgs/MESW-LES-2627/projects/23) project: user stories with Gherkin acceptance criteria, a Priority, story points and a one-week Iteration (sprint); their tasks are sub-issues.

#### Continuous integration

Workflows live in `.github/workflows/` and are named `<app>-ci.yml` for checks and `<app>-cd-<env>.yml` for deploys (`release.yml` tags the versions, `iteration-release.yml` makes the sprint releases), so each app's CI stays separate. A change to one app does not run the other app's checks:

- `backend-ci.yml`: runs on every pull request to `main` when `apps/backend/`, the shared root config or the workflow itself changes. It installs with the locked dependencies, then runs lint, format check, typecheck, tests (against a Postgres service) and build.
- `frontend-ci.yml`: the same steps for `apps/frontend/`: lint, format check, typecheck, component/router tests and build.
- `e2e.yml`: runs the Playwright suite of `apps/frontend/e2e/` against the built stack and the shared database, on pushes to `main` and manual dispatch only (not a pull request check).
- `commitlint.yml`: runs on every pull request to `main` and fails when a commit (merge commits aside) does not follow Conventional Commits: `<type>(<scope>)!: <description>` with type `build`, `chore`, `ci`, `db`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style` or `test`. Fix a bad message with `git commit --amend` or `git rebase -i` and force-push.

#### Deploy (Render)

The backend runs on Render as two Docker web services linked to this repository:

- **prod**: deployed only by `backend-cd-prod.yml` (below), never by Render Auto-Deploy.
- **stg**: deployed only by `backend-cd-stg.yml`. Run it by hand (Actions, "Backend CD (stg)", "Run workflow") and pick any branch in "Use workflow from". It points the stg service at that branch through the Render API, deploys that commit, waits until it is live and checks `/health`. It needs the secret `RENDER_API_KEY` and the variable `RENDER_BACKEND_STG_SERVICE_ID` (the `srv-...` id), and Auto-Deploy turned off on the stg service.

Settings for both services (stg gets its own environment values, never the prod database):

- Runtime: Docker, Root Directory empty, Dockerfile Path `apps/backend/Dockerfile`, Docker Build Context `.`
- Health check path: `/health`. Render sets `PORT` itself.
- Environment: `NODE_OPTIONS=--max-old-space-size=384` (free instance has 512 MB), and `DATABASE_URL` (Supabase pooler connection string) once the database is set up.

The frontend runs on Render as a static site (no Dockerfile; Vite builds plain files). Staging is deployed only by `frontend-cd-stg.yml`, the same way as the backend: run "Frontend CD (stg)" by hand and pick the branch in "Use workflow from". It needs the secret `RENDER_API_KEY`, the variable `RENDER_FRONTEND_STG_SERVICE_ID` and Auto-Deploy turned off on the stg site. Settings for the static site:

- Root Directory empty (the pnpm lockfile lives at the repository root).
- Build command: `pnpm install --frozen-lockfile --filter @bookmarked/frontend... && pnpm --filter @bookmarked/frontend build` (no `corepack enable`: `/usr/bin` is read-only on Render and `pnpm` is already there).
- Publish directory: `apps/frontend/dist`.
- Redirects/Rewrites, in this order: `/api/*` rewrite to `https://<backend-service>.onrender.com/*` (so `VITE_API_BASE_URL=/api` works and no CORS is needed), then `/*` rewrite to `/index.html` (the router uses history mode).

#### Production deploy and versions

Every merge to `main` deploys the apps it changed, each in its own workflow (they can also be run by hand from Actions). Each step stops the run on failure, so a broken deploy shows up red in Actions:

- **Backend CD (prod)** (`backend-cd-prod.yml`): `ci` (calls `backend-ci.yml`), `migrate` (`db:migrate` on the prod database with `PROD_DATABASE_URL`), then `deploy`: start the Render deploy of that commit, wait while Render builds the image and goes live, print the Render build log, check `/health`.
- **Frontend CD (prod)** (`frontend-cd-prod.yml`): `ci` (calls `frontend-ci.yml`), then `deploy`: the same Render steps for the static site, ending with a check that the site answers. It does not wait for the backend deploy of the same merge.
- **Release** (`release.yml`): runs when a prod CD succeeds and, once every prod CD of that commit has succeeded, creates the version tag `vX.Y.Z` (a tag only, no GitHub Release), made by [semantic-release](https://semantic-release.gitbook.io/) from the commits since the last tag (config in the `release` key of the root `package.json`). `feat` bumps minor, `fix`/`perf`/`revert` bump patch, a breaking change (`type!:` or `BREAKING CHANGE:`) bumps major. A merge with only `docs`, `chore`, `ci`, `style`, `test`, `build` or `refactor` commits makes no release, and a failed deploy is never tagged. Versions started from a hand-made `v0.1.0` (semantic-release would otherwise start at `v1.0.0`).
- **Iteration release** (`iteration-release.yml`): the only GitHub Releases, one per sprint, named `iter-0` to `iter-4`. Run it by hand at the end of the sprint (Actions, "Iteration release", "Run workflow"), pick the iteration and the commit or branch (default `main`). It tags that commit `iter-N` and creates the release of the same name, marked as latest, with `docs/sprints/iteration_N/release_notes.md` (when filled in) followed by the pull requests merged since the previous `iter-*` tag. It refuses to run when the release already exists, or when the tag already exists on another commit.

Setup (repo admin): secrets `RENDER_API_KEY` and `PROD_DATABASE_URL`, variables `RENDER_BACKEND_PROD_SERVICE_ID` and `RENDER_FRONTEND_PROD_SERVICE_ID`, and Auto-Deploy turned off on both prod services.

To try the image locally: `docker build -f apps/backend/Dockerfile -t bookmarked-backend .` then `docker run -p 3000:3000 bookmarked-backend`.

A pull request must be green before review. Run `make check` locally to run the same checks before pushing.

### `.agents/` and `AGENTS.md`

Configuration and instructions for AI coding agents working on this repository.

- `.claude/skills/oop-ddd-review/SKILL.md`: reviews `apps/backend` for raw OOP, DDD and design-pattern usage (no ORM-driven design, rich domain model, value objects, aggregates, layering) and recommends which OOP/DDD/GoF pattern to add or substitute.

## Getting started

Requirements: [nvm](https://github.com/nvm-sh/nvm) (Node 24 from `.nvmrc`), Docker for the local database, and `make` (optional).

```bash
git clone git@github.com:MESW-LES-2627/les-project-group-6.git
cd les-project-group-6
nvm install && corepack enable
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
docker compose up -d   # local PostgreSQL
make install
make dev               # backend on http://localhost:3000
make dev APP=frontend  # frontend
```

## Make commands

Add `APP=<name>` to run a command for one app only, for example `make build APP=backend`.

| Command | What it does |
|---|---|
| `make help` | List every command (default when you run `make`) |
| `make install` | Install the dependencies of the whole workspace (`pnpm install --frozen-lockfile`) |
| `make dev` | Run one app in watch mode (backend by default; `APP=frontend` for the frontend) |
| `make start` | Run the compiled app (run `make build` first) |
| `make build` | Build every app |
| `make lint` | Run the linters |
| `make typecheck` | Type-check without emitting files |
| `make format` | Format the repository with Prettier |
| `make format-check` | Check formatting with Prettier |
| `make test` | Run the tests (apps without tests are skipped) |
| `make coverage` | Run the tests with coverage; fails below 95% of lines (reports in `apps/<name>/coverage/`) |
| `make mutation` | Mutation testing with Stryker, slow (reports in `apps/<name>/reports/mutation/`) |
| `make traceability` | Markdown table of tests per requirement, from the `@req` tags |
| `make test-history` | Markdown table of source vs test files changed per merged PR |
| `make check` | Everything CI runs: `lint`, `typecheck`, `format-check`, `test`, `build` |
| `make clean` | Remove build output and installed dependencies |
