# E2E tests

Playwright tests of the main path of every route (#127, [spec](../../../docs/superpowers/specs/2026-11-13-e2e-tests-design.md)). They run against the built frontend, the backend and the **shared database**, as a dedicated test user.

## Fixtures (once, by hand)

1. A Supabase test user with a finished profile.
2. The seeded book "Emma" on the test user's shelf with status **in progress** (`in-progress` in the database; starting a session would otherwise change it); its id is `E2E_BOOK_ID`.
3. A group named `E2E fixture group` owned by the test user; its id is `E2E_GROUP_ID`.
4. A second Supabase user that has **not** finished its profile.

## Run locally

    cp .env.e2e.example .env.e2e   # fill in the values
    pnpm test:e2e                  # starts the backend and the preview if they are not running
    pnpm exec playwright show-report

## Rules

- Tests only change what they can undo (reading sessions, shelf entries). Teardown runs even when a test fails.
- One exception: `streak.spec.ts` logs pages on the fixture book, which counts today for the test user's streak (F-READ-04). The page is restored; the counted day stays, which is harmless because a day only counts once.
- The new-group test never submits. Do not add tests that create groups or books: there is no delete route.
- Never write to other users' rows, truncate or reseed.

## CI

`.github/workflows/e2e.yml` runs on pushes to `main` and on manual dispatch. It is not a pull request check.
