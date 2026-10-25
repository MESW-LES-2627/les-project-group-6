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
├── database/
│   ├── migrations/  # Drizzle SQL migrations and journal metadata
│   └── schema.sql   # PostgreSQL database schema matching UML specification
├── src/
│   ├── domain/           # Pure TypeScript: no Drizzle, pg or Express imports
│   │   ├── shared/       # DomainError families and the typed Uuid base
│   │   ├── book/         # Book entity, value objects (BookId, BookTitle, Isbn13, PageCount), repository interface
│   │   ├── user/         # User entity, value objects (UserId, Email, Username), repository interface
│   │   └── reading/      # ReadingStatus aggregate, ReadingState (State pattern), PageProgress, repository interface
│   ├── application/      # Use cases that orchestrate the domain (book, reading) and read-side queries (library)
│   ├── http/             # Express routers, DTOs, CORS and the domain-error to HTTP status mapping
│   ├── infrastructure/
│   │   ├── database/     # pool, schema (query builder only), migrate, seed, health check
│   │   ├── persistence/  # Data Mappers between rows and domain objects
│   │   ├── queries/      # Read-side query objects (DrizzleLibraryQuery)
│   │   └── repositories/ # Drizzle repositories implementing the domain interfaces
│   ├── app.ts            # createApp(): composition root, wires use cases and routes by hand
│   └── server.ts         # entry point: builds the dependencies and starts the HTTP server
├── tests/
│   ├── helpers/     # Shared test utilities (http, test-db, in-memory repositories)
│   ├── unit/        # Domain and use case tests, no database needed
│   └── integration/ # Integration tests against the database and HTTP API
├── drizzle.config.ts
├── eslint.config.js
├── tsconfig.json        # used by the editor and typecheck
└── tsconfig.build.json  # used by the build (excludes tests)
```

`createApp()` is separate from `server.ts` so tests can call the app without opening a port. Dependencies point inwards: `http → application → domain ← infrastructure`. Drizzle is used only as a typed query builder inside `infrastructure/`; the relational API (`relations()`, `db.query`, `with:`) is not used. Domain errors map to HTTP status codes in [`src/http/error-handler.ts`](src/http/error-handler.ts): invalid values give 400, missing aggregates 404 and forbidden state changes 409.
