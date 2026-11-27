// @req F-READ-01 F-HOME-01
import { expect, test, type Page } from '@playwright/test';

const DUNE = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const EMMA = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const USER = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const SESSION = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const books = [
  {
    id: DUNE,
    title: 'Dune',
    authors: ['Frank Herbert'],
    pageCount: 400,
    coverUrl: null,
    description: null,
    isbn13: null,
  },
  {
    id: EMMA,
    title: 'Emma',
    authors: ['Jane Austen'],
    pageCount: 474,
    coverUrl: null,
    description: null,
    isbn13: null,
  },
];
const running = (bookId = DUNE) => ({
  id: SESSION,
  userId: USER,
  bookId,
  startedAt: '2026-11-27T09:00:00Z',
  endedAt: null as string | null,
  elapsedSeconds: 125,
  countedMinutes: 0,
});

async function fixtures(
  page: Page,
  active: ReturnType<typeof running> | null,
  lookupFails = false,
) {
  const user = { id: USER, email: 'reader@example.com', user_metadata: {} };
  const now = Math.floor(Date.now() / 1000);
  const accessToken = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')}.${Buffer.from(JSON.stringify({ sub: USER, exp: now + 3600, iat: now, session_id: 'fixture-session' })).toString('base64url')}.synthetic`;
  // Restore a synthetic SDK session; all API responses stay inside Playwright.
  await page.addInitScript(
    ({ user, accessToken, now }) => {
      sessionStorage.setItem(
        'sb-session-auth-token',
        JSON.stringify({
          user,
          access_token: accessToken,
          refresh_token: 'synthetic-refresh',
          expires_at: now + 3600,
          expires_in: 3600,
          token_type: 'bearer',
        }),
      );
    },
    { user, accessToken, now },
  );
  await page.route('https://session.test.supabase.co/auth/v1/**', (route) =>
    route.fulfill({ json: user }),
  );
  const calls = { starts: [] as string[], finishes: [] as string[], cancels: [] as string[] };
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace(/^\/api/, '');
    const method = route.request().method();
    if (path === '/me')
      return route.fulfill({
        json: {
          ...user,
          username: 'reader',
          displayName: 'Test Reader',
          timezone: 'Europe/Lisbon',
          photoUrl: null,
          profileVisibility: 'private',
          createdAt: '2026-11-01T00:00:00Z',
        },
      });
    if (path === '/me/library')
      return route.fulfill({
        json: books.map((book) => ({
          id: `li-${book.id}`,
          book,
          status: 'in-progress',
          currentPage: 40,
          updatedAt: book.id === EMMA ? '2026-11-27T10:00:00Z' : '2026-11-26T10:00:00Z',
          tagIds: [],
          folderIds: [],
        })),
      });
    if (path === '/me/reading-sessions/active') {
      if (lookupFails) return route.fulfill({ status: 503, json: { error: 'Unavailable' } });
      return active ? route.fulfill({ json: active }) : route.fulfill({ status: 204 });
    }
    if (path === '/reading-sessions' && method === 'POST') {
      const { bookId } = route.request().postDataJSON() as { bookId: string };
      calls.starts.push(bookId);
      active = { ...running(bookId), elapsedSeconds: 0 };
      return route.fulfill({ status: 201, json: active });
    }
    if (path === `/reading-sessions/${SESSION}/finish` && method === 'PATCH') {
      calls.finishes.push(SESSION);
      const finished = { ...active!, endedAt: '2026-11-27T10:00:00Z', countedMinutes: 2 };
      active = null;
      return route.fulfill({ json: finished });
    }
    if (path === `/reading-sessions/${SESSION}` && method === 'DELETE') {
      calls.cancels.push(SESSION);
      active = null;
      return route.fulfill({ status: 204 });
    }
    if (path.endsWith('/reviews'))
      return route.fulfill({
        json: { mine: null, friends: [], publicReviews: [], publicAverage: null, publicCount: 0 },
      });
    if (path === '/me/streak')
      return route.fulfill({
        json: { current: 0, longest: 0, freezesLeft: 0, readToday: false, days: [] },
      });
    if (path === '/explore')
      return route.fulfill({ json: { mostReadThisWeek: [], trending: [], suggestions: [] } });
    if (
      [
        '/me/groups',
        '/me/book-clubs',
        '/me/library/folders',
        '/me/library/tags',
        '/friend-requests',
        '/me/group-invites',
      ].includes(path)
    )
      return route.fulfill({ json: [] });
    return route.fulfill({ status: 404, json: { error: 'Not part of this fixture' } });
  });
  return calls;
}

test('no active session: Start session creates once, then refresh continues it', async ({
  page,
}) => {
  const calls = await fixtures(page, null);
  await page.goto(`/library/${DUNE}`);
  await page.getByRole('link', { name: 'Start session', exact: true }).click();
  await expect(page).toHaveURL((url) => url.pathname === `/session/${DUNE}`);
  await expect(page.locator('.timer-time')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Dune', exact: true })).toBeVisible();
  expect(calls.starts).toEqual([DUNE]);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Dune', exact: true })).toBeVisible();
  expect(calls.starts).toEqual([DUNE]);
});

test('Home continues the running session without a POST, then finishing restores Start', async ({
  page,
}) => {
  const calls = await fixtures(page, running());
  await page.goto('/home');
  await expect(page.getByRole('heading', { name: 'Dune', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Continue session', exact: true }).click();
  await expect(page.locator('.timer-time')).toContainText('00:02:');
  expect(calls.starts).toEqual([]);
  await page.getByRole('button', { name: 'Stop & save session', exact: true }).click();
  await expect(page.locator('.summary-duration')).toBeVisible();
  expect(calls.finishes).toEqual([SESSION]);
  await page.goto(`/library/${DUNE}`);
  await expect(page.getByRole('link', { name: 'Start session', exact: true })).toBeVisible();
  expect(calls.starts).toEqual([]);
});

test('another book also offers Continue and opens the existing book', async ({ page }) => {
  const calls = await fixtures(page, running());
  await page.goto(`/library/${EMMA}`);
  const link = page.getByRole('link', { name: 'Continue session', exact: true });
  await expect(link).toHaveAttribute('href', `/session/${DUNE}`);
  await link.click();
  await expect(page.getByRole('heading', { name: 'Dune', exact: true })).toBeVisible();
  expect(calls.starts).toEqual([]);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Cancel session', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Start session', exact: true })).toBeVisible();
  expect(calls.cancels).toEqual([SESSION]);
});

test('a direct stale book URL returns to the existing session without creating one', async ({
  page,
}) => {
  const calls = await fixtures(page, running());
  await page.goto(`/session/${EMMA}`);
  await expect(page).toHaveURL((url) => url.pathname === `/session/${DUNE}`);
  await expect(page.getByRole('heading', { name: 'Dune', exact: true })).toBeVisible();
  await expect(page.locator('.timer-time')).toContainText('00:02:');
  expect(calls.starts).toEqual([]);
});

test('failed lookup never offers or sends a new session start', async ({ page }) => {
  const calls = await fixtures(page, null, true);
  await page.goto(`/library/${DUNE}`);
  await expect(page.getByRole('button', { name: 'Session unavailable' })).toBeDisabled();
  await expect(page.getByRole('alert')).toContainText('Could not check your reading session');
  await page.goto(`/session/${DUNE}`);
  await expect(page.getByRole('alert')).toBeVisible();
  expect(calls.starts).toEqual([]);
});
