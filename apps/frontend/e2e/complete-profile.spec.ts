// @req F-AUTH-01
import { expect, test } from '@playwright/test';
import pg from 'pg';
import { profilelessUser, required, testUser } from './env';
import { logIn } from './login-form';

test.use({ storageState: { cookies: [], origins: [] } });

const DISPLAY_NAME = 'E2E Profileless';

/**
 * No API deletes a profile, so the users row is removed directly to keep the account
 * profile-less. Deleting a user cascades to all its data, so this only removes a row this
 * test created (e2e username, e2e display name) and refuses anything else.
 */
async function removeProfile(email: string): Promise<void> {
  if (email.toLowerCase() === testUser().email.toLowerCase()) {
    throw new Error('E2E_PROFILELESS_EMAIL must not be the main test user');
  }
  const client = new pg.Client({ connectionString: required('DATABASE_URL') });
  await client.connect();
  try {
    const { rows } = await client.query<{ username: string; display_name: string }>(
      'SELECT username, display_name FROM users WHERE email = $1',
      [email],
    );
    if (rows.length === 0) return;
    const [row] = rows;
    if (rows.length > 1 || !row?.username.startsWith('e2e') || row.display_name !== DISPLAY_NAME) {
      throw new Error(`refusing to delete ${email}: its profile was not created by this test`);
    }
    await client.query(
      "DELETE FROM users WHERE email = $1 AND username LIKE 'e2e%' AND display_name = $2",
      [email, DISPLAY_NAME],
    );
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
    await page.locator('#profile-name').fill(DISPLAY_NAME);
    await page.locator('#profile-username').fill(username);
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page).toHaveURL(/\/home$/);
  } finally {
    await removeProfile(email);
  }
});
