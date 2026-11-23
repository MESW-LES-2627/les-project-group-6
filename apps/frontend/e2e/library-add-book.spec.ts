// @req F-BOOK-02 F-EXP-01 F-LIB-01
import { expect, test, type Locator, type Page } from '@playwright/test';
import { apiDelete, apiGet, apiPut } from './api';
import { fixtureBook } from './env';

interface LibraryItem {
  book: { id: string; title: string };
  status: string;
  currentPage: number;
  startedOn: string | null;
  finishedOn: string | null;
}

async function openAddBook(page: Page): Promise<Locator> {
  // The modal marks books already on the shelf, so wait for the shelf request itself.
  await Promise.all([
    page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === '/api/me/library' && response.ok();
    }),
    page.goto('/library'),
  ]);
  await page.getByRole('button', { name: 'Add book' }).click();
  const dialog = page.getByRole('dialog', { name: 'Add a book' });
  await expect(dialog).toBeVisible();
  return dialog;
}

/** Searches from the modal and returns the "Books" results region. */
async function searchInModal(page: Page, dialog: Locator, title: string): Promise<Locator> {
  await dialog.getByRole('searchbox', { name: 'Search books' }).fill(title);
  await page.keyboard.press('Enter');
  const results = dialog.getByRole('region', { name: 'Books' });
  await expect(results).toBeVisible();
  return results;
}

/**
 * The first result row for the fixture book. The catalogue is searched first, so the
 * seeded book comes before any Open Library book that happens to share the title.
 */
function resultRow(results: Locator, title: string): Locator {
  return results.getByRole('listitem').filter({ hasText: title }).first();
}

test('the add-book modal searches the catalogue and marks books already on the shelf', async ({
  page,
}) => {
  const book = fixtureBook();
  const dialog = await openAddBook(page);
  const results = await searchInModal(page, dialog, book.title);

  const row = resultRow(results, book.title);
  await expect(row).toContainText(book.title);
  await expect(row.getByText('In your library')).toBeVisible();
  await expect(row.getByRole('button', { name: `Add ${book.title} to your library` })).toHaveCount(
    0,
  );

  // The manual form opens prefilled with what was searched.
  await results.getByRole('button', { name: 'Add this book' }).click();
  await expect(dialog.getByLabel('Title')).toHaveValue(book.title);

  await dialog.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toBeHidden();
});

// Adding an existing catalogue book is a shelf entry, so it can be undone: the fixture
// book is taken off the shelf, added again through the modal, and its status restored.
// A book no source knows is not created here: there is no delete route for books.
test('a reader searches the catalogue and adds a book to the shelf from the modal', async ({
  page,
}) => {
  const book = fixtureBook();
  await page.goto('/library');
  const library = (await apiGet<LibraryItem[]>(page, '/me/library')) ?? [];
  const entry = library.find((item) => item.book.id === book.id);
  expect(entry, 'the fixture book must be on the shelf').toBeTruthy();

  const original = {
    status: entry!.status,
    currentPage: entry!.currentPage,
    startedOn: entry!.startedOn ?? null,
    finishedOn: entry!.finishedOn ?? null,
  };
  const card = page
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name: book.title }) });
  let removed = false;

  try {
    await apiDelete(page, `/me/library/${book.id}`);
    removed = true;

    const dialog = await openAddBook(page);
    await expect(card).toHaveCount(0);

    const results = await searchInModal(page, dialog, book.title);
    await resultRow(results, book.title)
      .getByRole('button', { name: `Add ${book.title} to your library` })
      .click();

    await expect(dialog).toBeHidden();
    await expect(card).toBeVisible();
    await expect(card).toContainText('Not started');

    // It survives a reload, so it was saved on the server.
    await page.reload();
    await expect(card).toBeVisible();
  } finally {
    if (removed) {
      await apiPut(page, '/reading-status', { bookId: book.id, ...original });
    }
  }
});
