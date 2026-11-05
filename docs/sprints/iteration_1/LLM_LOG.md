# LLM Usage Log - Iteration 1

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

### 2026-11-05: Finalize reading status implementation and endpoints for Issue #28

- **Date:** 2026-11-05
- **Author:** Vasco
- **Model:** Gemini 2.5 Pro
- **Tool:** Antigravity
- **Domain:** database, backend, testing, docs

#### Prompt
```text
finalize the reading status implementation from iteration 0 by adding started_on and finished_on to the schema and adapting all files, implementing status changes and ensureInProgress with the new date attributes, and creating the API routes from issue 28 for manipulating and deleting reading statuses and library books
```

#### Explanation of Changes
Implemented the full backend lifecycle and endpoints for Issue #28 (F-LIB-01):
1. **Database:** Added `started_on` and `finished_on` date columns to `reading_status` schema, generated migration `0004_tidy_scorpion.sql`, and updated seed data.
2. **Domain:** Updated `ReadingStatus` entity to handle `startedOn` / `finishedOn`, automatically populate dates on status transitions (`in-progress` and `finished`), and validate that `finishedOn` cannot be before `startedOn`.
3. **Repository & Query:** Added mapper handling for dates in `DrizzleReadingStatusRepository` and `DrizzleLibraryQuery`, and added `delete` and `deleteById` methods.
4. **Service:** Updated `ReadingStatusService` to handle dates in `set` and `update`, added `remove` and `removeById`, and added `ensureInProgress` to auto-advance books to `in-progress` on reading timer starts.
5. **Endpoints & DTO:** Added `startedOn` / `finishedOn` to `ReadingStatusDto`, updated `PUT /reading-status` and `PATCH /reading-status/:id`, and added `DELETE /reading-status/:id`, `DELETE /reading-status`, `DELETE /user/:userId/library/:bookId`, as well as `PUT /library/:bookId`, `DELETE /library/:bookId`, and `GET /library?userId=`.
6. **Tests & Docs:** Added unit tests in `reading-status.test.ts`, `reading-status-service.test.ts`, and `reading-session-service.test.ts`, and integration tests in `reading-status-repository.test.ts` and `reading-status-api.test.ts`. Documented endpoints in `apps/backend/README.md`.

