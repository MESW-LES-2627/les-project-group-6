// @req F-BOOK-01
import { expect, test } from '@playwright/test';
import { fixtureBook } from './env';

test('the book page shows the fixture book', async ({ page }) => {
  const book = fixtureBook();
  await page.goto(`/library/${book.id}`);
  await expect(page.getByRole('heading', { level: 1, name: book.title })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'About this book' })).toBeVisible();
});
