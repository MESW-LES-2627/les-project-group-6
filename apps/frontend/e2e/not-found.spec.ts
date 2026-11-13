import { expect, test } from '@playwright/test';

test('an unknown path shows the not-found page', async ({ page }) => {
  await page.goto('/this-page-does-not-exist');
  await expect(page.getByRole('heading', { name: 'Page Not Found' })).toBeVisible();
});
