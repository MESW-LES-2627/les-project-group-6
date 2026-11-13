# Backend

The Bookmarked API: TypeScript on Node.js with [Express](https://expressjs.com) and PostgreSQL with [Drizzle ORM](https://orm.drizzle.team) (see [ADR-0001](../../docs/ADRs/0001-choose-tech-stack.md), [ADR-0003](../../docs/ADRs/0003-backend-http-framework.md) and [ADR-0004](../../docs/ADRs/0004-database-access-and-migrations.md)).

## Requirements

- Node.js (version in the root [`.nvmrc`](../../.nvmrc); run `nvm use` at the repository root)
- pnpm (run `corepack enable` once; the version is pinned in the root `package.json`)
- Docker (for local PostgreSQL 17 database)

## Getting started

From the **repository root**:

```bash
pnpm install
docker compose up -d db                           # starts local PostgreSQL 17 on port 5432
cp apps/backend/.env.example apps/backend/.env   # then set SUPABASE_URL
pnpm --filter @bookmarked/backend db:migrate      # includes 0004 (case-insensitive usernames)
pnpm dev:backend
```

`SUPABASE_URL` is required: the server will not start without it, because it could not verify sessions.

`make install` and `make dev` do the same (see the root README).

Then open <http://localhost:3000/health>, which returns `{ "status": "ok", "db": "ok" }`.

## API Endpoints

**Authentication (F-AUTH-01, [issue #7](https://github.com/MESW-LES-2627/les-project-group-6/issues/7)).** The frontend signs in with Supabase Auth and sends the access token as `Authorization: Bearer <jwt>`. [`SupabaseAuthProvider`](src/features/auth/supabase-auth-provider.ts) verifies it against the project's JWKS (`SUPABASE_URL`) and maps it to our own `AuthIdentity`; no Supabase type leaves that adapter (ADR-0002). [`src/middleware/auth.ts`](src/middleware/auth.ts) has `authenticate` (token only) and `requireUser` (loads our `User`). Only `GET /health` and `GET /usernames/:username/availability` are public; `POST /me` needs a token, and **every other route** needs a token and a `users` row. The acting reader always comes from the token, never from a `userId` in the body, query or path, so readers cannot act as each other.

| Status | Body                                                                      | When                                                                                |
| ------ | ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `401`  | `{ "error": "...", "code": "UNAUTHENTICATED" }`                           | No `Authorization` header, or the token is invalid, expired or from another project |
| `403`  | `{ "error": "...", "code": "PROFILE_REQUIRED" }`                          | Valid token, but no `users` row yet (interrupted sign-up): call `POST /me`          |
| `409`  | `{ "error": "This username is already taken", "code": "USERNAME_TAKEN" }` | `POST /me` with a username already used, ignoring case                              |

| Method   | Path                                              | Description                                                                                                                                                                                               |
| -------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`    | `/health`                                         | Health check returning `{ "status": "ok", "db": "ok" }` (public)                                                                                                                                          |
| `GET`    | `/usernames/:username/availability`               | `{ "available": boolean }`, ignoring case; used by the sign-up form before the account is created (public, 20 checks a minute per IP, then `429`)                                                                                                |
| `POST`   | `/me`                                             | Creates the reader's `users` row from the token's id and email and `{ username, displayName, timezone }` (`201`; `409` if it exists or the username is taken)                                             |
| `GET`    | `/me`                                             | The reader's profile (`200`; `403 PROFILE_REQUIRED` before `POST /me`)                                                                                                                                    |
| `PATCH`  | `/me`                                             | Updates `displayName` and/or `timezone` (`200`)                                                                                                                                                           |
| `POST`   | `/book`                                           | Adds a reader's book (`201 Created`, requires `title`); the server marks it `isCommunityAdded`. There is no `DELETE`: other readers' data cascades from a book                                                                                                                                                      |
| `GET`    | `/book?q=...`                                     | Searches by title, author or ISBN, tolerating small typos; best match first, at most 20 (`200 OK`)                                                                                                        |
| `GET`    | `/book/:id`                                       | Returns a single book by UUID (`200 OK` or `404 Not Found`)                                                                                                                                               |
| `PUT`    | `/reading-status`                                 | Sets reading status, page progress and dates (`startedOn`, `finishedOn`) for a book (`200 OK`; `400` if `finishedOn` is before `startedOn`) |
| `PATCH`  | `/reading-status/:id`                             | Edits the reader's reading status, progress or dates by ID (`200 OK` or `404 Not Found`, also for another reader's entry) |
| `PATCH`  | `/reading-status`                                 | Edits status, progress or dates by `id` or `bookId` in the body (`200 OK` or `404 Not Found`) |
| `DELETE` | `/reading-status/:id`                             | Deletes one of the reader's entries by ID (`204`; `404` if missing or another reader's) |
| `DELETE` | `/reading-status?bookId=`                         | Deletes the reader's entry for that book (`204` or `404`) |
| `PUT`    | `/library/:bookId`                                | Adds or updates the book in the reader's library with status, page and dates (`200 OK`) |
| `DELETE` | `/library/:bookId`                                | Removes the book from the reader's library (`204` or `404`); `DELETE /me/library/:bookId` does the same |
| `GET`    | `/me/library`                                     | Returns the reader's library with progress and dates, supports `?status=` (`200 OK`) |
| `PUT`    | `/book/:bookId/review`                            | Creates or replaces the reader's review, `{ rating, comment? }` (1 to 5 stars, comment up to 2,000 characters) (`200`; `400` out of range; `409` unless the book is In progress, Finished or Did not finish) |
| `DELETE` | `/book/:bookId/review`                            | Deletes the reader's review (`204`, also when there was none) |
| `GET`    | `/book/:bookId/reviews`                           | `{ mine, friends, publicReviews, publicAverage, publicCount }`: friends' reviews whatever their profile setting, the 10 newest public-profile reviews, and the average over public profiles only (`200`; `404` unknown book) |
| `GET`    | `/users/:userId/reviews`                          | A profile's reviews with book title and cover, newest first (`200`; `403` for a private profile unless you are the owner or a friend) |
| `POST`   | `/reading-sessions`                               | Starts a timed session on a book, or resumes the one running on it (`201`; `409` if another book's session is running)                                                                                    |
| `PATCH`  | `/reading-sessions/:id/finish`                    | Finishes the session; duration and counted minutes come from the server clock (`200`; `409` if already finished)                                                                                          |
| `DELETE` | `/reading-sessions/:id`                           | Cancels a running session started by mistake; nothing is counted (`204`; `409` if already finished)                                                                                                       |
| `GET`    | `/me/reading-sessions/active`                     | Returns the running session with server-measured `elapsedSeconds` (`200` or `204`)                                                                                                                        |
| `POST`   | `/groups/challenges`                              | Creates a challenge group (`name`, `startDate`, `durationDays`, `winMetric`); the creator is admin and first member (`201`)                                                                               |
| `GET`    | `/groups/challenges/:id`                          | Returns the group, its challenge and `standings` (counted minutes of sessions finished in the period, split by book in `books`) (`200` or `404`)                                                          |
| `GET`    | `/me/groups`                                      | Lists the challenge groups the user belongs to (`200 OK`)                                                                                                                                                 |
| `POST`   | `/groups/book-clubs`                              | Creates a book club (`name`, `bookId`, `deadline`); the creator is admin, round 1 starts today and the book goes to their library (`201`)                                                                 |
| `GET`    | `/groups/book-clubs/:id`                          | Returns the club, its current `round` (outcome, finished/expected, days left), `standings` (minutes on the round book inside the round, page %, finished), `history` and the open `poll` (`200` or `404`) |
| `GET`    | `/me/book-clubs`                                  | Lists the book clubs the user belongs to (`200`)                                                                                                                                                          |
| `POST`   | `/groups/book-clubs/:id/rounds`                   | The admin starts the next round with a new book and deadline once the current one is over (`201`; `403` if not the admin, `409` while the round is active)                                                |
| `POST`   | `/groups/book-clubs/:id/poll`                     | The admin opens a vote on the next book (`closesAt`, `anonymous`) (`201`; `409` if one is open)                                                                                                           |
| `POST`   | `/groups/book-clubs/:id/poll/proposals`           | A member proposes a book, one per member (`201`)                                                                                                                                                          |
| `PUT`    | `/groups/book-clubs/:id/poll/vote`                | A member votes for a proposal; voting again moves the vote (`200`)                                                                                                                                        |
| `POST`   | `/groups/:id/invites`                             | The admin of any group invites a friend (`inviteeId`) (`201`; `403` if not the admin, `409` if not a friend, a member or already invited)                                                                 |
| `GET`    | `/me/group-invites`                               | Pending invites with group name, kind and inviter (`200`)                                                                                                                                                 |
| `POST`   | `/group-invites/:id/accept` · `/decline`          | The invitee answers; accepting adds them to the group (`200`)                                                                                                                                             |
| `GET`    | `/me/friends`                                     | Accepted friends (`200`)                                                                                                                                                                                  |
| `POST`   | `/friend-requests`                                | Sends a friend request from the signed-in reader to `targetUserId` (`201`; `200` if a request or friendship already exists; `400` for yourself or an unknown user) |
| `GET`    | `/me/friend-requests`                             | The reader's incoming pending friend requests (`200`) |
| `POST`   | `/friend-requests/:id/accept`                     | The addressee accepts a pending request (`200`; `404` if not found or not theirs, `409` if not pending) |
| `POST`   | `/friend-requests/:id/decline`                    | The addressee declines a pending request (`204`; `404` if not found or not theirs) |
| `DELETE` | `/friends/:userId`                                | Removes the friendship between the reader and that user (`204`; `404` if not friends) |
| `POST`   | `/groups/:groupId/messages`                       | Sends a chat message (`clientId` UUID, `body`); members only. A retry with the same `clientId` returns the stored message (`201` new, `200` retry, `403` not a member)                                    |
| `GET`    | `/groups/:groupId/messages?after=&before=&limit=` | Chat history in `seq` order: the latest page, newer than `after` (catch-up) or older than `before` (`200`, `403`)                                                                                         |
| `DELETE` | `/groups/:groupId/messages/:messageId`            | Soft-deletes a message; its author or the group admin (`204`, `403`, `404`)                                                                                                                               |
| `GET`    | `/me/reading-stats`                               | Returns `{ totalMinutes, sessionsCount }` over finished sessions (`200 OK`)                                                                                                                               |

**Group chat socket** (ADR-0006): Socket.IO on the same port, path `/socket.io`. Connect with `auth: { token }` (the Supabase access token; the user is its subject), emit `group:join` with a group id (ack `{ ok }`, members only), then receive `message:new` (a message as above) and `message:deleted` (`{ id, groupId, seq }`). Clients never write through the socket; on reconnect they call `GET …/messages?after=<last seq>`.

CORS middleware ([`src/middleware/cors.ts`](src/middleware/cors.ts)) answers only the origins in `CORS_ORIGINS` (the same list is used by Socket.IO), with preflight `OPTIONS` support. When `CORS_ORIGINS` is empty it allows any origin (`*`), for local development.

## Scripts

Run them inside `apps/backend`, or from the root with `pnpm --filter @bookmarked/backend <script>`.

| Script        | What it does                                                           |
| ------------- | ---------------------------------------------------------------------- |
| `dev`         | Starts the server with `tsx` in watch mode (restarts on save)          |
| `build`       | Compiles `src/` to JavaScript in `dist/` with `tsc`                    |
| `start`       | Runs the compiled server (`pnpm build` first)                          |
| `lint`        | Runs ESLint                                                            |
| `typecheck`   | Type-checks without emitting files                                     |
| `test`        | Runs `tests/**/*.test.ts` with the Node.js test runner (through `tsx`) |
| `db:generate` | Generates SQL migrations from schema using `drizzle-kit`               |
| `db:migrate`  | Applies pending migrations to the database                             |
| `db:seed`     | Populates database with demo user, books, and reading statuses         |
| `db:studio`   | Opens Drizzle Studio local database viewer                             |

CI runs lint, format check, typecheck, test and build on every pull request (see [`.github/workflows/backend-ci.yml`](../../.github/workflows/backend-ci.yml)).

## Environment variables

Read from `apps/backend/.env` when it exists. See [`.env.example`](.env.example).

| Variable              | Default                                                            | Description                                                                                                                                        |
| --------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PORT`                | `3000`                                                             | Port the HTTP server listens on                                                                                                                    |
| `DATABASE_URL`        | `postgresql://postgres:password123@localhost:5432/bookmarked_dev`  | PostgreSQL connection string                                                                                                                       |
| `DATABASE_URL_TEST`   | `postgresql://postgres:password123@localhost:5432/bookmarked_test` | PostgreSQL connection string for tests                                                                                                             |
| `SUPABASE_URL`        | none (required)                                                    | Supabase project URL (same value as the frontend's `VITE_SUPABASE_URL`); tokens are verified with its JWKS. The server refuses to start without it |
| `SUPABASE_JWT_SECRET` | empty                                                              | Only for projects still signing tokens with the legacy shared HS256 secret                                                                         |
| `TRUST_PROXY` | `0` | Proxies in front of the API (set `1` on Render), so rate limits count the client IP and not the proxy's |
| `CORS_ORIGINS` | empty | Comma-separated frontend origins allowed by CORS and Socket.IO; empty allows any origin |

## Folder layout

```
apps/backend/
├── src/
│   ├── features/          # One folder per feature, with everything about it
│   │   ├── book/          # book.ts (Book + value objects), book-repository.ts (interface + Drizzle + mapper),
│   │   │                  # book-service.ts (get/register/search/remove), book-dto.ts (JSON shape + mapper),
│   │   │                  # book-routes.ts (routes)
│   │   ├── reading-status/ # ReadingStatus aggregate, ReadingState (State pattern) + PageProgress, repository, service, DTO, routes
│   │   ├── challenge-group/ # ChallengeGroup aggregate (groups + member + challenges), repository, standings query, service, DTO, routes
│   │   ├── group/         # Shared kernel of every group: GroupId, GroupName, memberships, GroupRoster, MemberJoined event
│   │   ├── group-invite/  # GroupInvite aggregate, repository, service, DTO, routes (any group)
│   │   ├── book-club/     # BookClub aggregate (rounds), BookPoll aggregate (voting), progress query, services, DTO, routes
│   │   ├── friend/        # Friend requests (request, accept, decline, remove) and the friends list
│   │   ├── reading-session/ # ReadingSession aggregate (server-timed), repository + stats, service, DTO, routes
│   │   ├── group-chat/    # ChatMessage entity, repository, membership query, ChatService, routes, Socket.IO notifier, JoinAnnouncer
│   │   ├── auth/          # AuthProvider port + SupabaseAuthProvider (JWT verification with JWKS)
│   │   ├── user/          # User entity + value objects (UserId, Email, Username), repository, UserService, /me routes
│   │   └── library/       # Read-side query (CQRS) and the library route
│   ├── api/               # router.ts wires each feature's service and mounts its routes; health route
│   ├── config/            # env.ts: every setting read from the environment
│   ├── middleware/        # CORS, auth (authenticate, requireUser) and the domain-error to HTTP status mapping
│   ├── utils/             # DomainError families, the typed Uuid base and the Clock type
│   ├── database/
│   │   ├── migrations/    # Drizzle SQL migrations and journal metadata
│   │   ├── schema.ts      # Tables for the query builder (source of the migrations)
│   │   ├── schema.sql     # PostgreSQL database schema matching UML specification
│   │   └── pool.ts, migrate.ts, seed.ts, health-check.ts
│   ├── app.ts             # createApp(): middleware, the API router and the error handler
│   └── server.ts          # entry point: builds the repositories and starts the HTTP server
├── tests/
│   ├── helpers/     # Shared test utilities (http, test-db, in-memory repositories, FakeAuthProvider)
│   ├── unit/        # Entity, value object and service tests, no database needed
│   └── integration/ # Integration tests against the database and HTTP API
├── drizzle.config.ts
├── eslint.config.js
├── tsconfig.json        # used by the editor and typecheck
└── tsconfig.build.json  # used by the build (excludes tests)
```

`createApp()` is separate from `server.ts` so tests can call the app without opening a port. Each feature keeps the DDD layers as files rather than folders: the entity file (`book.ts`) and the service (`book-service.ts`) are plain TypeScript, and only `*-repository.ts`, `*-query.ts` and `*-routes.ts` may import Drizzle, `pg` or Express. ESLint enforces this with `no-restricted-imports` (see [`eslint.config.js`](eslint.config.js)). A service has one method per use case and receives the repository interfaces, so unit tests use in-memory repositories. Drizzle is used only as a typed query builder; the relational API (`relations()`, `db.query`, `with:`) is not used. Domain errors map to HTTP status codes in [`src/middleware/error-handler.ts`](src/middleware/error-handler.ts): invalid values give 400, a missing or invalid session 401, forbidden actions 403, missing aggregates 404 and forbidden state changes 409; errors with a `code` (e.g. `PROFILE_REQUIRED`) include it in the body.
