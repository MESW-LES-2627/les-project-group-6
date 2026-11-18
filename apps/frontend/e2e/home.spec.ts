import { expect, test } from '@playwright/test';
import { apiGet } from './api';

interface ApiLibraryItem {
  id: string;
  status: string;
  currentPage: number;
  updatedAt: string;
  book: { id: string; title: string; pageCount: number };
}

interface ApiActiveSession {
  id: string;
  bookId: string;
}

interface ApiGroup {
  id: string;
  name: string;
  status: string;
}

interface ApiBookClub {
  id: string;
  name: string;
  round: { outcome: string };
}

test('home greets the reader and shows the week', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('heading', { level: 1, name: /^Good morning, / })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'This week' })).toBeVisible();
});

test('home shows the book in progress and links it to a session', async ({ page }) => {
  await page.goto('/home');

  const library = (await apiGet<ApiLibraryItem[]>(page, '/me/library')) ?? [];
  const active = await apiGet<ApiActiveSession>(page, '/me/reading-sessions/active');

  const inProgress = library
    .filter((item) => item.status === 'in-progress')
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  const hero =
    (active ? inProgress.find((item) => item.book.id === active.bookId) : undefined) ??
    inProgress[0];

  expect(hero, 'the test user needs a book in progress (see e2e/README.md)').toBeTruthy();
  const book = hero!.book;

  // The running session wins; otherwise the most recently updated book is the hero.
  await expect(page.locator('#bedside-title')).toHaveText(book.title);
  await expect(page.getByText(`Page ${hero!.currentPage} of ${book.pageCount}`)).toBeVisible();
  await expect(page.locator('.bedside-actions .button')).toHaveAttribute(
    'href',
    `/session/${book.id}`,
  );
});

test('home loads every section without an error', async ({ page }) => {
  await page.goto('/home');

  for (const name of ['Your groups', 'From your circle', 'Reading now', 'Waiting for you']) {
    await expect(page.getByRole('heading', { name })).toBeVisible();
  }

  // A failing request shows its own alert; the happy path has none.
  await expect(page.locator('[role="alert"]')).toHaveCount(0);

  // The groups section renders the active groups the API returns, or its empty message.
  const groups = (await apiGet<ApiGroup[]>(page, '/me/groups')) ?? [];
  const clubs = (await apiGet<ApiBookClub[]>(page, '/me/book-clubs')) ?? [];
  const activeGroups = groups.filter((group) => group.status === 'active');
  const activeClubs = clubs.filter((club) => club.round.outcome === 'active');

  if (activeGroups.length > 0) {
    await expect(page.getByText(activeGroups[0]!.name).first()).toBeVisible();
  } else if (activeClubs.length > 0) {
    await expect(page.getByText(activeClubs[0]!.name).first()).toBeVisible();
  } else {
    await expect(page.getByText('No active challenges or book clubs yet.')).toBeVisible();
  }
});

test('home shows section skeletons while the API replies', async ({ page }) => {
  // Hold every Home request so the loading state is observable, then let it through.
  await page.route('**/api/me/**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });

  await page.goto('/home');

  await expect(page.locator('.skeleton').first()).toBeVisible();
  await expect(page.getByText('Your library is empty')).toHaveCount(0);
  await expect(page.getByText('No pending invites.')).toHaveCount(0);

  // Once the requests finish, the empty/content states replace the skeletons.
  await expect(page.locator('.skeleton')).toHaveCount(0, { timeout: 10_000 });
  await expect(page.locator('[role="alert"]')).toHaveCount(0);
});
