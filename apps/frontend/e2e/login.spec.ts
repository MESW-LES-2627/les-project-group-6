import { expect, test } from '@playwright/test';
import { testUser } from './env';
import { logIn } from './login-form';

// Start signed out, ignoring the shared session.
test.use({ storageState: { cookies: [], origins: [] } });

test('a signed-out visit is sent to login and comes back after signing in', async ({ page }) => {
  await page.goto('/library');
  await expect(page).toHaveURL(/\/login\?redirect=%2Flibrary$/);
  await expect(page.getByRole('heading', { name: 'Welcome to Bookmarked' })).toBeVisible();

  const { email, password } = testUser();
  await logIn(page, email, password);
  await expect(page).toHaveURL(/\/library$/);
});
