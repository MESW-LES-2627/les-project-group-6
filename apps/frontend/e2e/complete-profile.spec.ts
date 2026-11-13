import { expect, test } from '@playwright/test';
import pg from 'pg';
import { profilelessUser, required } from './env';
import { logIn } from './login-form';

test.use({ storageState: { cookies: [], origins: [] } });

/** No API deletes a profile, so the users row is removed directly to keep the account profile-less. */
async function removeProfile(email: string): Promise<void> {
  const client = new pg.Client({ connectionString: required('DATABASE_URL') });
  await client.connect();
  try {
    await client.query('DELETE FROM users WHERE email = $1', [email]);
  } finally {
    await client.end();
  }
}

test('a new account finishes its profile and reaches home', async ({ page }) => {
  const { email, password } = profilelessUser();
  await removeProfile(email); // a previous failed run may have left one
  try {
    await page.goto('/login');
    await logIn(page, email, password);
    await expect(page).toHaveURL(/\/complete-profile$/);

    const username = `e2e${Date.now().toString(36)}`;
    await page.locator('#profile-name').fill('E2E Profileless');
    await page.locator('#profile-username').fill(username);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/\/home$/);
  } finally {
    await removeProfile(email);
  }
});
