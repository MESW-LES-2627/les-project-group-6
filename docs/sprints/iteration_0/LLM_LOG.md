# LLM Usage Log - Iteration 0

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


### 2026-10-17: Commit and push iteration 0 docs

- **Date:** 2026-10-17
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** docs

#### Prompt
```text
commit everything and push to main
```

#### Explanation of Changes
Committed the pending docs to `main` in two commits: the event storming (`95bee22`), and the feature scope, infrastructure draft and log updates (`a50389e`). Before committing, fixed three broken links in `README.md`, `docs/README.md` and `log.md` that pointed to `feature_scope.md` instead of the real file, `features_priority.md`.

### 2026-10-18: Rebase backend branch on main and resolve conflict

- **Date:** 2026-10-18
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** docs

#### Prompt
```text
pull main changes and solve conflicts
```

#### Explanation of Changes
Pulled `main` into `feat/62-backend-setup` (rebase). The only conflict was in `docs/sprints/iteration_0/log.md`, where `main` added the "LLM interaction logs template" entry and the branch added the "Backend setup (#62)" entry at the same place. Kept both in date order, then force-pushed the branch with `--force-with-lease`.

### 2026-10-18: Compare npm and pnpm, switch to pnpm

- **Date:** 2026-10-18
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5 / Claude Sonnet 5.5
- **Tool:** Claude Code
- **Domain:** backend, tooling

#### Prompt
```text
what are the pros and cons to use npm and pnpm
change to pnpm
```

#### Explanation of Changes
Compared npm and pnpm for the workspace setup, then migrated to pnpm: added `pnpm-workspace.yaml`, imported the lockfile, set `packageManager`, converted the root scripts, and updated the READMEs. Checked lint, typecheck, build, formatting and `GET /health`. Removed the backend's duplicate `format:check` script and ignored `pnpm-lock.yaml` in Prettier.

### 2026-10-18: Isolate apps, remove shared root config

- **Date:** 2026-10-18
- **Author:** Robert Gleison
- **Model:** Claude Sonnet 5.5
- **Tool:** Claude Code
- **Domain:** backend, tooling

#### Prompt
```text
actually, I think I prefer to have everything isolated
```

#### Explanation of Changes
Converted the repo from a shared root to isolated apps: removed the root `package.json`, workspace file, `tsconfig.base.json` and lockfile, and moved the Node, editor and Prettier config into `apps/backend` with its own lockfile and scripts. Verified lint, typecheck, build, format check and `GET /health` from inside `apps/backend`. Updated both READMEs and the iteration log.

### 2026-10-18: Choose Express, write ADR-0003, replace Hono

- **Date:** 2026-10-18
- **Author:** Robert Gleison
- **Model:** Claude Sonnet 5.5
- **Tool:** Claude Code
- **Domain:** backend, architecture

#### Prompt
```text
give me a comparison between hono, express and fastify
so, keep express because is the most used and familiar. Create and ADR with this choose and update the ts files with express
```

#### Explanation of Changes
Compared the three frameworks, then wrote ADR-0003 choosing Express 5. Rewrote `apps/backend/src/app.ts` and `server.ts` for Express, swapped the dependencies, and checked lint, typecheck, build, formatting and `GET /health`. Updated the READMEs, docs index and iteration log.

### 2026-10-18: Add a Makefile

- **Date:** 2026-10-18
- **Author:** Robert Gleison
- **Model:** Claude Sonnet 5.5
- **Tool:** Claude Code
- **Domain:** tooling

#### Prompt
```text
can we create a makefile with all the commands? build, test, run...
```

#### Explanation of Changes
Added a root `Makefile` that delegates to each app's pnpm scripts (install, dev, build, lint, typecheck, format, test, check, clean), with `APP=` to target one app and an error on an unknown app. Tested `make check`, `make build APP=backend` and `make dev` with `/health`. Documented it in the root and backend READMEs and the iteration log.

### 2026-10-18: Return to a shared root config

- **Date:** 2026-10-18
- **Author:** Robert Gleison
- **Model:** Claude Sonnet 5.5
- **Tool:** Claude Code
- **Domain:** tooling

#### Prompt
```text
actually, lets use a shared repo format. global config files. commit and push later
```

