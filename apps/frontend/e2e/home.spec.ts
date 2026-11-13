import { expect, test } from '@playwright/test';

test('home greets the reader and shows the week', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/home$/);
  await expect(page.getByRole('heading', { level: 1, name: /^Good morning, / })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'This week' })).toBeVisible();
});
