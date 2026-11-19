// @req F-AUTH-02 F-AUTH-01
import { expect, test, type Page } from '@playwright/test';

const user = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'reader@example.com',
  user_metadata: {},
  app_metadata: { provider: 'email' },
};
const profile = {
  ...user,
  username: 'reader',
  displayName: 'Reader',
  timezone: 'Europe/Lisbon',
  photoUrl: null,
  profileVisibility: 'private',
  createdAt: '2026-11-01T00:00:00Z',
};
function sdkSession(id = 'ordinary-session') {
  const now = Math.floor(Date.now() / 1000);
  // Synthetic SDK fixtures only; no real credentials or recovery links.
  const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ sub: user.id, aud: 'authenticated', exp: now + 3600, iat: now, session_id: id })).toString('base64url')}.synthetic`;
  return {
    access_token: token,
    refresh_token: 'synthetic-refresh',
    expires_in: 3600,
    expires_at: now + 3600,
    token_type: 'bearer',
    user,
  };
}
async function mocks(
  page: Page,
  options: {
    profileRequired?: boolean;
    rateLimit?: boolean;
    network?: boolean;
    updateFail?: boolean;
  } = {},
) {
  const calls = { recover: 0, update: 0, profile: 0, logout: 0 };
  await page.route('https://recovery.test.supabase.co/auth/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname.endsWith('/recover')) {
      calls.recover++;
      if (options.network) return route.abort('failed');
      return route.fulfill({
        status: options.rateLimit ? 429 : 200,
        json: options.rateLimit
          ? { code: 'over_email_send_rate_limit', msg: 'Too many requests' }
          : {},
      });
    }
    if (url.pathname.endsWith('/user') && method === 'PUT') {
      calls.update++;
      return route.fulfill({
        status: options.updateFail ? 500 : 200,
        json: options.updateFail ? { msg: 'Unable to update' } : user,
      });
    }
    if (url.pathname.endsWith('/user')) return route.fulfill({ json: user });
    if (url.pathname.endsWith('/token')) return route.fulfill({ json: sdkSession() });
    if (url.pathname.endsWith('/signup')) return route.fulfill({ json: { user, session: null } });
    if (url.pathname.endsWith('/logout')) {
      calls.logout++;
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ status: 400, json: { msg: 'Invalid fixture request' } });
  });
  await page.route('**/api/**', async (route) => {
    if (route.request().url().includes('/usernames/'))
      return route.fulfill({ json: { available: true } });
    calls.profile++;
    return route.fulfill({
      status: options.profileRequired ? 403 : 200,
      json: options.profileRequired
        ? { code: 'PROFILE_REQUIRED', error: 'Complete profile' }
        : profile,
    });
  });
  return calls;
}
async function recoveryNavigation(page: Page, expires = false, used = false) {
  await page.goto('/forgot-password');
  const session = sdkSession('recovery-session');
  await page.evaluate(
    ({ session, expires }) => {
      const fragment = expires
        ? 'error=access_denied&error_code=otp_expired'
        : new URLSearchParams({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_in: String(session.expires_in),
            expires_at: String(session.expires_at),
            token_type: 'bearer',
            type: 'recovery',
          }).toString();
      window.location.replace(`/reset-password#${fragment}`);
    },
    { session, expires },
  );
  await expect(
    page.getByRole('heading', {
      name: expires || used ? 'Request a fresh reset link' : 'Choose a new password',
    }),
  ).toBeVisible();
}
async function fillPassword(page: Page) {
  await page.getByLabel('New password', { exact: true }).fill('a-new-long-password');
  await page.getByLabel('Confirm new password').fill('a-new-long-password');
}

