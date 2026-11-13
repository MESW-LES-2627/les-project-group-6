import { expect, type Page } from '@playwright/test';

/** The Supabase access token the app stored for the signed-in user. */
export async function accessToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
    for (const store of [localStorage, sessionStorage]) {
      for (let i = 0; i < store.length; i++) {
        const key = store.key(i);
        if (key && /^sb-.+-auth-token$/.test(key)) {
          return (JSON.parse(store.getItem(key) ?? '{}') as { access_token?: string }).access_token;
        }
      }
    }
    return undefined;
  });
  if (!token) throw new Error('No Supabase session in the page; is the user signed in?');
  return token;
}

/** Calls DELETE on the API as the signed-in user (teardown only). 404 counts as already gone. */
export async function apiDelete(page: Page, path: string): Promise<void> {
  const response = await page.request.delete(`/api${path}`, {
    headers: { Authorization: `Bearer ${await accessToken(page)}` },
  });
  expect([200, 204, 404], `DELETE ${path} returned ${response.status()}`).toContain(
    response.status(),
  );
}
