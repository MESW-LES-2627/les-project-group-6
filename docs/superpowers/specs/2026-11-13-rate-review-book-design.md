# Rate and review a book: design

- **Story:** [#122](https://github.com/MESW-LES-2627/les-project-group-6/issues/122) "Rate and review a book I read" (supersedes #16)
- **Requirement:** F-LIB-02 ([requirements](../../requirements/requirements.md), [priorities](../../requirements/features_priority.md))
- **Date:** 2026-11-13

## Goal

A reader rates a book from 1 to 5 and writes an optional comment. They can edit or delete the review. The book page shows their review, their friends' reviews and the public reviews, and their profile lists the books they rated.

## Scope

In scope:

- Create, edit and delete my own review (one per book).
- Reviews only for books that are In progress, Finished or Did not finish.
- The book page shows my review, the friend reviews, the public reviews and the public average, all from real data.
- My profile lists the books I reviewed, with the rating.

Out of scope (later stories):

- Sorting the public reviews and loading more than the first page.
- "Found helpful" votes.
- One review per read-through (F-LIB-05 re-reads).
- A per-review audience setting.

## Decisions

| Decision | Choice | Rejected |
|---|---|---|
| Storage | The existing `reviews` table, in a new `features/review/` module | Rating and comment columns on `reading_status`: deleting a library entry would delete the review, and the review would be tied to status changes |
| Reviews per book | One per reader per book. Saving again replaces the rating and comment | One per read-through: needs a link to each finished read, which does not exist yet |
| Who sees a review | Follows the author's profile. Public profile: everyone. Private profile: the author and accepted friends | Friends only; author only |
| Audience selector in the mock | Removed. Visibility comes only from the profile | Per-review override: an extra column and a rule not in the story |
| Public average | Counts only reviews whose author has a public profile (F-LIB-02 rule 5, Q4) | Counting every review |
| Public list | Newest first, the first 10 reviews, no sort control, no "Read more" button | Full sorting and pagination: "most helpful" needs helpful votes |
| Comment | Optional, trimmed, empty becomes `null`, at most 2,000 characters | No limit |

## Backend

### Migration `0010_review_per_book.sql`

```sql
ALTER TABLE reviews ADD COLUMN updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE reviews ADD CONSTRAINT reviews_user_id_book_id_key UNIQUE (user_id, book_id);
CREATE INDEX reviews_book_id_created_at_idx ON reviews (book_id, created_at DESC);
```

The table has no rows in production, so the unique constraint needs no cleanup. If it does have rows, the migration first keeps only the newest review per `(user_id, book_id)`. `schema.ts` gets the same column, constraint and index.

### Domain (`features/review/review.ts`)

- `Rating`: a value object. `Rating.of(raw)` accepts an integer from 1 to 5. Anything else throws `InvalidRatingError extends InvalidValueError` with the message `Rating must be between 1 and 5`.
- `ReviewComment`: a value object. Trims the text, maps empty to `null`, and throws `InvalidValueError` (`Comment must be at most 2000 characters`) when it is too long.
- `Review`: an entity with `id`, `userId`, `bookId`, `rating`, `comment`, `createdAt`, `updatedAt`. `Review.write(...)` creates one and `review.revise(rating, comment)` edits it.
- `ReadingState` gets an abstract `allowsReview: boolean`. It is `false` for Not started and `true` for In progress, Finished and Did not finish. This follows the existing State pattern: each state class answers the rule.
- `ReviewNotAllowedError extends BusinessRuleViolationError`: `Start reading this book before reviewing it`.

### Repository (`review-repository.ts`)

- `findByUserAndBook(userId, bookId): Review | null`
- `save(review)`: an upsert on `(user_id, book_id)`. On conflict it updates `rating`, `comment` and `updated_at`.
- `delete(userId, bookId): boolean`
- The read queries live in `review-query.ts`, as `library-query.ts` and `standings-query.ts` do:
  - `forBook(bookId, viewerId)` returns `{ mine, friends, publicReviews, publicAverage, publicCount }`.
    - `mine`: the viewer's review or `null`.
    - `friends`: reviews by the viewer's accepted friends, newest first. A friend's review is listed here whatever their profile visibility.
    - `publicReviews`: the first 10 reviews by authors with a `public` profile, newest first, without the viewer's own review and without the friends already listed.
    - `publicAverage` (rounded to one decimal, or `null`) and `publicCount`: over every review by a public-profile author, the viewer's own included.
  - `forUser(profileUserId)` returns the reviews on a profile, newest first, with the book's title and cover. The service checks access first (see below).

### Service (`review-service.ts`)

- `write({ userId, bookId, rating, comment })`: loads the reader's `reading_status` for the book. If there is none (not in the library), or its state does not allow reviews, it throws `ReviewNotAllowedError`. Otherwise it validates `Rating` and `ReviewComment` and saves. An unknown book gives `NotFoundError`.
- `remove(userId, bookId)`: deletes the review. Deleting a review that does not exist is not an error (idempotent `204`).
- `forProfile(profileUserId, viewerId)`: returns the profile's reviews only when the viewer is the owner, the profile is public, or the viewer is an accepted friend. Otherwise it throws `ForbiddenError`; an unknown user gives `NotFoundError`.
- Changing a book's status back to Not started keeps the review. The story only gates writing.

### Routes (`review-routes.ts`)

These are mounted behind `authenticate` and `requireUser`. The reader always comes from the token.

| Method and path | Body | Response |
|---|---|---|
| `PUT /book/:bookId/review` | `{ rating, comment? }` | `200` with the review DTO |
| `DELETE /book/:bookId/review` | none | `204` |
| `GET /book/:bookId/reviews` | none | `200` with `{ mine, friends, publicReviews, publicAverage, publicCount }` |
| `GET /users/:userId/reviews` | none | `200` with a list of `{ book, rating, comment, updatedAt }` |

`PUT` returns `{ id, bookId, rating, comment, createdAt, updatedAt }`. The reviews in `GET /book/:bookId/reviews` also carry `author: { id, username, displayName, photoUrl }`. The book page does not need the reading status from this API: it already loads it.

## Frontend

### API (`services/api.ts`)

Four functions: `saveReview(bookId, { rating, comment })`, `deleteReview(bookId)`, `getBookReviews(bookId)` and `getUserReviews(userId)`. Components use the `Api*` response types directly.

### `BookThoughtsPanel.vue`

- It takes `status` and `review` (mine, or `null`) as props, and emits `saved` and `deleted`.
- When the status is Not started, the stars, the comment box and Save are disabled, and the panel shows the hint "Start reading this book to rate and review it."
- Save is disabled until a rating is picked. It sends `PUT`, shows a saving state, and shows the server's error message under the form when the call fails.
- When a review exists, a "Delete review" button asks for confirmation and then sends `DELETE`. The form goes back to empty.
- The "Review audience" selector and its copy are removed.

### `BookDetailView.vue`

- It loads `getBookReviews` with the book and fills the panel, the friend list and the public list from it. The mock `detail.friends`, `detail.publicReviews` and the public rating numbers are no longer used.
- After save or delete, it reloads the reviews so the average and lists stay current.
- The public average shows `—` and "No public ratings yet" when `publicAverage` is `null`.
- The sort control and the "Read more public reviews" button are removed.
- `ReviewItem` loses the "found helpful" meta. The meta shows the date of the last edit instead.

### `ProfileView.vue`

It adds a "Reviews" section listing the reviewed books (cover, title, stars, comment) from `getUserReviews`. When the API answers `403`, the section is hidden.

Mock data that only these screens used is deleted from `mocks/library.ts`.

## Error handling

| Case | Status | Message |
|---|---|---|
| Rating missing, not an integer, 0 or 6 | `400` | `Rating must be between 1 and 5` |
| Comment over 2,000 characters | `400` | `Comment must be at most 2000 characters` |
| Book not in the library, or Not started | `409` (the existing mapping of `BusinessRuleViolationError`) | `Start reading this book before reviewing it` |
| Unknown book | `404` | from `NotFoundError` |
| Private profile, viewer not a friend | `403` | from `ForbiddenError` |

The error handler already maps these domain errors, so no new mapping is needed.

## Testing

Backend (`node:test` via `tsx`, in `apps/backend/tests/`):

- `Rating` and `ReviewComment` unit tests: 1 and 5 pass; 0, 6, 2.5, `"4"` and `null` fail with the message; trimming, empty to `null`, and the length limit.
- `ReadingState.allowsReview` for each of the four states.
- Service tests with in-memory fakes: write for In progress, Finished and DNF; refuse for Not started and for a book not in the library; edit replaces; delete, and delete twice.
- Route tests for each acceptance scenario, including `PUT` with rating 0 and 6.
- Query tests: a private-profile review is visible to a friend but not to a stranger and does not count in the average; a public one counts; my own review is not repeated in the public list.

Frontend (Vitest and Vue Test Utils):

- `BookThoughtsPanel`: disabled with the hint for Not started; save sends the rating and comment; edit shows the new values; delete clears the form; the server error is shown.
- `BookDetailView`: renders the lists and average from a mocked `getBookReviews`, and the empty states.
- `ProfileView`: lists reviewed books, and hides the section on `403`.

## Acceptance criteria mapping

| Scenario | Covered by |
|---|---|
| Rate and review a finished book | `PUT` with `Finished` status; the panel shows my review; the profile "Reviews" section |
| Review while reading or after DNF | `ReadingState.allowsReview` is `true` for In progress and DNF |
| Cannot review a book not started | The panel is disabled with the hint; the server returns `409` |
| Edit my review | The upsert on `(user_id, book_id)`; the panel shows only the new values |
| Rating out of range | `Rating.of` returns `400` with `Rating must be between 1 and 5` |
| Delete my review | `DELETE /book/:bookId/review`; the panel empties |

## Docs to update with the implementation

- `apps/backend/README.md`: the new routes.
- `README.md`: the `apps/` description, if the frontend description changes.
- `docs/iterations/2/log.md` and `docs/iterations/2/LLM_LOG.md`: entries for the spec and for the implementation.
