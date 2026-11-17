// @req F-GRP-01
import { expect, test } from '@playwright/test';

test('the new-group form previews the name without creating a group', async ({ page }) => {
  await page.goto('/groups/new');
  await expect(
    page.getByRole('heading', { level: 1, name: 'Start something worth reading for.' }),
  ).toBeVisible();

  // The form starts with no name, which previews as "Untitled group".
  const preview = page.getByRole('complementary', { name: 'Preview' });
  await expect(page.locator('#group-name')).toHaveValue('');
  await expect(preview.getByText('Untitled group')).toBeVisible();

  await page.locator('#group-name').fill('E2E preview only');
  await expect(preview.getByText('E2E preview only')).toBeVisible();
});
