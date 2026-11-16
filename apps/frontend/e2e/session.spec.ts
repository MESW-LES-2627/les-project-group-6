// @req F-READ-01
import { expect, test } from '@playwright/test';
import { apiDelete, apiGet } from './api';
import { fixtureBook } from './env';

// The fixture book must already be "reading" on the test user's shelf: starting a session
// moves a not-started book to reading, and deleting the session does not move it back.
test('opening a session starts the timer on the book', async ({ page }) => {
  const book = fixtureBook();
  let sessionId: string | undefined;

  // A running session on another book makes the start fail; say so instead of a vague error.
  await page.goto('/home');
  const active = await apiGet<{ id: string; bookId: string }>(page, '/me/reading-sessions/active');
  expect(
    active === null || active.bookId === book.id,
    `the test user has a running session on another book (${active?.bookId}); finish it first`,
  ).toBe(true);

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
