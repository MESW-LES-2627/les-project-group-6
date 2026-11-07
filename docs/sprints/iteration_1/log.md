# Iteration 1 log

A running record of what the team did and decided in iteration 1. The [release notes](release_notes.md) are the summary written at the end; this file is the day-to-day history. Newest entries go at the bottom. Iteration 0 is in its [own log](../iteration_0/log.md).

**Traceability chain:** requirement ID (`F-XXX-NN`) → GitHub issue (milestone `Iteration 1`) → PR → release notes.

## Log

### 2026-11-04: Library link in the header

- The **Library** item in the [header](../../../apps/frontend/src/components/layout/AppHeader.vue) now links to `/library`, like Groups and Profile; it was a dead `#` link. It stays highlighted on `/library/:bookId`. Explore still has no route.

### 2026-11-04: Inter for the profile name and section titles

- On [`/profile`](../../../apps/frontend/src/views/ProfileView.vue) the reader's name (`h1`) and the section titles (`h2`: Currently reading, Shelf, Streak, Reading time, recap…) now use Inter instead of Lora. Book titles (`h3`, spines) keep Lora, as do headings on other pages.

### 2026-11-04: One look for profile, library and groups (design)

- Wrote [`apps/frontend/PRODUCT.md`](../../../apps/frontend/PRODUCT.md), the product record the Impeccable design skill reads before UI work (users, purpose, capabilities, brand commitments).
- **Decision: the Profile page is the app's visual reference.** Library, Groups (list, book club, challenge) and the login page were redesigned on a Claude Design canvas to match it: the burgundy bookplate band, open sections split by thin rules instead of bordered cards and panels, Inter page and section titles, Lora book titles, and generated covers. *Rejected:* the current serif slogan headers ("A life between the covers."), small labels above headings, and stat rows, as too busy and too generic. The canvas is private to its owner until shared; porting it to the Vue views is the next step.

### 2026-11-04: Library, groups and login rebuilt in the profile's look

- Ported the design canvas to Vue. [`/library`](../../../apps/frontend/src/views/LibraryView.vue), [`/groups`](../../../apps/frontend/src/views/GroupsView.vue), the [challenge](../../../apps/frontend/src/views/ChallengeGroupView.vue) and [book club](../../../apps/frontend/src/views/BookClubGroupView.vue) pages and [`/login`](../../../apps/frontend/src/views/LoginView.vue) now open with the profile's burgundy plate (new [`PagePlate`](../../../apps/frontend/src/components/layout/PagePlate.vue)) and use open sections split by rules instead of cards and panels. Behaviour is unchanged: API loading with mock fallback, filters, invites, chat, voting, proposals and the club admin panel.
- Library: status tabs, search, genre and sort in one toolbar; folders and tags in a plain sidebar; books as 2:3 covers ([`BookCoverImage`](../../../apps/frontend/src/components/library/BookCoverImage.vue), which shows the title when an image fails). The six mock cover PNGs in `src/assets/covers/` were cropped to the cover itself (they had a beige border).
- Groups: kind tabs (all, challenges, book clubs) and sections by status (active, coming up, completed) replace the status filter buttons. Login: one form at a time with Log in / Create account tabs; the reference photo was removed.
- Shared classes in `main.css`: `.section-heading`, `.page-tabs`, `.field-input`, `.link-button`; `.section-title` now uses Inter. Tests updated to the new layout (92 passing).

### 2026-11-04: Home redesign, same plate height everywhere

- [`/home`](../../../apps/frontend/src/views/HomeView.vue) redesigned with its own look, without the burgundy plate (the team chose the "bedside table" direction over a day-journal timeline and a colour-block dashboard): a large greeting with the date, the current book with a large cover and Start session, with this week's reading days, the streak and the year goals (bars instead of rings) beside it, then open sections for your groups, from your circle, reading now, requests waiting for you and trending among friends. The serif slogan, the emoji, the play glyph and the empty-state card shown next to real data were removed.
- `PagePlate` now has the profile bookplate's minimum height (192 px), so every plate is the same size.
- "Admin & settings" is back on the book club (it had been renamed "Club settings") and on the challenge page.

### 2026-11-04: Redesign checked against the real API

- Ran the redesigned pages against a local PostgreSQL 17 database (migrated and seeded) instead of the mock fallback. Checked: the library lists the seeded books, the book detail saves the current page, accepting an invite joins the group, creating a challenge and a book club opens their pages, chat messages are stored and shown, and a book club vote takes a proposal and a vote. Library and groups have no sideways scroll at 500 px.
- Fixed two things that only showed with real data. A challenge with no scores yet showed "#0" in the plate and in the standings; it now shows "Not ranked yet" with no rank circle, and a dash in the standings. The book club plate said "1 members"; it now says "1 member". Added a view test for the unranked challenge (93 passing).

