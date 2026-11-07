# API routes and endpoints

Every route the app has today: the backend REST API, the chat WebSocket, and the frontend pages. Written from the code on branch `7-feature-f-auth-01-sign-up-log-in-log-out-supabase-auth-our-users-table` (Supabase auth included). Update this file when a route is added, renamed or removed.

## Authentication

- Every backend route needs `Authorization: Bearer <Supabase access token>`, except the two marked **Public**.
- The acting reader always comes from the token. No route takes a `userId` in the body, query or path; "my" data lives under `/me/...`.
- Without a valid token the API answers `401 UNAUTHENTICATED`. With a token but no `users` row yet (profile not created) it answers `403 PROFILE_REQUIRED`. `POST /me` is the only protected route that works before the profile exists.

Wiring: [`apps/backend/src/api/router.ts`](../../apps/backend/src/api/router.ts). Each feature's routes are in `apps/backend/src/features/<feature>/*-routes.ts`.

## Backend REST API

### Health

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | Public | Returns `200 {status, db}` if the database answers, `503` if it is down. |

### User and profile (`features/user/me-routes.ts`)

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/usernames/:username/availability` | Public | Tells the sign-up form whether a username is free (`{ available }`, case-insensitive). |
| POST | `/me` | Token only | Creates the signed-in reader's `users` row (`username`, `displayName`, `timezone`); `409 USERNAME_TAKEN` if taken. |
| GET | `/me` | Token + profile | Returns the signed-in reader's profile. |
| PATCH | `/me` | Token + profile | Updates the reader's `displayName` and/or `timezone`. |

### Books (`features/book/book-routes.ts`)

| Method | Path | Description |
|---|---|---|
| POST | `/book` | Registers a book in the catalog (title, description, ISBN-13, page count, cover, community-added flag). |
| GET | `/book?title=` | Searches the catalog by title. |
| GET | `/book/:id` | Returns one book by id. |
| DELETE | `/book/:id` | Removes a book from the catalog. |

### Reading status (`features/reading-status/reading-status-routes.ts`)

| Method | Path | Description |
|---|---|---|
| PUT | `/reading-status` | Sets (creates or replaces) the reader's status and current page for a book. |
| PATCH | `/reading-status/:id` | Updates an existing reading status entry (status, current page). |
| PUT | `/reading-status/:id` | Same as the PATCH above (alias). |
| PATCH | `/reading-status` | Same update, with the entry `id` in the body instead of the path. |

### Library (`features/library/library-routes.ts`)

| Method | Path | Description |
|---|---|---|
| GET | `/me/library?status=` | Lists the reader's books with their reading status, optionally filtered by status. |

### Reading sessions (`features/reading-session/reading-session-routes.ts`, ADR-0005)

| Method | Path | Description |
|---|---|---|
| POST | `/reading-sessions` | Starts a server-timed reading session for a book (`bookId`). |
| PATCH | `/reading-sessions/:id/finish` | Finishes the session and stores its duration from the server clock. |
| DELETE | `/reading-sessions/:id` | Cancels a running session without counting it. |
| GET | `/me/reading-sessions/active` | Returns the reader's running session with elapsed seconds, or `204` if none (resume on reload). |
| GET | `/me/reading-stats` | Returns the reader's totals: `totalMinutes` read and `sessionsCount`. |

### Friends (`features/friend/friend-routes.ts`)

| Method | Path | Description |
|---|---|---|
| GET | `/me/friends` | Lists the reader's friends. |

### Challenge groups (`features/challenge-group/challenge-group-routes.ts`)

| Method | Path | Description |
|---|---|---|
| POST | `/groups/challenges` | Creates a reading challenge (name, description, start date, duration, win metric, goal) with the reader as admin. |
| GET | `/groups/challenges/:id` | Returns a challenge with its status and current standings. |
| GET | `/me/groups` | Lists the challenges the reader is a member of. |

### Book clubs and polls (`features/book-club/book-club-routes.ts`)

| Method | Path | Description |
|---|---|---|
| POST | `/groups/book-clubs` | Creates a book club with its first round book and deadline. |
| GET | `/groups/book-clubs/:id` | Returns the club with its rounds, books, member progress standings and the open poll. |
| GET | `/me/book-clubs` | Lists the book clubs the reader is a member of. |
| POST | `/groups/book-clubs/:id/rounds` | Starts the next round with a new book and deadline (admin). |
| POST | `/groups/book-clubs/:id/poll` | Opens a poll to choose the next book (`closesAt`, `anonymous`). |
| POST | `/groups/book-clubs/:id/poll/proposals` | Proposes a book (`bookId`) in the open poll. |
| PUT | `/groups/book-clubs/:id/poll/vote` | Casts or changes the reader's vote for a proposal (`proposalId`). |

### Group invites (`features/group-invite/group-invite-routes.ts`)

| Method | Path | Description |
|---|---|---|
| POST | `/groups/:id/invites` | Invites a friend (`inviteeId`) to a group (challenge or book club). |
| GET | `/me/group-invites` | Lists the reader's pending group invites. |
| POST | `/group-invites/:id/accept` | Accepts an invite: joins the group, posts "X joined the group" in the chat, and a book club adds its round book to the library. |
| POST | `/group-invites/:id/decline` | Declines an invite. |

### Group chat, REST part (`features/group-chat/chat-routes.ts`, ADR-0006)

REST is the source of truth for the chat: messages are sent, read and deleted here. Only group members may use these routes (`403` otherwise).

| Method | Path | Description |
|---|---|---|
| POST | `/groups/:groupId/messages` | Sends a text message (`clientId`, `body`); `201` when new, `200` when a retry with the same `clientId` returns the stored one. |
| GET | `/groups/:groupId/messages?after=&before=&limit=` | Returns a page of history ordered by `seq`; `after` or `before` (not both), `limit` 1–100, default 50. |
| DELETE | `/groups/:groupId/messages/:messageId` | Deletes a message (author or group admin); the body is no longer served. |

Message shape (REST responses and socket events):

```ts
{ id, seq, groupId, kind, authorId, clientId, body /* null once deleted */, createdAt, deletedAt }
```

## Group chat WebSocket (Socket.IO)

The chat uses **Socket.IO** on the same host and port as the HTTP API. The socket is **listen-only**: clients never send messages through it. They send with `POST /groups/:groupId/messages`, and the server pushes the stored result to everyone listening in that group. Server: [`chat-socket.ts`](../../apps/backend/src/features/group-chat/chat-socket.ts). Client: [`apps/frontend/src/services/chat-socket.ts`](../../apps/frontend/src/services/chat-socket.ts).

### Connection

- URL: the API origin, with Socket.IO path `<api path>/socket.io` (default `/socket.io`).
- Handshake: the client sends `auth: { token: <Supabase access token> }`. The server verifies it and takes the user from it. A missing or invalid token fails the connection with `unauthorized`. The client passes `auth` as a callback, so each reconnect uses a fresh token.
- On connect the server puts the socket in a private room `user:<userId>`. The server uses it to remove the reader from a group's room when they leave that group.

### Client → server events

| Event | Payload | Ack | Description |
|---|---|---|---|
| `group:join` | `groupId` (string) | `{ ok: true }` or `{ ok: false, error: 'forbidden' \| 'internal' }` | Subscribes the socket to the group's room `group:<groupId>`; only members are accepted. |
| `group:leave` | `groupId` (string) | none | Unsubscribes the socket from the group's room. |

### Server → client events

| Event | Payload | Description |
|---|---|---|
| `message:new` | message (shape above) | A message was stored in the group: a member's text or a system message such as "X joined the group". |
| `message:deleted` | `{ id, groupId, seq }` | A message in the group was deleted; the client hides its text. |

### Flow

1. The page loads the history with `GET /groups/:groupId/messages`.
2. It opens the socket and emits `group:join`. Rooms are lost when the connection drops, so the client joins again on every `connect`.
3. After each successful join, the client fetches what it missed with `GET ...?after=<last seq>`.
4. New messages and deletions arrive as `message:new` / `message:deleted`. The client dedupes by `id` and `clientId` (its own sends) and orders by `seq`.

## Frontend routes (Vue Router)

Defined in [`apps/frontend/src/router/index.ts`](../../apps/frontend/src/router/index.ts). A guard sends signed-out visitors to `/login` (keeping `?redirect=`), keeps a session without a profile on `/complete-profile`, and sends a signed-in reader away from both to `/home`.

| Path | Name | Access | Description |
|---|---|---|---|
| `/` | — | — | Redirects to `/home`. |
| `/login` | `login` | Public | Log in / create account with Supabase. |
| `/complete-profile` | `complete-profile` | Session without profile | Finishes sign-up by creating the `users` row (username, display name). |
| `/home` | `home` | Signed in | Home: current book, start session, week, streak, goals, groups and friends' activity. |
| `/library` | `library` | Signed in | The reader's library with status tabs, search, filters, folders and tags. |
| `/library/:bookId` | `book-detail` | Signed in | One book's details, status and current page. |
| `/session/:bookId` | `active-session` | Signed in | Reading session timer for a book. |
| `/groups` | `groups` | Signed in | Lists the reader's challenges and book clubs, plus pending invites. |
| `/groups/new` | `group-create` | Signed in | Creates a challenge or a book club. |
| `/groups/:groupId` | `group-detail` | Signed in | A challenge or book club page, with standings, chat, voting and admin. |
| `/profile` | `profile` | Signed in | The reader's profile. |
| `/:pathMatch(.*)*` | `not-found` | Signed in | Not-found page for unknown paths. |