#### Explanation of Changes
Moved the Node, editor and Prettier config back to the repository root and restored a pnpm workspace with one lockfile and `tsconfig.base.json`. The backend's `tsconfig.json` extends the base again and its own lockfile, Prettier config and format scripts were removed. Changed the Makefile so `install` and `format` run at the root. Checked `make check`, `make build APP=backend` and `GET /health`. Updated the READMEs and the iteration log. Not committed yet, as requested.

### 2026-10-18: Align and enforce the Node version

- **Date:** 2026-10-18
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** tooling

#### Prompt
```text
the files are inconsistent?
how can we solve this? what is the lts version
yes
```

#### Explanation of Changes
Found that `.nvmrc` and `@types/node` targeted Node 24 while `engines` allowed `>=22.13`. Checked the current Node LTS schedule, set `engines.node` to `>=24` and added a root `.npmrc` with `engine-strict=true`. Verified that install fails on Node 18 and that `make check` passes on Node 24. Updated the README and the iteration log.

### 2026-10-18: README setup and run guide

- **Date:** 2026-10-18
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** docs

#### Prompt
```text
lets do the following, add in the readme how to setup and run the project with the commands (add the make commands and the original commands)
```

#### Explanation of Changes
Rewrote the README "Getting started" section with prerequisites, setup steps, and tables pairing each `make` target with the equivalent pnpm command, plus a troubleshooting list based on the Node version problems found while testing.

### 2026-10-18: CI workflows for frontend and backend

- **Date:** 2026-10-18
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** infra

#### Prompt
```text
now, add a ci for frontend and backend. the frontend file must be commented because fron not exists yer, and backend will run lint checks and tests (must pass when we have no  tests)
```

#### Explanation of Changes
Added `.github/workflows/backend-ci.yml` (install, lint, format check, typecheck, test and build on pull requests and pushes to `main`, filtered to backend and shared root files) and a fully commented `frontend-ci.yml` with the same steps. Added a backend `test` script using the Node.js test runner through `tsx`, which passes with no test files, and a root `test` script. Updated the READMEs and the iteration log.

### 2026-10-22: Initial frontend routes

- **Date:** 2026-10-22
- **Author:** Segun Adesanya
- **Model:** GPT-6 Luna
- **Tool:** GitHub Copilot in VS Code
- **Domain:** frontend, testing

#### Prompt
```text
Create these initial routes:
PathPlaceholder
`/`Redirect to the agreed starting route
`/login`Login placeholder
`/home`Home placeholder
Any unknown path Not-found page
```

#### Explanation of Changes
Implemented the initial routes with `/login` as the starting route, following the product requirements, and added router tests for the redirect, home route and not-found fallback.

### 2026-10-22: Frontend foundations and connectivity

- **Date:** 2026-10-22
- **Author:** Segun Adesanya
- **Model:** GPT-6
- **Tool:** Codex
- **Domain:** frontend, testing, tooling, docs

#### Prompt
```text
1. Keep the palette defined once in tokens.css with semantic aliases, base typography
and spacing. Use Lora and Inter and inspect the design screenshots.
2. A dev status line or Home/404 placeholder calls GET /health and shows the result
locally and in production.
3. ESLint (eslint-plugin-vue), Prettier, vue-tsc and Vitest + @vue/test-utils with
one component test.
```

#### Explanation of Changes
Inspected Home and authentication screenshots; added Lora heading and Inter body font roles, semantic tokens and global styles. Implemented a configurable health request and Home status with timeout/error handling, a local same-origin Vite proxy, and component tests. Adjusted existing scripts for non-mutating lint and single-run tests, added formatting scripts, enabled frontend CI and documented production API routing. Updated the design index, repository guide and iteration log; Verified frontend lint, formatting, typecheck, 7 tests, production build and a live local proxy response of `{ "status": "ok" }`; deployment verification remains external to this change.

### 2026-10-22: Fix local CORS environment override

- **Date:** 2026-10-22
- **Author:** Segun Adesanya
- **Model:** GPT-6
- **Tool:** Codex
- **Domain:** frontend, docs

#### Prompt
```text
fix CORS error
Access to fetch at http://localhost:3000/health from origin http://localhost:5173
has been blocked: no Access-Control-Allow-Origin header.
```

#### Explanation of Changes
Found the ignored frontend .env overriding the API base with the backend origin. Changed that setting to /api so requests use the existing same-origin Vite proxy. Documented troubleshooting and the required Vite restart in the frontend README.
