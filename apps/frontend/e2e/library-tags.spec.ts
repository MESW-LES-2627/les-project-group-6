// @req F-LIB-04
import { expect, test, type Locator, type Page } from '@playwright/test';
import { apiDelete, apiGet } from './api';
import { fixtureBook } from './env';

interface Tag {
  id: string;
  name: string;
  count: number;
}

// A chip's text also holds its remove button's "×", so find a chip by that button's exact name.
const chip = (chips: Locator, name: string) =>
  chips.getByRole('button', { name: `Remove tag ${name}`, exact: true });

// A unique name so a failed earlier run, or a real tag of the test user, never collides.
const uniqueTag = (label: string) => `e2e ${label} ${Date.now()}`;

/** Removes the named tags from the fixture book; the API drops a tag left on no book. */
async function untagAll(page: Page, bookId: string, names: string[]) {
  const tags = (await apiGet<Tag[]>(page, '/me/library/tags')) ?? [];
  for (const tag of tags.filter((t) => names.includes(t.name))) {
    await apiDelete(page, `/me/library/books/${bookId}/tags/${tag.id}`);
  }
}

test('a reader tags a book, filters the library by it and removes it', async ({ page }) => {
  const book = fixtureBook();
  const tag = uniqueTag('audiobook');

  try {
    await page.goto(`/library/${book.id}`);
    await expect(page.getByRole('heading', { level: 1, name: book.title })).toBeVisible();

    // Typed in mixed case: the tag is stored and shown in lower case.
    // The field suggests the reader's existing tags (a datalist), so its role is combobox.
    await page.getByRole('combobox', { name: 'New tag' }).fill(tag.toUpperCase());
    await page.getByRole('button', { name: 'Add tag' }).click();
    const chips = page.getByRole('list', { name: 'Tags on this book' });
    await expect(chip(chips, tag)).toBeVisible();

    // The tag survives a reload, so it was saved on the server.
    await page.reload();
    await expect(chip(chips, tag)).toBeVisible();

    // The library sidebar lists the tag with one book, and selecting it filters the grid.
    await page.goto('/library');
    const sidebarTags = page.getByRole('region', { name: 'Tags' });
    const tagButton = sidebarTags.getByRole('button', { name: tag });
    await expect(tagButton).toHaveText(`${tag} · 1`);
    await tagButton.click();
    await expect(tagButton).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(page.getByRole('article')).toContainText(book.title);

    // Removing the tag keeps the book in the library and drops the empty tag from the sidebar.
    await page.goto(`/library/${book.id}`);
    await page.getByRole('button', { name: `Remove tag ${tag}` }).click();
    await expect(page.getByRole('button', { name: `Remove tag ${tag}` })).toHaveCount(0);

    await page.goto('/library');
    await expect(
      page.getByRole('region', { name: 'Tags' }).getByRole('button', { name: tag }),
    ).toHaveCount(0);
    await page.getByPlaceholder('Title, author or ISBN').fill(book.title);
    await expect(page.getByText(book.title).first()).toBeVisible();
  } finally {
    await untagAll(page, book.id, [tag]);
  }
});

test('a book can carry several tags at once', async ({ page }) => {
  const book = fixtureBook();
  const borrowed = uniqueTag('borrowed');
  const reread = uniqueTag('reread');

  try {
    await page.goto(`/library/${book.id}`);
    const input = page.getByRole('combobox', { name: 'New tag' });
    const chips = page.getByRole('list', { name: 'Tags on this book' });

    for (const name of [borrowed, reread]) {
      await input.fill(name);
      await page.getByRole('button', { name: 'Add tag' }).click();
      await expect(chip(chips, name)).toBeVisible();
    }

    // Adding a tag the book already has is refused before reaching the API.
    await input.fill(borrowed);
    await page.getByRole('button', { name: 'Add tag' }).click();
    await expect(page.getByRole('alert')).toHaveText(`This book already has the tag "${borrowed}"`);

    const tags = (await apiGet<Tag[]>(page, '/me/library/tags')) ?? [];
    expect(tags.filter((t) => [borrowed, reread].includes(t.name))).toHaveLength(2);
  } finally {
    await untagAll(page, book.id, [borrowed, reread]);
  }
});
