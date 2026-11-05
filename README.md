# Bookmarked

Bookmarked (temporary name) is a web app where readers build a lasting reading habit, and where friends and groups keep each other reading. It works like a tracker app for books: it measures real reading time with a session timer, rewards consistency with streaks, goals, badges and levels, and makes reading a shared activity through friends, challenges and book clubs.

> **University project.** This repository is the group project (Group 6) for the **Software Engineering Lab (LES)** classes of a master's degree. It is also used for the deliverables of the OOP classes.

## Main features

- Reading session timer linked to a book, with streaks and yearly goals
- Personal library with statuses, ratings, folders and tags
- Friends, activity feed and public or private profiles
- Groups: reading **challenges** and **book clubs**, with chat and leaderboards
- Badges, XP and levels
- Search, reviews, trending books and monthly or yearly retrospectives

See the [product vision](docs/sprints/iteration_0/vision.md) and the full [requirements](docs/product/requirements.md).

## Repository structure

```
.
├── apps/
│   ├── frontend/                  # Vue client; see apps/frontend/README.md
│   └── backend/
├── docs/
│   ├── ADRs/
│   ├── architecture/
│   ├── design/
│   ├── OOP_documents/
│   ├── product/
│   ├── specs/
│   └── sprints/
├── infra/
├── scripts/
├── .github/
├── .agents/
├── .claude/skills/            # project skills for Claude Code (e.g. oop-ddd-review)
├── AGENTS.md
├── Makefile
├── package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.base.json
├── .nvmrc
├── .npmrc
├── .dockerignore
├── .editorconfig
├── .prettierrc.json
└── .prettierignore
```

### `apps/`

