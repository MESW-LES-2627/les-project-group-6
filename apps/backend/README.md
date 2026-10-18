# Backend

The Bookmarked API: TypeScript on Node.js with [Express](https://expressjs.com) (see [ADR-0001](../../docs/ADRs/0001-choose-tech-stack.md) and [ADR-0003](../../docs/ADRs/0003-backend-http-framework.md)).

## Requirements

- Node.js (version in the root [`.nvmrc`](../../.nvmrc); run `nvm use` at the repository root)
- pnpm (run `corepack enable` once; the version is pinned in the root `package.json`)

## Getting started

From the **repository root** (the pnpm workspace installs every app at once):

```bash
pnpm install
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

CI runs lint, format check, typecheck, test and build on every pull request (see [`.github/workflows/backend-ci.yml`](../../.github/workflows/backend-ci.yml)).

## Environment variables

Read from `apps/backend/.env` when it exists. See [`.env.example`](.env.example).

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port the HTTP server listens on |

## Folder layout

```
apps/backend/
├── src/
│   ├── app.ts       # createApp(): builds the Express app and its routes
│   └── server.ts    # entry point: starts the HTTP server
├── eslint.config.js
├── tsconfig.json        # used by the editor and typecheck
└── tsconfig.build.json  # used by the build (excludes tests)
```

`createApp()` is separate from `server.ts` so tests can call the app without opening a port. The layering (http, application, domain, infrastructure) is added by the next setup issues.
