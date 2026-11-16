// @req F-GRP-01
import { expect, test } from '@playwright/test';
import { fixtureGroup } from './env';

test('groups lists the fixture group', async ({ page }) => {
  const group = fixtureGroup();
  await page.goto('/groups');
  await expect(page.getByRole('heading', { level: 1, name: 'Groups' })).toBeVisible();
  await expect(page.getByText(group.name).first()).toBeVisible();
});
