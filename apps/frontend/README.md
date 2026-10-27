# Bookmarked frontend

Vue 3 + TypeScript + Vite, in the root pnpm workspace. Install dependencies from the repository root with `pnpm install --frozen-lockfile` using Node 24 (see the root README).

## Run locally

In separate terminals from the repository root:

```sh
pnpm dev:backend
pnpm --filter @bookmarked/frontend dev
```

Open the Vite URL (normally http://localhost:5173), then visit `/home`. The profile prototype is at `/profile` (mock data); `/profile?state=new` shows every section's empty state. The placeholder initially shows “Checking backend…” and then the backend result (normally “Backend status: ok”) or an error. It remains available in production as a connection smoke check.

The groups prototype (mock data only) is at `/groups`: the list, `/groups/new` to create a group, and `/groups/october-sprint` (challenge) and `/groups/classics` (book club).

The library view is at `/library`. It connects to the backend API (`GET /api/user/:userId/library`) for the demo reader (`a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11`), dynamically updating shelf filter counts, with seamless fallback to mock data in `src/mocks/library.ts` when offline or during tests.

Opening a book goes to `/library/:bookId`. It loads book details and reading status from the backend by UUID, and includes an interactive status editor in the reading panel to update the reading status (e.g. to `in-progress`) and current page (e.g. to `10`) via `PUT /api/reading-status`. “Start session” opens `/session/:bookId`. Both pages fall back gracefully for unknown IDs or offline testing.

The default API base is `/api`. Vite proxies `/api/health` to `http://localhost:3000/health`, avoiding browser CORS errors. If your backend uses a different local port, change the proxy target in `vite.config.ts`. Copy `.env.example` to `.env.local` only if overriding the API base. Requests time out after ten seconds.

If a local `.env` or `.env.local` still sets `VITE_API_BASE_URL=http://localhost:3000`, change it to `/api` and restart Vite. An absolute backend URL bypasses the development proxy and requires backend CORS headers. Environment files are read when Vite starts.

## Production

Build with `pnpm --filter @bookmarked/frontend build` and deploy `dist/`. Configure the host to route `/api/*` to the backend, removing the `/api` prefix: `/api/health` must reach backend `GET /health`. Apply this rule before the SPA fallback (`/*` → `index.html`) so deep links such as `/home` work. The Vite development proxy is not part of the production build or `vite preview`.

Alternatively, set `VITE_API_BASE_URL` to the public backend URL **at build time** (e.g. on Render's Environment settings). The Express backend configures permissive CORS headers to support cross-origin requests. Do not put secrets in `VITE_*` variables, which are public in the bundle.

After deployment, open `/home` and check for “Backend status: ok” and a successful `/health` request in browser network tools. Production verification requires a deployed frontend/backend and host routing.

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

- `src/assets/styles/tokens.css`: the five brand colors, semantic aliases, typography, spacing and radii. Brand hex values are  
defined once here. Use the `--font-size-*` scale (`2xs` 11px to `display` 56px) for every font size. A second block holds the     
tokens added for the profile page and app layout (hover and on-primary colors, page width, cover and menu shadows, motion).       
- `src/assets/styles/main.css`: global styles consuming tokens, plus shared classes (`.page-column`, `.button`, `.text-link`, `.
book-link`, `.progress-bar`, `.section-title`, `.sr-only`).
- `src/views/`: Login, Home and not-found placeholders, the profile page prototype (`ProfileView`), the responsive [library     
page](src/views/LibraryView.vue), [book detail](src/views/BookDetailView.vue), [active session](src/views/ActiveSessionView.vue), the groups pages (`GroupsView`, `CreateGroupView`, `GroupDetailView`, which shows `ChallengeGroupView` or `BookClubGroupView`), 
and view tests in `__tests__/`.
- `src/components/layout/`: `AppHeader` (nav, search, notifications, account menu) and `AppFooter`, shown on every route except 
those with `meta.hideAppChrome` (Login).
- `src/components/library/`: the reusable [book card](src/components/library/LibraryBookCard.vue), the [“Your shelves” side     
menu](src/components/library/LibrarySidebar.vue), and the book-detail reading, edition, thoughts, review and reading-club panels. 
- `src/components/groups/`: the groups building blocks (`GroupCard`, `GroupLeaderboard`, `GroupChat`, `GroupsPageHeader`, `InfoNote`, `ToggleSwitch`, `MemberAvatar`).
- `src/components/profile/`: the profile sections (`ProfileBookplate`, `CurrentlyReading`, `BookShelf`, `CoverGrid`,            
`ChapterLevel`, `StreakCalendar`, `ReadingTime`, `ChallengesSummary`, `FolderList`, `MonthRecap`, `BookCover`). Each one handles  
its own empty state.
- `src/components/session/`: the separate [reading timer](src/components/session/ReadingTimer.vue) with pause, resume and stop  
events.
- `src/mocks/`, `src/types/`, `src/utils/`: domain types, helpers, and typed mock data for the profile, library, and active     
session, used until the backend APIs exist.
- `src/assets/covers/`: the book cover crops used by the library and detail prototypes, including the portrait Emma detail cover.
- `src/router/`: routes and router tests.
- `src/services/api.ts`: configurable health request and response validation.

The [Home](../../docs/design/screens/05-home.png) and [authentication](../../docs/design/screens/01-authentication.png) screenshots guide typography: [Lora](https://fonts.google.com/specimen/Lora) for headings, book titles and editorial text; [Inter](https://fonts.google.com/specimen/Inter) for body copy, navigation, labels and controls. `index.html` loads both with `display=swap`, with local serif/sans-serif fallbacks. Warm neutral background, surface, muted text and border tokens follow the screenshots; the five brand colors are unchanged.
