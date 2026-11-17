# Password recovery — F-AUTH-02 / #8

Frontend implementation on `feat/8-password-reset`. The supplied design reference informs the cream background, editorial heading, account-help label and bordered cards; branding and shared tokens remain Bookmarked. No backend, schema or hosted configuration changes are included.

## Flow and boundaries

- Login links to `/forgot-password`. The email form validates before the adapter request, disables duplicate submissions and displays the same confirmation for existing and absent accounts. SDK messages never reach this page: network/provider errors are generic and rate limits ask the reader to wait.
- `AuthProvider` owns recovery email requests, context checks, password updates and cleanup. The existing singleton Supabase client and remember-aware storage are reused. Redirect URLs use the browser origin and Vite `BASE_URL`, e.g. `https://example.org/bookmarked/reset-password`.
- The installed Supabase JS SDK uses its default **implicit flow**, with `detectSessionInUrl: true`. The standard Supabase email verification endpoint verifies the email link, then redirects with a session fragment. The adapter subscribes before initialization, accepts `PASSWORD_RECOVERY`, and waits for the SDK's queued event before checking context. The SDK validates the callback access token with Auth; the adapter removes remaining callback fragments, including malformed ones. Do not change email templates to send PKCE codes or token hashes to this route without implementing that different flow.
- Only a recovery event creates context. Tab-local metadata contains the JWT session identifier, a deadline and consumption state, **no access/refresh tokens**. Refresh restores context only with the matching SDK session. An ordinary session, missing/malformed callback, expired deadline or consumed recovery cannot update a password. Successfully consumed session identifiers also block replay within the tab. Supabase enforces single use of the original email verification URL; this must be checked live.
- Password and confirmation must match and contain at least **12 characters**, consistent with signup. The adapter checks context again, validates the account with Auth, then calls `updateUser({ password })`. Failed updates show safe guidance; successful updates consume context before cleanup.
- Recovery routes are accessible signed out, signed in and without a profile. Other routes redirect recovery-owned sessions to reset before fetching or creating a profile, including expired or consumed context awaiting cleanup. Ownership is tracked separately from permission to update a password. All other private routes retain the existing auth guard.
- Successful completion or leaving reset signs out **locally**, only if the current SDK session matches the recovery context. Direct/invalid visits leave unrelated sessions intact. Cleanup failure keeps the consumed context so sign-out can be retried without changing the password again. Opening a valid link replaces the current SDK session as part of Supabase's normal flow; it does not restore a previous account afterwards. Other devices are not globally signed out by this frontend.
- If browser session storage is blocked, the recovery flow works in memory; refresh requires a new email link. Clearing browser storage also requires a fresh link.

The full GitHub issue acceptance criteria could not be read: the GitHub CLI is unavailable and issue/API URLs were inaccessible through the available browser tools. The repository's [requirements](../requirements/requirements.md) and the supplied task criteria were used. Issue status was not changed.

## External Supabase configuration (team action)

No dashboard setting was read or modified. Verify these on the intended **non-production** project first:

1. **Authentication → URL Configuration**: set the intended Site URL and allow exact reset destinations:
   - `http://localhost:5173/reset-password` (Vite development).
   - `http://localhost:4173/reset-password` if manually testing the usual production preview.
   - `https://<staging-host>/<base-path-if-any>/reset-password`.
   - `https://<production-host>/<base-path-if-any>/reset-password`.
   Use the actual configured Vite base path, omit the placeholder/base segment at root, and retain existing login/OAuth entries. Prefer exact URLs over broad production wildcards. The deterministic Playwright server on port 4175 uses mocks and needs no Supabase allowlist entry.
2. **Authentication → Email provider → Email OTP expiration**: require **3600 seconds (one hour)** for recovery links (`mailer_otp_exp` in Auth configuration). Verify the saved project setting and confirm the recovery email template uses the standard verification link (`{{ .ConfirmationURL }}`). This is separate from JWT/session expiration; a frontend timer cannot establish the server's email-link lifetime. Supabase may move dashboard labels; verify the corresponding Auth setting.
3. Configure email/password authentication, the 12-character server password minimum and working email delivery. Hosted default SMTP has recipient/rate restrictions; live testing generally needs a verified sender and custom SMTP, or an explicitly authorized recipient. For local Supabase, use its mail capture service (Mailpit). Keep SMTP credentials and privileged keys out of frontend variables.
4. Ensure the deployed static host serves the SPA for both recovery paths and preserves the deployment base. Keep API rewrites ahead of SPA fallback. Disable email click tracking/link rewriting that consumes or alters verification links; account for mail scanners when checking single-use behavior.

