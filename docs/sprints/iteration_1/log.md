# Iteration 1 log

A running record of what the team did and decided in iteration 1. The [release notes](release_notes.md) are the summary written at the end; this file is the day-to-day history. Newest entries go at the bottom.

**Traceability chain:** requirement ID (`F-XXX-NN`) → GitHub issue (milestone `Iteration 1`) → PR → release notes.

## Status

| Area | State |
|---|---|
| Library & reading status (#28, F-LIB-01) | Done: `started_on` and `finished_on` dates in DB, domain validation, service transitions, `ensureInProgress`, library & reading status endpoints and integration tests |

## Log

### 2026-11-05: Library reading status dates and endpoints (Issue #28, F-LIB-01)

- **Database migration and seed (`59db677`):** added nullable `started_on` and `finished_on` date columns to `reading_status` in [`apps/backend/src/database/schema.ts`](../../../apps/backend/src/database/schema.ts) and generated migration [`0004_tidy_scorpion.sql`](../../../apps/backend/src/database/migrations/0004_tidy_scorpion.sql). Updated seed data in [`seed.ts`](../../../apps/backend/src/database/seed.ts) to populate dates on demo finished and in-progress reading statuses.
- **Domain entity (`5ca4716`):** updated [`ReadingStatus`](../../../apps/backend/src/features/reading-status/reading-status.ts) to track `startedOn` and `finishedOn`, automatically setting `startedOn` on moving to `in-progress` and `finishedOn` on moving to `finished`. Added validation ensuring `finishedOn` is on or after `startedOn`. Added unit tests covering all transition and date constraints in [`reading-status.test.ts`](../../../apps/backend/tests/unit/reading-status.test.ts).
- **Repository and data mapper (`7988cbe`):** mapped dates in [`DrizzleReadingStatusRepository`](../../../apps/backend/src/features/reading-status/reading-status-repository.ts) and query [`DrizzleLibraryQuery`](../../../apps/backend/src/features/library/library-query.ts). Added `delete(userId, bookId)` and `deleteById(id)` to `IReadingStatusRepository`, with integration tests in [`reading-status-repository.test.ts`](../../../apps/backend/tests/integration/reading-status-repository.test.ts).
- **Service layer (`262848d`):** updated [`ReadingStatusService`](../../../apps/backend/src/features/reading-status/reading-status-service.ts) to support dates in `set` and `update`, and added `remove(userId, bookId)`, `removeById(id)`, and `ensureInProgress(userId, bookId)`. Injected `ReadingStatusService` into [`ReadingSessionService`](../../../apps/backend/src/features/reading-session/reading-session-service.ts) so starting a session automatically marks the book as `in-progress`. Added unit tests in [`reading-status-service.test.ts`](../../../apps/backend/tests/unit/reading-status-service.test.ts) and [`reading-session-service.test.ts`](../../../apps/backend/tests/unit/reading-session-service.test.ts).
- **API endpoints and routes (`b0d2250`):**
  - Updated [`ReadingStatusDto`](../../../apps/backend/src/features/reading-status/reading-status-dto.ts) with `startedOn` and `finishedOn`.
  - Added support for start and finish dates in `PUT /reading-status` and `PATCH /reading-status/:id`.
  - Added `DELETE /reading-status/:id`, `DELETE /reading-status`, and `DELETE /user/:userId/library/:bookId` (204 No Content / 404 Not Found).
  - Added route aliases `PUT /library/:bookId`, `DELETE /library/:bookId`, and `GET /library?userId=` in [`library-routes.ts`](../../../apps/backend/src/features/library/library-routes.ts) and [`reading-status-routes.ts`](../../../apps/backend/src/features/reading-status/reading-status-routes.ts).
  - Updated [`apps/backend/README.md`](../../../apps/backend/README.md) with all new routes.
  - Added comprehensive integration tests in [`apps/backend/tests/integration/reading-status-api.test.ts`](../../../apps/backend/tests/integration/reading-status-api.test.ts).

## Next steps

- Open PR for `feat/reading-status-endpoints` to close #28.