### 2026-11-05: Supabase authentication (F-AUTH-01, #7)

- Commits: `08724b2` (backend), `00f1957` (frontend), `9d9b261` (docs).

- **Backend.** Every route except `GET /health` and `GET /usernames/:username/availability` now needs `Authorization: Bearer <Supabase JWT>`. [`SupabaseAuthProvider`](../../../apps/backend/src/features/auth/supabase-auth-provider.ts) verifies it with the project's JWKS (`jose`) behind our `AuthProvider` port (ADR-0002), and [`authenticate` / `requireUser`](../../../apps/backend/src/middleware/auth.ts) answer `401 UNAUTHENTICATED` or `403 PROFILE_REQUIRED`. New `POST/GET/PATCH /me` ([`UserService`](../../../apps/backend/src/features/user/user-service.ts), [`me-routes`](../../../apps/backend/src/features/user/me-routes.ts)). Migration `0004` adds a unique index on `lower(username)`; a taken username gives `409 USERNAME_TAKEN`.
- **Decision: the acting reader always comes from the token.** Every route that read `userId` from the body, query or path now uses the token's user, and `/user/:userId/...` became `/me/...` (library, reading sessions, stats, groups, book clubs, invites, friends). The chat socket handshake sends `{ token }`. *Rejected:* keeping `userId` parameters and checking they match the token, as more code for the same result and easy to forget on a new route.
- **Kept from the existing schema:** the `users` row keeps `email` (filled from the token) and the streak columns, because other features already use them; issue #7's "no email column" was not applied.
- **Frontend.** One Supabase client (“Keep me signed in” chooses local or session storage), a [session store](../../../apps/frontend/src/stores/session.ts), a router guard, a [`/complete-profile`](../../../apps/frontend/src/views/CompleteProfileView.vue) step for a session without a `users` row, and Sign out in the header. Sign-up checks the username before creating the Supabase account, then creates the profile with the browser timezone. `services/api.ts` adds the token to every request; `DEMO_USER_ID` is gone.
- **Tests.** Backend 179 passing (fake `AuthProvider`, JWKS and HS256 tests, `/me` integration tests); frontend 125 passing (session store, guard, login, complete-profile, header).
- **Deploy:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` go on the frontend static site (build time); `SUPABASE_URL` goes on the backend service, which refuses to start without it.

### 2026-11-07: Security review fixes on the auth PR (#116)

- Fixed the findings of the OWASP review on PR [#116](https://github.com/MESW-LES-2627/les-project-group-6/pull/116), one commit each:
  - **Critical.** `b3534fb` ([migration 0005](../../../apps/backend/src/database/migrations/0005_lock_public_schema.sql)): the browser now has the Supabase URL and publishable key, and the app tables live in that project's `public` schema, which PostgREST serves to `anon` and `authenticated`. Every public table now has RLS on with no policies, and those roles lose their table and sequence privileges, including on tables created later. The API connects as the table owner, so it is not affected. Checked on a scratch database with the two roles: `anon` gets `permission denied`.
  - **High.** `1637375`: `DELETE /book/:id` is removed. Any reader could delete a shared book, and other readers' statuses, reviews and sessions cascaded with it. `POST /book` now sets `isCommunityAdded` on the server. *Rejected:* limiting the route to the reader who added the book, because nothing in the app deletes books.
  - **Medium.** `00d9757`: a reader can only change their own reading status; another reader's entry answers `404`. `e847eb7`: `GET /groups/challenges/:id` and `GET /groups/book-clubs/:id` answer `404` to non-members, before any standings or poll data is read.
  - **Low.** `7d8031b`: sign out uses Supabase's global scope, which revokes the refresh tokens, and falls back to a local sign-out. `fca6379`: the server closes a chat socket when its token expires, and the frontend reconnects with the refreshed token. `8cb2341`: the public username check is limited to 20 a minute per IP (`express-rate-limit`, new `TRUST_PROXY`). `1e1089c`: CORS and Socket.IO allow only `CORS_ORIGINS`, or any origin when it is empty.
- **Tests.** Backend 186 passing, frontend 130 passing.
- **Deploy:** set `TRUST_PROXY=1` and `CORS_ORIGINS=https://bookmarked-les.onrender.com` (and the staging origin on staging) on the backend services. Migration 0005 runs with the prod CD.
