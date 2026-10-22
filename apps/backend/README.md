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

Then open <http://localhost:3000/health>, which returns `{ "status": "ok" }`.

## Scripts

Run them inside `apps/backend`, or from the root with `pnpm --filter @bookmarked/backend <script>`.

| Script | What it does |
|---|---|
| `dev` | Starts the server with `tsx` in watch mode (restarts on save) |
| `build` | Compiles `src/` to JavaScript in `dist/` with `tsc` |
| `start` | Runs the compiled server (`pnpm build` first) |
| `lint` | Runs ESLint |
| `typecheck` | Type-checks without emitting files |
| `test` | Runs `src/**/*.test.ts` with the Node.js test runner (through `tsx`); passes when there are no test files yet |
| `db:generate` | Generates SQL migrations from schema using `drizzle-kit` |
| `db:migrate` | Applies pending migrations to the database |
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
│   ├── infrastructure/
│   │   └── database/
│   │       └── schema.ts # Drizzle ORM schema definitions
│   ├── app.ts       # createApp(): builds the Express app and its routes
│   └── server.ts    # entry point: starts the HTTP server
├── drizzle.config.ts
├── eslint.config.js
├── tsconfig.json        # used by the editor and typecheck
└── tsconfig.build.json  # used by the build (excludes tests)
```

`createApp()` is separate from `server.ts` so tests can call the app without opening a port. The layering (http, application, domain, infrastructure) is added by the next setup issues.
