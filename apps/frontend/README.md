# Bookmarked frontend

Vue 3 + TypeScript + Vite, in the root pnpm workspace. Install dependencies from the repository root with `pnpm install --frozen-lockfile` using Node 24 (see the root README).

## Run locally

In separate terminals from the repository root:

```sh
pnpm dev:backend
pnpm --filter @bookmarked/frontend dev
```

Open the Vite URL (normally http://localhost:5173), then visit `/home` for the home prototype (mock data, from design screen 05). The profile prototype is at `/profile` (mock data); `/profile?state=new` shows every section's empty state.

The groups prototype (mock data only) is at `/groups`: the list, `/groups/new` to create a group, and `/groups/october-sprint` (challenge) and `/groups/classics` (book club).

The library view is at `/library`. It connects to the backend API (`GET /api/user/:userId/library`) for the demo reader (`a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`), dynamically updating shelf filter counts, with seamless fallback to mock data in `src/mocks/library.ts` when offline or during tests.

Opening a book goes to `/library/:bookId`. It loads book details and reading status from the backend by UUID, and includes an interactive status editor in the reading panel to update the reading status (e.g. to `in-progress`) and current page (e.g. to `10`) via `PUT /api/reading-status`. “Start session” opens `/session/:bookId`. Both pages fall back gracefully for unknown IDs or offline testing.

The default API base is `/api`. Vite proxies `/api/health` to `http://localhost:3000/health`, avoiding browser CORS errors. If your backend uses a different local port, change the proxy target in `vite.config.ts`. Copy `.env.example` to `.env.local` only if overriding the API base. Requests time out after ten seconds.

If a local `.env` or `.env.local` still sets `VITE_API_BASE_URL=http://localhost:3000`, change it to `/api` and restart Vite. An absolute backend URL bypasses the development proxy and requires backend CORS headers. Environment files are read when Vite starts.

## Production

Build with `pnpm --filter @bookmarked/frontend build` and deploy `dist/`. Configure the host to route `/api/*` to the backend, removing the `/api` prefix: `/api/health` must reach backend `GET /health`. Apply this rule before the SPA fallback (`/*` → `index.html`) so deep links such as `/home` work. The Vite development proxy is not part of the production build or `vite preview`.

Alternatively, set `VITE_API_BASE_URL` to the public backend URL **at build time** (e.g. on Render's Environment settings). The Express backend configures permissive CORS headers to support cross-origin requests. Do not put secrets in `VITE_*` variables, which are public in the bundle.

After deployment, open `/library` and check for a successful library API request in browser network tools (the home page uses mock data only). Production verification requires a deployed frontend/backend and host routing.

## Checks

Run from the repository root:

```sh
pnpm --filter @bookmarked/frontend lint
pnpm --filter @bookmarked/frontend format:check
pnpm --filter @bookmarked/frontend typecheck
pnpm --filter @bookmarked/frontend test
pnpm --filter @bookmarked/frontend build
```

Lint uses Oxlint and ESLint with `eslint-plugin-vue`. Formatting uses the root Prettier configuration. Typechecking uses `vue-tsc`, including tests. `test` runs Vitest once with jsdom and `@vue/test-utils`; use `test:watch` for watch mode and `format` to apply Prettier. Frontend CI runs these checks on frontend and shared config changes.

## Source layout and design

- `src/assets/styles/tokens.css`: brand colors, semantic aliases, typography, spacing, radii and layout/motion tokens. Use the `--font-size-*` scale for font sizes.
- `src/assets/styles/main.css`: global styles and shared classes (`.page-column`, `.button`, `.text-link`, `.book-link`, `.progress-bar`, `.section-title`, `.section-heading`, `.page-tabs`, `.field-input`, `.link-button`, `.sr-only`).
- `src/views/`: the authentication screen, the complete-profile step (`CompleteProfileView`), the home page prototype (`HomeView`, mock data in `src/mocks/home.ts`), the not-found placeholder, the profile, library, book-detail and active-session prototypes, and the groups pages (`GroupsView`, `CreateGroupView`, `GroupDetailView`, which shows `ChallengeGroupView` or `BookClubGroupView`); view tests live in `__tests__/`.
- `src/components/layout/`: `AppHeader` and `AppFooter`, hidden on routes with `meta.hideAppChrome` (Login), and `PagePlate`, the burgundy band that opens the library and groups pages (the same plate as the profile's bookplate).
- `src/components/library/`: book card, `BookCoverImage` (a 2:3 cover that shows the title when the image is missing), folders and tags sidebar, and book-detail panels.
- `src/components/groups/`: the groups building blocks (`GroupCard`, `GroupLeaderboard`, `GroupChat`, `GroupsPageHeader`, `InfoNote`, `ToggleSwitch`, `MemberAvatar`).
- `src/components/profile/`: profile sections with their empty states.
- `src/components/session/`: reading timer with pause, resume and stop events.
- `src/mocks/`, `src/types/`, `src/utils/`: domain types, helpers and typed prototype data.
- `src/assets/covers/`: book cover crops (2:3).
- `src/router/`: routes, the auth guard and router tests.
- `src/stores/`: the session store (`session.ts`) and its test doubles.
- `src/services/api.ts`: health request and response validation; `src/services/auth.ts`: the Supabase adapter (see [Authentication](#authentication)); `src/services/chat-socket.ts`: the listen-only Socket.IO wrapper for the group chat (ADR-0006); `src/services/__tests__/`: adapter tests.

The [Home](../../docs/design/screens/05-home.png) and [authentication](../../docs/design/screens/01-authentication.png) screenshots guide typography: [Lora](https://fonts.google.com/specimen/Lora) for book titles, quotes and editorial text; [Inter](https://fonts.google.com/specimen/Inter) for body copy, navigation, labels and controls, and for page and section titles on the profile, library, groups and login pages, which share the profile's look (see `PRODUCT.md`). `index.html` loads both with `display=swap`, with local serif/sans-serif fallbacks. Warm neutral background, surface, muted text and border tokens follow the screenshots; the five brand colors are unchanged.

## Authentication

Every page except `/login` needs a signed-in reader (F-AUTH-01, [issue #7](https://github.com/MESW-LES-2627/les-project-group-6/issues/7)). Identity (email, password, session) is Supabase Auth; the profile (username, display name, timezone) is our `users` row behind `POST/GET /me`.

Set the public project values in `apps/frontend/.env.local` (copy `.env.example`) and restart Vite. In production they are environment variables of the **frontend** static site on Render, read at build time, so a change needs a redeploy. Never use a service-role or secret key in `VITE_*` variables. The backend needs `SUPABASE_URL` (see its README).

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-public-publishable-key
```

In Supabase, add `http://localhost:5173/login` and the production `/login` URL to the allowed redirect URLs (the sign-up confirmation email links there).

How it fits together:

- `src/services/auth.ts`: the Supabase adapter (`AuthProvider`): sign in, sign up, sign out, the current account, the access token and session changes, all in our own types. One client; “Keep me signed in” picks local storage, otherwise session storage (`rememberAwareStorage`).
- `src/stores/session.ts`: the session store (`session.state.status` is `signed-out`, `profile-required`, `ready` or `error`, plus `me`). Sign-up first checks `GET /usernames/:username/availability`, so a taken username never creates a Supabase account. When Supabase returns a session at once, it calls `POST /me` with the browser timezone and opens Home. With email confirmation on, the reader confirms, logs in and the store finishes the profile from the sign-up metadata; if that fails (e.g. the username was taken meanwhile), they land on `/complete-profile`.
- `src/router/index.ts`: `installAuthGuard` sends visitors to `/login?redirect=…` (only same-site paths are followed, `src/utils/redirect.ts`), readers without a profile to `/complete-profile`, and signed-in readers away from both.
- `src/services/api.ts`: every request goes through `apiFetch`, which adds `Authorization: Bearer <token>`; the API takes the user from the token, so no call sends a `userId`. A `401` signs the reader out and shows the login page. The chat socket sends the token in its handshake.
- **Sign out** is in the header's account menu (and on the complete-profile page).

Login is by email and password only: Supabase signs in by email, and a public username → email lookup would leak emails, so username login is not offered. Password recovery (F-AUTH-02) and social login are not implemented.

Tests never contact Supabase: `src/services/__tests__/auth.spec.ts` mocks the SDK, `src/stores/__tests__/session.spec.ts` and the router guard tests use the doubles in `src/stores/__tests__/fake-session.ts`, and `LoginView.spec.ts` / `CompleteProfileView.spec.ts` run the pages through the store with a faked API.
