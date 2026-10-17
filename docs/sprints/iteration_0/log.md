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
| Product issues created from the requirements | Not started |
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

## Next steps

- Create the `Iteration 0` milestone and the product issues from the requirements, each one referencing its requirement ID.
- Resolve the open questions in the requirements.
- Write the MVP definition, the vertical prototype plan and the CLAIM.
- Decide whether Supabase also serves as the database (new ADR).
- Write the release notes at the end of the iteration.
