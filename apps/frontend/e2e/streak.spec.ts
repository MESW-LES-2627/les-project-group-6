// @req F-READ-04 F-PROF-01
import { expect, test } from '@playwright/test';
import { apiGet, apiPut } from './api';
import { fixtureBook } from './env';

interface LibraryItem {
  book: { id: string; pageCount: number | null };
  status: string;
  currentPage: number;
}

// Logging 5+ pages on a book being read counts the day for the streak, so a reader who
// read away from the app keeps it. The page is restored afterwards; today stays counted
// for the test user, which is harmless (the streak only ever counts a day once).
test('logging 5 pages on a book being read counts today on the profile streak', async ({
  page,
}) => {
  const book = fixtureBook();
  await page.goto('/library');
  const library = (await apiGet<LibraryItem[]>(page, '/me/library')) ?? [];
  const entry = library.find((item) => item.book.id === book.id);
  expect(entry?.status, 'the fixture book must be on the shelf as reading').toBe('in-progress');
  const startPage = entry!.currentPage;
  const pageCount = entry!.book.pageCount ?? startPage + 10;
  // Move forward by 5, or back off first when the reader is near the end of the book.
  const from = Math.min(startPage, pageCount - 6);

  try {
    if (from !== startPage) {
      await apiPut(page, '/reading-status', {
        bookId: book.id,
        status: 'in-progress',
        currentPage: from,
      });
    }

    await page.goto(`/library/${book.id}`);
    await page.getByRole('button', { name: /Update status/ }).click();
    await page.getByRole('spinbutton').fill(String(from + 5));
    await page.getByRole('button', { name: 'Save status' }).click();
    await expect(page.getByText(`Page ${from + 5} of`)).toBeVisible();

    await page.goto('/profile');
    const streak = page.getByRole('region', { name: 'Streak' });
    await expect(streak.locator('.summary')).not.toContainText('No streak yet');
    await expect(streak.getByText(/, read, today$/)).toHaveCount(1);
  } finally {
    await apiPut(page, '/reading-status', {
      bookId: book.id,
      status: 'in-progress',
      currentPage: startPage,
    });
  }
});
