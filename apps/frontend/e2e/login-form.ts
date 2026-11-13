import type { Page } from '@playwright/test';

/** Fills the login form and submits it. The page must already be on /login. */
export async function logIn(page: Page, email: string, password: string): Promise<void> {
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  // Without this the session lives in sessionStorage, which storageState does not save.
  await page.getByLabel('Keep me signed in').check();
  // The tab above the form is also a "Log in" button, so submit the form itself.
  await page.locator('form button[type="submit"]').click();
}