References: [Supabase reset email API](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail), [password auth](https://supabase.com/docs/guides/auth/passwords), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [email templates](https://supabase.com/docs/guides/auth/auth-email-templates), [email-link expiration](https://supabase.com/docs/guides/auth/auth-email-passwordless), [SMTP prerequisites](https://supabase.com/docs/guides/auth/auth-smtp).

## Verification

Automated tests use synthetic sessions and mock SDK/network boundaries; there are no production authentication bypasses. Run the frontend unit suite and:

```sh
pnpm --filter @bookmarked/frontend exec playwright install chromium
pnpm --filter @bookmarked/frontend exec playwright test --config playwright.recovery.config.ts
```

The separate Playwright configuration builds into `apps/frontend/dist-ssr/recovery`, uses desktop and mobile Chromium and never starts a backend or loads shared `.env.e2e` credentials. It covers navigation, validation, confirmation, update success/failure, invalid links, refresh, keyboard focus, storage persistence and existing auth redirects. Callback fragments use synthetic fixtures; tracing and automatic failure screenshots are disabled. Explicit UI screenshots are taken only on token-free request/reset screens for visual inspection. The existing live stack suite remains separate, and its database-modifying profile setup is not part of this verification.

**Live Supabase verification is outstanding.** No approved disposable account and safe inbox were supplied. Manual steps:

1. Complete the external configuration above in a non-production project. Use a disposable account and an authorized test inbox/Mailpit. Never use a personal, shared or production account.
2. Request a link through Login → Forgot password. Compare the confirmation for an absent test address, without inspecting or reporting account-sensitive provider responses.
3. Open the actual email verification link. Confirm reset appears before Home/profile setup; refresh, enter matching 12+ character passwords, submit, and log in with the new password. Verify the old password fails.
4. Reopen the original email link; expect recovery guidance. Test a malformed link, a direct visit with/without an unrelated session, and a link older than 3600 seconds. Confirm server rejection after one hour; do not infer it from JWT expiry or alter the local clock as a substitute.
5. Repeat on the deployed base path, desktop/mobile and with keyboard navigation. Check delivery, spam folder and rate-limit guidance. Record results without recording tokens, full links, passwords or inbox contents.


## Automated check record — 2026-11-17

Commands below run from `apps/frontend` (equivalent to the root `pnpm --filter @bookmarked/frontend …` commands):

| Command | Result |
|---|---|
| `pnpm typecheck` | Passed |
| `pnpm test` | 234 tests passed across 36 files |
| `pnpm build` | Passed, including vue-tsc and the Vite production build |
| `pnpm exec playwright test --config playwright.recovery.config.ts` | 20 desktop/mobile auth/recovery scenarios passed with mocked Supabase/API responses |
| `pnpm lint` | Oxlint passed; ESLint failed on existing `@ts-nocheck` comments at line 1 of `stryker.config.mjs` and `vitest.config.ts` |
| `pnpm format:check` | Failed only on unchanged `src/services/api.ts` |
| `pnpm test:coverage` | All 234 tests passed; global line coverage 86%, below the configured 95% gate |
| `pnpm exec eslint src e2e/recovery.spec.ts playwright.config.ts playwright.recovery.config.ts` | Passed |

Scoped formatting also passed:

```sh
pnpm exec prettier --check src/services/auth.ts src/services/__tests__/recovery.spec.ts src/router src/stores src/views/LoginView.vue src/views/PasswordRecoveryView.vue src/views/__tests__/PasswordRecoveryView.spec.ts e2e/recovery.spec.ts playwright.config.ts playwright.recovery.config.ts
```

`git diff --check` passed. Desktop request and mobile reset-validation screenshots were visually inspected. The live shared-stack suite was not run: its profile scenario directly deletes a database row, and no approved database/account/mailbox was identified for this task. No backend tests were run. Automated recovery fixtures do not verify actual SMTP delivery, the hosted one-hour expiry, or server-side single use of the original email link.
