import { expect, test } from '@playwright/test';
import { fixtureBook } from './env';

test('explore search finds a seeded book', async ({ page }) => {
  const book = fixtureBook();
  await page.goto('/explore');
  await expect(page.getByRole('heading', { name: 'Follow your curiosity.' })).toBeVisible();

  await page.getByPlaceholder('Try “hary poter” or an ISBN').fill(book.title);
  await page.keyboard.press('Enter');
  // Only the seeded book is asserted; Open Library results may also appear.
  await expect(page.getByRole('link', { name: `View ${book.title}` }).first()).toBeVisible();
});
