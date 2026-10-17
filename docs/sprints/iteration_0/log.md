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

## Next steps

- Review the feature scope with the team, then update the MoSCoW tags in the requirements to match.
- Review the Core issues (#6 to #69) and answer their open questions, then add them to the Project board.
- Create the issues for Extras once Core is under way.
- Resolve the open questions in the requirements.
- Write the MVP definition, the vertical prototype plan and the CLAIM.
- Decide whether Supabase also serves as the database (new ADR), and close the other open decisions in [`infra.md`](../../architecture/infra.md).
- Update `table_UML.md` for Supabase Auth: remove `USER.password_hash` and `PASSWORD_RESET_TOKEN`, add `USER.timezone`.
- Write the release notes at the end of the iteration.
