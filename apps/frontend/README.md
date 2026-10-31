# Bookmarked frontend

Vue 3 + TypeScript + Vite, in the root pnpm workspace. Install dependencies from the repository root with `pnpm install --frozen-lockfile` using Node 24 (see the root README).

## Run locally

In separate terminals from the repository root:

```sh
pnpm dev:backend
pnpm --filter @bookmarked/frontend dev
```

Open the Vite URL (normally http://localhost:5173), then visit `/home`. The profile prototype is at `/profile` (mock data); `/profile?state=new` shows every section's empty state. The placeholder initially shows “Checking backend…” and then the backend result (normally “Backend status: ok”) or an error. It remains available in production as a connection smoke check.

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

- `src/assets/styles/tokens.css`: brand colors, semantic aliases, typography, spacing, radii and layout/motion tokens. Use the `--font-size-*` scale for font sizes.
- `src/assets/styles/main.css`: global styles and shared classes (`.page-column`, `.button`, `.text-link`, `.book-link`, `.progress-bar`, `.section-title`, `.sr-only`).
- `src/views/`: the authentication screen, Home and not-found placeholders, and the profile, library, book-detail and active-session prototypes; view tests live in `__tests__/`.
- `src/components/layout/`: `AppHeader` and `AppFooter`, hidden on routes with `meta.hideAppChrome` (Login).
- `src/components/library/`: reusable book card, shelves sidebar and book-detail panels.
- `src/components/profile/`: profile sections with their empty states.
- `src/components/session/`: reading timer with pause, resume and stop events.
- `src/mocks/`, `src/types/`, `src/utils/`: domain types, helpers and typed prototype data.
- `src/assets/covers/`: book cover crops; `src/assets/auth/`: the authentication reference photo crop.
- `src/router/`: routes and router tests.
- `src/services/api.ts`: health request and response validation; `src/services/auth.ts`: the Supabase adapter; `src/services/__tests__/`: adapter tests.

The [Home](../../docs/design/screens/05-home.png) and [authentication](../../docs/design/screens/01-authentication.png) screenshots guide typography: [Lora](https://fonts.google.com/specimen/Lora) for headings, book titles and editorial text; [Inter](https://fonts.google.com/specimen/Inter) for body copy, navigation, labels and controls. `index.html` loads both with `display=swap`, with local serif/sans-serif fallbacks. Warm neutral background, surface, muted text and border tokens follow the screenshots; the five brand colors are unchanged.

## Authentication skeleton

`/` redirects to `/login`, which contains both forms from [01-authentication.png](../../docs/design/screens/01-authentication.png). It intentionally uses the screenshot’s “Re”/“Marginalia” branding and has no invented provider buttons. The reading photograph in `src/assets/auth/reading-by-window.png` is cropped directly from that reference (x=48, y=406, 440×350), with no generated replacement. Shared tokens, `.button`, `.muted` and `.sr-only` are reused. Existing app chrome is hidden via the route’s `hideAppChrome` metadata because it differs from the reference.

The page calls our `AuthProvider` interface in `src/services/auth.ts`; the adapter lazily creates the official Supabase client. Copy these public values from `.env.example` into `.env.local` when the project is ready, then restart Vite:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-public-publishable-key
```

Leave them empty for now. Submitting without configuration shows an availability error and never simulates a session. Never use a service-role or secret key in browser variables.

- Email/password login uses [`signInWithPassword`](https://supabase.com/docs/reference/javascript/auth-signinwithpassword). Home navigation requires an actual returned session. “Keep me signed in” selects local storage; otherwise the client uses session storage.
- Signup uses [`signUp`](https://supabase.com/docs/reference/javascript/auth-signup), passing display name and normalized username as profile metadata. Without a returned session, the page asks the user to confirm their email. With a session, it currently opens Home; onboarding is not implemented yet.
- Username login is an explicit `UsernameResolver` dependency in `createAuthProvider`. Supabase password login accepts email/phone, so a trusted backend flow is still needed. Until supplied, username login shows an explanatory error; there is no invented email-lookup endpoint. The reference email label is retained, with “or username” included in its accessible label.
- `signInWithOidc(provider)` prepares the SDK’s [`signInWithOAuth`](https://supabase.com/docs/reference/javascript/auth-signinwithoauth) provider redirect with `/home` as callback. Configure and choose the provider in Supabase before enabling it. Provider buttons are awaiting an approved design; none exist in the supplied screenshot.

Before live authentication: configure allowed redirect URLs (`/login` and `/home`) and email delivery/confirmation, wire the trusted username resolver and server-enforced username uniqueness/profile creation, and finish callback/session restoration, logout, route guards and onboarding. Signup metadata alone does not enforce username uniqueness or create the application’s user row. Other prototype pages remain accessible with mock data while this is a skeleton. Password recovery currently reports that it is unavailable; footer/legal destinations are not implemented. The username helper states the permitted characters rather than falsely asserting availability.

`src/services/__tests__/auth.spec.ts` tests adapter behavior against the mocked SDK; `src/views/__tests__/LoginView.spec.ts` exercises the actual page → adapter → mocked SDK integration. No tests contact Supabase or require credentials.
