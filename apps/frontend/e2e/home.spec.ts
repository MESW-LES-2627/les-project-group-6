// @req F-HOME-01
import { expect, test } from '@playwright/test';

test('home greets the reader and shows the week', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/home$/);
  // The greeting follows the time of day and the signed-in reader's name.
  await expect(
    page.getByRole('heading', { level: 1, name: /^Good (morning|afternoon|evening), / }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'This week' })).toBeVisible();
});
