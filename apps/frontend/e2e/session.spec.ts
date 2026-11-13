import { expect, test } from '@playwright/test';
import { apiDelete } from './api';
import { fixtureBook } from './env';

test('opening a session starts the timer on the book', async ({ page }) => {
  const book = fixtureBook();
  let sessionId: string | undefined;

  try {
    const started = page.waitForResponse(
      (r) => r.url().endsWith('/api/reading-sessions') && r.request().method() === 'POST',
    );
    await page.goto(`/session/${book.id}`);
    const response = await started;
    expect(response.ok()).toBe(true);
    sessionId = ((await response.json()) as { id: string }).id;

    await expect(
      page.getByRole('heading', { level: 1, name: 'Just you and the next chapter.' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: book.title })).toBeVisible();
  } finally {
    if (sessionId) await apiDelete(page, `/reading-sessions/${sessionId}`);
  }
});
