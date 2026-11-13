import { expect, test } from '@playwright/test';
import { fixtureBook } from './env';

test('the library lists and finds the fixture book', async ({ page }) => {
  const book = fixtureBook();
  await page.goto('/library');
  await expect(page.getByRole('heading', { level: 1, name: 'Library' })).toBeVisible();

  await page.getByPlaceholder('Title, author or ISBN').fill(book.title);
  await expect(page.getByText(book.title).first()).toBeVisible();
});