test('login → forgot → validation → generic request confirmation, refresh and layout', async ({
  page,
}) => {
  const calls = await mocks(page);
  await page.goto('/login');
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await page.reload();
  await page.screenshot({ path: test.info().outputPath('forgot-password.png'), fullPage: true });
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('alert')).toHaveText('Enter a valid email address.');
  expect(calls.recover).toBe(0);
  await page.getByLabel('Email address').focus();
  await page.keyboard.type('unknown@example.com');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Send reset link' })).toBeFocused();
  expect(
    await page
      .getByRole('button', { name: 'Send reset link' })
      .evaluate((el) => getComputedStyle(el).outlineStyle),
  ).not.toBe('none');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('If an account exists');
  expect(calls.recover).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('valid recovery survives refresh, validates, updates once, signs out and rejects reuse', async ({
  page,
}) => {
  const calls = await mocks(page, { profileRequired: true });
  await recoveryNavigation(page);
  expect(calls.profile).toBe(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect(page.getByText('Use at least 12 characters.')).toBeVisible();
  await fillPassword(page);
  await page.getByLabel('Confirm new password').fill('mismatch-password');
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect(page.getByText('Passwords must match.')).toBeVisible();
  expect(await page.evaluate(() => location.hash)).toBe('');
  await page.screenshot({
    path: test.info().outputPath('reset-password-validation.png'),
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(calls.update).toBe(0);
  await fillPassword(page);
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect(page.getByRole('heading', { name: 'Password changed' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to login', exact: true })).toBeVisible();
  expect(calls.update).toBe(1);
  expect(calls.logout).toBe(1);
  await page.getByRole('link', { name: 'Back to login', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await recoveryNavigation(page, false, true);
});

// A new server verification URL is single-use. Replaying a consumed callback session
// is also blocked by the adapter's tab-local consumed-session record (unit tested).
test('direct, expired and malformed recovery links show guidance across refreshes', async ({
  page,
}) => {
  const calls = await mocks(page);
  for (const path of ['/reset-password', '/reset-password#type=recovery&access_token=malformed']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Request a fresh reset link' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('link', { name: 'Request another link' })).toBeVisible();
  }
  await recoveryNavigation(page, true);
  expect(calls.update).toBe(0);
  expect(calls.logout).toBe(0);
});

test('rate-limit errors are accessible and account-neutral', async ({ page }) => {
  await mocks(page, { rateLimit: true });
  await page.goto('/forgot-password');
  await page.getByLabel('Email address').fill('reader@example.com');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('alert')).toContainText('Please wait a few minutes');
});

test('password update failures permit retry and show safe guidance', async ({ page }) => {
  const calls = await mocks(page, { updateFail: true });
  await recoveryNavigation(page);
  await fillPassword(page);
  await page.getByRole('button', { name: 'Reset password' }).click();
  await expect(page.getByRole('alert')).toContainText('Unable to change');
  expect(calls.logout).toBe(0);
});

test('ordinary login restores remember-me, protects routes and logs out', async ({ page }) => {
  const calls = await mocks(page);
  await page.goto('/library');
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await page.getByLabel('Email', { exact: true }).first().fill('reader@example.com');
  await page.getByLabel('Password', { exact: true }).first().fill('existing-long-password');
  await page.getByLabel('Keep me signed in').check();
  await page.getByRole('button', { name: 'Log in', exact: true }).last().click();
  await expect(page).toHaveURL((url) => url.pathname === '/library');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Account menu' })).toBeVisible();
  await expect(page).toHaveURL((url) => url.pathname === '/library');
  await page.goto('/reset-password');
  await expect(page.getByRole('heading', { name: 'Request a fresh reset link' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to login' }).click();
  expect(calls.logout).toBe(0);
  await expect(page).toHaveURL(/\/home$/);
  expect(await page.evaluate(() => localStorage.getItem('bookmarked.remember'))).toBe('1');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/library');
  await expect(page).toHaveURL(/\/login\?redirect=/);
});

test('profile-required sessions can open recovery pages and still need a profile for private routes', async ({
  page,
}) => {
  await mocks(page, { profileRequired: true });
  await page.goto('/login');
  await page.locator('#login-email').fill('reader@example.com');
  await page.locator('#login-password').fill('existing-long-password');
  await page.locator('form[aria-labelledby="login-title"] button[type="submit"]').click();
  await expect(page).toHaveURL(/\/complete-profile$/);
  expect(await page.evaluate(() => localStorage.getItem('sb-recovery-auth-token'))).toBeNull();
  expect(
    await page.evaluate(() => sessionStorage.getItem('sb-recovery-auth-token')),
  ).not.toBeNull();
  await page.goto('/forgot-password');
  await expect(page.getByRole('heading', { name: 'Request a reset link' })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await page.goto('/reset-password');
  await expect(page.getByRole('heading', { name: 'Request a fresh reset link' })).toBeVisible();
  await page.goto('/library');
  await expect(page).toHaveURL(/\/complete-profile$/);
});

test('signup still requests email confirmation with the agreed password policy', async ({
  page,
}) => {
  await mocks(page);
  await page.goto('/login');
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.locator('#signup-name').fill('New Reader');
  await page.locator('#signup-username').fill('new_reader');
  await page.locator('#signup-email').fill('new@example.com');
  await page.locator('#signup-password').fill('a-long-new-password');
  await page.getByRole('button', { name: 'Create account', exact: true }).last().click();
  await expect(page.getByRole('status')).toContainText('Check your email to confirm your account');
});

test('network errors and duplicate requests leave a usable request form', async ({ page }) => {
  const calls = await mocks(page, { network: true });
  let release!: () => void;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/auth/v1/recover**', async (route) => {
    await held;
    await route.fallback();
  });
  await page.goto('/forgot-password');
  await page.getByLabel('Email address').fill('reader@example.com');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('button', { name: 'Please wait…' })).toBeDisabled();
  await page.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit());
  release();
  await expect(page.getByRole('alert')).toContainText('Unable to send a reset link');
  expect(calls.recover).toBe(1);
  await expect(page.getByRole('button', { name: 'Send reset link' })).toBeEnabled();
});

test('expired recovery ownership still blocks Home and profile redirects until cleanup', async ({
  page,
}) => {
  const calls = await mocks(page);
  await recoveryNavigation(page);
  await page.evaluate(() => {
    const key = 'bookmarked.recovery';
    const context = JSON.parse(sessionStorage.getItem(key)!) as { until: number };
    context.until = Date.now() - 1;
    sessionStorage.setItem(key, JSON.stringify(context));
  });
  await page.goto('/home');
  await expect(page).toHaveURL((url) => url.pathname === '/reset-password');
  await expect(page.getByRole('heading', { name: 'Request a fresh reset link' })).toBeVisible();
  expect(calls.profile).toBe(0);
  await page.getByRole('link', { name: 'Request another link' }).click();
  await expect(page).toHaveURL((url) => url.pathname === '/forgot-password');
  expect(calls.logout).toBe(1);
});
