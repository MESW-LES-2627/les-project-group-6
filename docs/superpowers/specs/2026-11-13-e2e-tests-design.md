# E2E tests for every frontend page (#127) — design

**Status:** approved in brainstorming, revised after review, 2026-11-13.
**Issue:** [#127](https://github.com/MESW-LES-2627/les-project-group-6/issues/127) (tech debt, user story).

## Goal

One end-to-end test of the main path of every frontend route, run against the built frontend, the real backend and the real database. Tests sign in once and share that session. A GitHub Actions workflow builds and starts the stack and runs the suite on pushes to `main` and on demand.

## Deviations from the acceptance criteria

The issue's "Runs in CI" scenario asks for a seeded test database and for pull requests to be blocked on failure. This design deliberately does neither:

- **Shared production database instead of a seeded test database.** The project is academic, not a live product, and a separate Supabase project and database were not wanted.
- **Not a pull request check.** Running on every PR would write test rows to the shared database each time. The suite runs on pushes to `main` and on manual dispatch.

#127 is done when the other two scenarios pass and the team accepts these two deviations.

## Decisions

- **Tool: Playwright.** Headless in CI, a `setup` project shares the login between tests.
- **Sign-in: a real Supabase test user.** The login form is exercised once in the `setup` project. The backend verifies the same tokens, so no test-only auth code ships in the app. *Rejected:* a test auth bypass behind an env flag (test code in the app, login not exercised); mocking Supabase in the browser (the backend still rejects the fake token).
- **Data: fixed test entities, reversible actions.** The backend has no delete route for groups, books or profiles, so tests cannot remove those once created. The test user owns permanent fixtures instead (see *Test data*), and tests only perform actions the API can undo: shelf entries (`DELETE /library/:bookId`), reading sessions (`DELETE /reading-sessions/:id`), reading status. *Rejected:* creating new groups and books in each test (they pile up in the production database); adding delete routes only for tests (scope creep); cleaning everything up with direct SQL (bypasses the domain; kept only for the complete-profile reset).
- **Stack: production build.** The frontend is served with `vite preview` (the built app, with the `/api` proxy) and the backend with its `start` script. *Rejected:* `vite dev` (dev-only behaviour); a deployed URL (no staging environment; tests would depend on deploys).
- **CI: `e2e.yml` GitHub Actions workflow, on pushes to `main` and on manual dispatch.**

## Test data

Created once by hand in the production database and Supabase, documented in `apps/frontend/e2e/README.md`:

| Fixture | Used by |
| --- | --- |
| Test user (Supabase account + `users` row with `id` = Supabase user id) | every authenticated test |
| A permanent group owned by the test user | groups, group detail |
| A seeded book (e.g. "Emma", from `seed.ts`) | explore, book detail, library, active session |
| A second Supabase account with **no** `users` row | complete-profile |

Rules for tests:

- A test that adds something reversible removes it in teardown, even when it fails.
- The group-create test fills in the form and checks validation and the review step, but does **not** submit, so no group is created.
- Explore searches for a seeded title and asserts only that the seeded book appears. A search with fewer than 5 local matches also calls Open Library and may import its books; that is accepted, and the test never depends on Open Library's results.
- No `TRUNCATE`, `DROP`, reseeding, or writes to other users' rows.

## Layout

| Path | Purpose |
| --- | --- |
| `apps/frontend/playwright.config.ts` | Projects (`setup`, `chromium`), base URL, traces and screenshots on failure. `webServer` starts the stack for local runs; in CI it reuses the servers the workflow started (`reuseExistingServer`). |
| `apps/frontend/e2e/auth.setup.ts` | Logs in through the real login form with **"Keep me signed in" ticked**, then saves the browser state to `e2e/.auth/user.json` (git-ignored). Without the tick the session lives in `sessionStorage`, which Playwright does not save. |
| `apps/frontend/e2e/fixtures.ts` | Fixtures: the IDs of the permanent group and book (from env), and helpers that undo shelf and session changes in teardown. |
| `apps/frontend/e2e/*.spec.ts` | One spec per area: `login`, `complete-profile`, `home`, `library`, `book`, `session`, `groups`, `group-create`, `group-detail`, `profile`, `explore`, `not-found`. |
| `apps/frontend/e2e/README.md` | How to create the fixtures and run the suite locally. |
| `apps/frontend/.env.e2e` | Local credentials and fixture IDs (git-ignored). `.env.e2e.example` is committed. |
| `apps/frontend/package.json` | Script `test:e2e` (`playwright test`). Adds `@playwright/test` as a dev dependency. |
| `.github/workflows/e2e.yml` | The CI workflow (see below). |

Vitest already excludes `e2e/**`, so unit tests are unaffected.

## Coverage

Each route in `apps/frontend/src/router/index.ts` has at least one spec for its main path:

- **login:** a signed-out visit to a protected page redirects here; the form signs in.
- **complete-profile:** the profile-less account is sent here and finishes it. Teardown deletes the created `users` row with one direct SQL delete (there is no API route), so the account is profile-less for the next run.
- **home, library, profile, explore, groups:** the main content of each page loads and its main action works.
- **group-create:** the form validates and reaches its last step, without submitting.
- **book detail, active session, group detail:** opened with the IDs of the permanent fixtures. The session test removes the reading session it starts.
- **not-found:** an unknown path shows the 404 view.

Exact steps are decided per spec during implementation.

## CI workflow (`e2e.yml`)

Triggers: `push` to `main`, `workflow_dispatch`. Steps:

1. Checkout, set up pnpm and Node (`.nvmrc`), `pnpm install --frozen-lockfile`.
2. Install Playwright's Chromium (`pnpm --filter @bookmarked/frontend exec playwright install --with-deps chromium`).
3. Build the backend (`pnpm --filter @bookmarked/backend build`).
4. Build the frontend with the `VITE_*` secrets set as env, since Vite inlines them at build time.
5. Start the backend in the background (`start`, with `DATABASE_URL` and `SUPABASE_URL`) and wait for `GET /health` to return `ok`.
6. Start `vite preview` in the background and wait for it to answer.
7. Run `pnpm --filter @bookmarked/frontend test:e2e`.
8. Upload the Playwright report, traces and screenshots as an artifact, always.

No migrations or seeding run in CI.

Secrets:

- `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`: the test user.
- `E2E_PROFILELESS_EMAIL`, `E2E_PROFILELESS_PASSWORD`: the account with no profile.
- `E2E_GROUP_ID`, `E2E_BOOK_ID`: the permanent fixtures.
- `DATABASE_URL`: the shared database (backend, and the complete-profile reset).
- `SUPABASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`: Supabase settings for the backend and the frontend build.

## Error handling

- Teardown runs even when a test fails, so reversible changes are always undone.
- A failed test keeps its trace and screenshot; CI uploads them.
- If the login in `setup` fails, every test fails together, with a message naming the failed step.
- If the backend health check does not pass within a timeout, the workflow fails before running tests.

## To confirm on the first run

- `vite preview` uses `server.proxy` for `/api` (Vite's `preview.proxy` defaults to it). If not, set `preview.proxy`.
- The group page's chat socket connects through the proxy (`ws: true`).

## Out of scope

- Other browsers and mobile viewports.
- Visual regression screenshots.
- Realtime chat beyond opening the group page.
- Delete routes for groups, books and profiles.