The application source code. Each app is a pnpm workspace with its own `package.json`, `tsconfig.json` (extending the root base) and ESLint config. Tooling shared by every app lives in the repository root (see [Root config](#root-config)).

- `apps/frontend/`: the Vue 3 web client with shared CSS tokens, a home page prototype, a profile page prototype and groups pages (list, create, challenge, book club) backed by the API with mock groups kept for the design demo, and other prototypes with mock data, router and component tests, ESLint, Prettier, vue-tsc and Vitest. See [apps/frontend/README.md](apps/frontend/README.md) for commands and production API routing.
  Authentication is at `/login`: the reference-based login/sign-up screen, an SDK-backed Supabase skeleton in `src/services/auth.ts`, integration tests, and the reference photo in `src/assets/auth/`. See the frontend guide for credentials and remaining integration work.
- `apps/backend/`: the server, API and business logic (TypeScript, Node.js, Express). See [apps/backend/README.md](apps/backend/README.md) for how to run it.

### Makefile

Shortcuts for the pnpm workspace. `install` and `format` run once at the root; the other targets run each app's own pnpm scripts. Run `make help` to list the targets: `install`, `dev`, `build`, `lint`, `typecheck`, `format`, `format-check`, `test`, `check` (everything CI should run) and `clean`. Add `APP=backend` to limit a target to one app. New folders in `apps/` are picked up automatically, and apps without a given script are skipped.

### Root config

Shared by every app, so a change is made in one place:

- `package.json` and `pnpm-workspace.yaml`: the pnpm workspace (one `pnpm install` and one `pnpm-lock.yaml` for all apps; `packageManager` pins the pnpm version) and root scripts that run in every workspace: `lint`, `typecheck`, `test`, `build`, `format`, `format:check`.
- `tsconfig.base.json`: the strict TypeScript flags; each app's `tsconfig.json` extends it.
- `.nvmrc`: the Node.js version, 24 LTS (run `nvm use`). `engines` in `package.json` requires the same version, and `.npmrc` sets `engine-strict=true` so `pnpm install` fails on an older Node.
- `.editorconfig`, `.prettierrc.json` and `.prettierignore`: the same formatting everywhere.

Per-app files stay in each app: `package.json`, `tsconfig.json`, ESLint config, `.env.example` and, for deployed apps, a `Dockerfile` (built from the repository root, see `.dockerignore`). Each app still has its own CI workflow and deploy.

### `docs/`

All project documentation. See [docs/README.md](docs/README.md) for an index that explains each folder and file.

- `docs/ADRs/`: Architecture Decision Records. The technical decisions the team makes, with their context and consequences.
- `docs/architecture/`: technical models of the system, such as the [database tables UML](docs/architecture/table_UML.md) and the [infrastructure](docs/architecture/infra.md).
- `docs/design/`: UI design (Figma link, screen snapshots and the color palette).
- `docs/specs/`: feature specs, the technical design of a feature written before it is built (for example [book clubs](docs/specs/book-clubs.md)).
- `docs/OOP_documents/`: deliverables for the OOP classes (domain model, component diagrams, event storming, coupling analysis, patterns used, refactored code), organized by iteration (`iteration_0` to `iteration_4`).
- `docs/product/`: documents about the business rules and design of the product, such as the [requirements](docs/product/requirements.md) and the [feature scope](docs/product/features_priority.md) (what is Core, Extra or Optional, and the sprint plan).
- `docs/sprints/`: deliverables for the Software Engineering Lab classes (vision, MVP, vertical prototype, claims, release notes), organized by iteration (`iteration_0` to `iteration_4`). Each iteration can also have a `log.md`: a running record of what the team did and decided (see [iteration 0](docs/sprints/iteration_0/log.md)).

### `infra/`

Infrastructure and deployment configuration.

### `scripts/`

Helper scripts for development and automation.

### `.github/`

GitHub configuration: the pull request template, the issue templates (`ISSUE_TEMPLATE/`: feature, bug, refactor and tests) and the CI workflows (`workflows/`). Work is tracked on the org GitHub Project board (columns: To do, Doing, In review, QA, Done).

#### Continuous integration

Workflows live in `.github/workflows/` and are named `<app>-ci.yml` for checks and `<app>-cd-<env>.yml` for deploys (`release.yml` tags the versions), so each app's CI stays separate. A change to one app does not run the other app's checks:

- `backend-ci.yml`: runs on every pull request to `main` when `apps/backend/`, the shared root config or the workflow itself changes. It installs with the locked dependencies, then runs lint, format check, typecheck, tests (against a Postgres service) and build.
- `frontend-ci.yml`: the same steps for `apps/frontend/`: lint, format check, typecheck, component/router tests and build.
- `commitlint.yml`: runs on every pull request to `main` and fails when a commit (merge commits aside) does not follow Conventional Commits: `<type>(<scope>)!: <description>` with type `build`, `chore`, `ci`, `db`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style` or `test`. Check locally with `scripts/check-commits.sh origin/main..HEAD`. Fix a bad message with `git commit --amend` or `git rebase -i` and force-push.

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
- **Release** (`release.yml`): runs when a prod CD succeeds and, once every prod CD of that commit has succeeded, creates the version tag `vX.Y.Z` and a GitHub Release of the same name with generated notes, made by [semantic-release](https://semantic-release.gitbook.io/) from the commits since the last tag (config in the `release` key of the root `package.json`). `feat` bumps minor, `fix`/`perf`/`revert` bump patch, a breaking change (`type!:` or `BREAKING CHANGE:`) bumps major. A merge with only `docs`, `chore`, `ci`, `style`, `test`, `build` or `refactor` commits makes no release, and a failed deploy is never tagged. Versions started from a hand-made `v0.1.0` (semantic-release would otherwise start at `v1.0.0`).

Setup (repo admin): secrets `RENDER_API_KEY` and `PROD_DATABASE_URL`, variables `RENDER_BACKEND_PROD_SERVICE_ID` and `RENDER_FRONTEND_PROD_SERVICE_ID`, and Auto-Deploy turned off on both prod services.

To try the image locally: `docker build -f apps/backend/Dockerfile -t bookmarked-backend .` then `docker run -p 3000:3000 bookmarked-backend`.

A pull request must be green before review. Run `make check` locally to run the same checks before pushing.

### `.agents/` and `AGENTS.md`

Configuration and instructions for AI coding agents working on this repository.

- `.claude/skills/oop-ddd-review/SKILL.md`: reviews `apps/backend` for raw OOP, DDD and design-pattern usage (no ORM-driven design, rich domain model, value objects, aggregates, layering) and recommends which OOP/DDD/GoF pattern to add or substitute.

## Getting started

### Prerequisites

Install these once per machine:

| Tool | Why | How |
|---|---|---|
| Git | Clone the repository | Usually already installed |
| [nvm](https://github.com/nvm-sh/nvm#installing-and-updating) | Installs the Node.js version in [`.nvmrc`](.nvmrc) (Node 24 LTS) | See the link |
| make | Runs the [`Makefile`](Makefile) shortcuts (optional) | macOS: `xcode-select --install`. Linux: usually installed. Windows: use WSL, or skip `make` and use the pnpm commands |

You do not need to install pnpm yourself: Corepack ships with Node 24 and provides the pnpm version pinned in `package.json`.

### Setup

```bash
git clone git@github.com:MESW-LES-2627/les-project-group-6.git
cd les-project-group-6

nvm install                # installs and switches to Node 24 from .nvmrc
nvm alias default 24       # optional: use Node 24 in every new terminal
corepack enable            # makes the pinned pnpm available

cp apps/backend/.env.example apps/backend/.env   # optional, the defaults work
```

Then install the dependencies for every app:

| With make | With pnpm |
|---|---|
| `make install` | `pnpm install --frozen-lockfile` |

`pnpm install` fails with `ERR_PNPM_UNSUPPORTED_ENGINE` if your terminal is not on Node 24. Run `nvm use` and try again.

### Run

| Task | With make | With pnpm |
|---|---|---|
| Start the backend in watch mode (restarts on save) | `make dev` | `pnpm dev:backend` |
| Start the frontend | `make dev APP=frontend` | `pnpm --filter @bookmarked/frontend dev` |
| Build | `make build` | `pnpm build` |
| Run the compiled build | `make start` | `pnpm --filter @bookmarked/backend start` |

The backend listens on <http://localhost:3000>. Check it with:

```bash
curl -i localhost:3000/health   # HTTP/1.1 200 OK  {"status":"ok"}
```

To use another port, set `PORT` (for example `PORT=3977 make dev`) or change it in `apps/backend/.env`.

### Check the code

| Task | With make | With pnpm |
|---|---|---|
| Everything CI should run | `make check` | `pnpm lint && pnpm typecheck && pnpm format:check && pnpm test && pnpm build` |
| Lint | `make lint` | `pnpm lint` |
| Type-check | `make typecheck` | `pnpm typecheck` |
| Check formatting | `make format-check` | `pnpm format:check` |
| Fix formatting | `make format` | `pnpm format` |
| Tests (passes while there are no test files) | `make test` | `pnpm test` |
| Remove build output and dependencies | `make clean` | `rm -rf node_modules apps/*/node_modules apps/*/dist` |

Run `make help` to list every target. Add `APP=<name>` to limit a target to one app, for example `make build APP=backend`. The pnpm equivalent is `pnpm --filter @bookmarked/backend <script>`, or `pnpm <script>` from inside `apps/backend`.

### Troubleshooting

- **`bad option: --env-file-if-exists`** or **`ERR_PNPM_UNSUPPORTED_ENGINE`**: the terminal is on an older Node. Run `nvm use` (or `nvm alias default 24` and open a new terminal), then check `node --version`.
- **`pnpm: command not found`**: run `corepack enable`.
- **Port 3000 already in use**: start with another port, for example `PORT=3977 make dev`.

## Status

Early stage: the repository is set up, the product is being defined (iteration 0) and the backend skeleton runs.
