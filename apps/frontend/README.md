# Bookmarked frontend

Vue 3 + TypeScript + Vite, in the root pnpm workspace. Install dependencies from the repository root with `pnpm install --frozen-lockfile` using Node 24 (see the root README).

## Run locally

In separate terminals from the repository root:

```sh
pnpm dev:backend
pnpm --filter @bookmarked/frontend dev
```

Open the Vite URL (normally http://localhost:5173), then visit `/home`. The placeholder initially shows “Checking backend…” and then the backend result (normally “Backend status: ok”) or an error. It remains available in production as a connection smoke check.

The library prototype is at `/library`. It currently uses mock data in `src/mocks/library.ts`; the layout, filters, cards and shelves are already in place, and the API wiring comes when the library endpoints exist.

Opening a book goes to `/library/:bookId`. The detail page covers your reading progress, edition, thoughts, friends' reviews and reading-club activity; “Start session” opens `/session/:bookId`. The active-session page runs the mock Emma session, including the separate `ReadingTimer` component, page/percentage progress editing and the eligible-group rail. Both pages fall back to a friendly message for an unknown book id and use mock data until the book and session APIs exist.

The default API base is `/api`. Vite proxies `/api/health` to `http://localhost:3000/health`, avoiding browser CORS errors. If your backend uses a different local port, change the proxy target in `vite.config.ts`. Copy `.env.example` to `.env.local` only if overriding the API base. Requests time out after ten seconds.

If a local `.env` or `.env.local` still sets `VITE_API_BASE_URL=http://localhost:3000`, change it to `/api` and restart Vite. An absolute backend URL bypasses the development proxy and requires backend CORS headers. Environment files are read when Vite starts.

## Production

Build with `pnpm --filter @bookmarked/frontend build` and deploy `dist/`. Configure the host to route `/api/*` to the backend, removing the `/api` prefix: `/api/health` must reach backend `GET /health`. Apply this rule before the SPA fallback (`/*` → `index.html`) so deep links such as `/home` work. The Vite development proxy is not part of the production build or `vite preview`.

Alternatively, set `VITE_API_BASE_URL` to the public backend URL **at build time**. A separate backend origin must allow the frontend origin through CORS; the current backend skeleton does not configure CORS. Do not put secrets in `VITE_*` variables, which are public in the bundle.

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

- `src/assets/styles/tokens.css`: the five brand colors, semantic aliases, typography, spacing and radii. Brand hex values are defined once here.
- `src/assets/styles/main.css`: global styles consuming tokens.
- `src/views/`: Login, Home and not-found placeholders, the responsive [library page](src/views/LibraryView.vue), [book detail](src/views/BookDetailView.vue), [active session](src/views/ActiveSessionView.vue), and view tests in `__tests__/`.
- `src/components/library/`: the reusable [book card](src/components/library/LibraryBookCard.vue), the [“Your shelves” side menu](src/components/library/LibrarySidebar.vue), and the book-detail reading, edition, thoughts, review and reading-club panels.
- `src/components/session/`: the separate [reading timer](src/components/session/ReadingTimer.vue) with pause, resume and stop events.
- `src/mocks/library.ts`, `src/types/library.ts`, `src/utils/library.ts`: mock library and book-detail data, domain types and filtering, progress and sorting helpers. Replace the mock with API data once the backend endpoints exist.
- `src/mocks/session.ts`, `src/types/session.ts`: the mock active session (including eligible groups and rules) and its types. Replace them when the session API exists.
- `src/assets/covers/`: the book cover crops used by the library and detail prototypes, including the portrait Emma detail cover.
- `src/router/`: routes and router tests.
- `src/services/api.ts`: configurable health request and response validation.

The [Home](../../docs/design/screens/05-home.png) and [authentication](../../docs/design/screens/01-authentication.png) screenshots guide typography: [Lora](https://fonts.google.com/specimen/Lora) for headings, book titles and editorial text; [Inter](https://fonts.google.com/specimen/Inter) for body copy, navigation, labels and controls. `index.html` loads both with `display=swap`, with local serif/sans-serif fallbacks. Warm neutral background, surface, muted text and border tokens follow the screenshots; the five brand colors are unchanged.
