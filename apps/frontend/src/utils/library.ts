import type { LibraryBook, LibrarySort, ReadingStatus } from '@/types/library';

export const readingStatusLabels: Record<ReadingStatus, string> = {
  'not-started': 'Not started',
  'in-progress': 'In progress',
  finished: 'Finished',
  'did-not-finish': 'Did not finish',
};

/** Reading progress as a whole percentage, clamped to 0–100. */
export function progressPercent({ currentPage, pages }: LibraryBook): number {
  if (pages <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((currentPage / pages) * 100)));
}

/** Sort a copy of the list for the "Sort" control. */
export function sortBooks(books: LibraryBook[], sort: LibrarySort): LibraryBook[] {
  return [...books].sort((a, b) => {
    if (sort === 'title') return a.title.localeCompare(b.title);
    if (sort === 'author') return a.author.localeCompare(b.author);
    return b.updatedAt.localeCompare(a.updatedAt);
  });
}
