import { expect, test as setup } from '@playwright/test';
import { testUser } from './env';
import { logIn } from './login-form';

const STATE = 'e2e/.auth/user.json';

setup('log in as the test user', async ({ page }) => {
  const { email, password } = testUser();
  await page.goto('/login');
  await logIn(page, email, password);
  await expect(page, 'login failed: check E2E_USER_* and the Supabase project').toHaveURL(
    /\/home$/,
  );
  await page.context().storageState({ path: STATE });
});
