# Backend

The Bookmarked API: TypeScript on Node.js with [Express](https://expressjs.com) and PostgreSQL with [Drizzle ORM](https://orm.drizzle.team) (see [ADR-0001](../../docs/ADRs/0001-choose-tech-stack.md), [ADR-0003](../../docs/ADRs/0003-backend-http-framework.md) and [ADR-0004](../../docs/ADRs/0004-database-access-and-migrations.md)).

## Requirements

- Node.js (version in the root [`.nvmrc`](../../.nvmrc); run `nvm use` at the repository root)
- pnpm (run `corepack enable` once; the version is pinned in the root `package.json`)
- Docker (for local PostgreSQL 17 database)

## Getting started

From the **repository root**:

```bash
pnpm install
docker compose up -d db                           # starts local PostgreSQL 17 on port 5432
cp apps/backend/.env.example apps/backend/.env   # optional, defaults work
pnpm dev:backend
```

`make install` and `make dev` do the same (see the root README).

Then open <http://localhost:3000/health>, which returns `{ "status": "ok", "db": "ok" }`.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check returning `{ "status": "ok", "db": "ok" }` |
| `POST` | `/book` | Creates a new book (`201 Created`, requires `title`) |
| `GET` | `/book?title=...` | Lists books or filters by title substring (`200 OK`) |
| `GET` | `/book/:id` | Returns a single book by UUID (`200 OK` or `404 Not Found`) |
| `DELETE` | `/book/:id` | Deletes a book by UUID (`204 No Content` or `404 Not Found`) |
| `PUT` | `/reading-status` | Sets reading status and page progress for a book (`200 OK`) |
| `PATCH` | `/reading-status/:id` | Edits an existing reading status by ID (`200 OK` or `404 Not Found`) |
| `PATCH` | `/reading-status` | Edits an existing reading status by ID or userId + bookId (`200 OK` or `404 Not Found`) |
| `GET` | `/user/:userId/library` | Returns user's library with progress, supports `?status=` (`200 OK`) |
| `POST` | `/reading-sessions` | Starts a timed session on a book, or resumes the one running on it (`201`; `409` if another book's session is running) |
| `PATCH` | `/reading-sessions/:id/finish` | Finishes the session; duration and counted minutes come from the server clock (`200`; `409` if already finished) |
| `DELETE` | `/reading-sessions/:id` | Cancels a running session started by mistake; nothing is counted (`204`; `409` if already finished) |
| `GET` | `/user/:userId/reading-sessions/active` | Returns the running session with server-measured `elapsedSeconds` (`200` or `204`) |
| `POST` | `/groups/challenges` | Creates a challenge group (`name`, `startDate`, `durationDays`, `winMetric`); the creator is admin and first member (`201`) |
| `GET` | `/groups/challenges/:id` | Returns the group, its challenge and `standings` (counted minutes of sessions finished in the period, split by book in `books`) (`200` or `404`) |
| `GET` | `/user/:userId/groups` | Lists the challenge groups the user belongs to (`200 OK`) |
| `GET` | `/user/:userId/reading-stats` | Returns `{ totalMinutes, sessionsCount }` over finished sessions (`200 OK`) |

CORS middleware is enabled globally (`Access-Control-Allow-Origin: *`) with preflight `OPTIONS` support for cross-origin browser clients.

## Scripts

Run them inside `apps/backend`, or from the root with `pnpm --filter @bookmarked/backend <script>`.

| Script | What it does |
|---|---|
| `dev` | Starts the server with `tsx` in watch mode (restarts on save) |
| `build` | Compiles `src/` to JavaScript in `dist/` with `tsc` |
| `start` | Runs the compiled server (`pnpm build` first) |
| `lint` | Runs ESLint |
| `typecheck` | Type-checks without emitting files |
| `test` | Runs `tests/**/*.test.ts` with the Node.js test runner (through `tsx`) |
| `db:generate` | Generates SQL migrations from schema using `drizzle-kit` |
| `db:migrate` | Applies pending migrations to the database |
| `db:seed` | Populates database with demo user, books, and reading statuses |
| `db:studio` | Opens Drizzle Studio local database viewer |

CI runs lint, format check, typecheck, test and build on every pull request (see [`.github/workflows/backend-ci.yml`](../../.github/workflows/backend-ci.yml)).

## Environment variables

Read from `apps/backend/.env` when it exists. See [`.env.example`](.env.example).

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port the HTTP server listens on |
| `DATABASE_URL` | `postgresql://postgres:password123@localhost:5432/bookmarked_dev` | PostgreSQL connection string |
| `DATABASE_URL_TEST` | `postgresql://postgres:password123@localhost:5432/bookmarked_test` | PostgreSQL connection string for tests |

## Folder layout

```
apps/backend/
├── src/
│   ├── features/          # One folder per feature, with everything about it
│   │   ├── book/          # book.ts (Book + value objects), book-repository.ts (interface + Drizzle + mapper),
│   │   │                  # book-service.ts (get/register/search/remove), book-dto.ts (JSON shape + mapper),
│   │   │                  # book-routes.ts (routes)
│   │   ├── reading-status/ # ReadingStatus aggregate, ReadingState (State pattern) + PageProgress, repository, service, DTO, routes
│   │   ├── challenge-group/ # ChallengeGroup aggregate (groups + member + challenges), repository, standings query, service, DTO, routes
│   │   ├── reading-session/ # ReadingSession aggregate (server-timed), repository + stats, service, DTO, routes
│   │   ├── user/          # User entity + value objects (UserId, Email, Username), repository
│   │   └── library/       # Read-side query (CQRS) and the library route
│   ├── api/               # router.ts wires each feature's service and mounts its routes; health route
│   ├── config/            # env.ts: every setting read from the environment
│   ├── middleware/        # CORS and the domain-error to HTTP status mapping
│   ├── utils/             # DomainError families and the typed Uuid base
│   ├── database/
│   │   ├── migrations/    # Drizzle SQL migrations and journal metadata
│   │   ├── schema.ts      # Tables for the query builder (source of the migrations)
│   │   ├── schema.sql     # PostgreSQL database schema matching UML specification
│   │   └── pool.ts, migrate.ts, seed.ts, health-check.ts
│   ├── app.ts             # createApp(): middleware, the API router and the error handler
│   └── server.ts          # entry point: builds the repositories and starts the HTTP server
├── tests/
│   ├── helpers/     # Shared test utilities (http, test-db, in-memory repositories)
│   ├── unit/        # Entity, value object and service tests, no database needed
│   └── integration/ # Integration tests against the database and HTTP API
├── drizzle.config.ts
├── eslint.config.js
├── tsconfig.json        # used by the editor and typecheck
└── tsconfig.build.json  # used by the build (excludes tests)
```

`createApp()` is separate from `server.ts` so tests can call the app without opening a port. Each feature keeps the DDD layers as files rather than folders: the entity file (`book.ts`) and the service (`book-service.ts`) are plain TypeScript, and only `*-repository.ts`, `*-query.ts` and `*-routes.ts` may import Drizzle, `pg` or Express. ESLint enforces this with `no-restricted-imports` (see [`eslint.config.js`](eslint.config.js)). A service has one method per use case and receives the repository interfaces, so unit tests use in-memory repositories. Drizzle is used only as a typed query builder; the relational API (`relations()`, `db.query`, `with:`) is not used. Domain errors map to HTTP status codes in [`src/middleware/error-handler.ts`](src/middleware/error-handler.ts): invalid values give 400, missing aggregates 404 and forbidden state changes 409.
