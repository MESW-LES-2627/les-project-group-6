import { expect, test } from '@playwright/test';
import { fixtureBook } from './env';

test('explore search finds a seeded book', async ({ page }) => {
  const book = fixtureBook();
  await page.goto('/explore');
  await expect(page.getByRole('heading', { name: 'Follow your curiosity.' })).toBeVisible();

  await page.getByPlaceholder('Try “hary poter” or an ISBN').fill(book.title);
  await page.keyboard.press('Enter');
  // Only the seeded book is asserted; Open Library results may also appear.
  // Scoped to the results: trending cards use the same "View <title>" link.
  const results = page.getByRole('region', { name: 'Books' });
  await expect(results.getByRole('link', { name: `View ${book.title}` }).first()).toBeVisible();
});
