// @req F-PROF-01
import { expect, test } from '@playwright/test';

test('the profile shows the reader name', async ({ page }) => {
  await page.goto('/profile');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('');
});
