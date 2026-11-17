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
