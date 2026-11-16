// @req F-GRP-03
import { expect, test } from '@playwright/test';
import { fixtureGroup } from './env';

test('the group page shows the fixture group', async ({ page }) => {
  const group = fixtureGroup();
  await page.goto(`/groups/${group.id}`);
  await expect(page.getByRole('heading', { level: 1, name: group.name })).toBeVisible();
});
