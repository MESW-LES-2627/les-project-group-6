import {
  authorLine,
  type ApiBook,
  type ApiChallengeGroupDetail,
  type ApiLibraryItem,
  type ApiMe,
} from '@/services/api';
import type { FolderSummary } from '@/types/library';
import type {
  Book,
  CoverMotif,
  CoverStyle,
  Folder,
  ProfileUser,
  ReadingProgress,
  Spine,
} from '@/types/profile';
import { initialsOf } from '@/utils/groups';

// Brand palette pairs (background, ink, accent) for books without a cover image.
const COVER_PALETTES: [string, string, string][] = [
  ['#6f1d1b', '#ffe6a7', '#bb9457'],
  ['#432818', '#ffe6a7', '#99582a'],
  ['#99582a', '#ffe6a7', '#432818'],
  ['#bb9457', '#432818', '#6f1d1b'],
  ['#ffe6a7', '#432818', '#6f1d1b'],
];
const MOTIFS: CoverMotif[] = ['frame', 'band', 'disc', 'block'];

/** A small stable hash, so the same book always gets the same generated cover. */
function hashOf(text: string): number {
  let hash = 0;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

/** The generated cover drawn when a book has no image: always the same for one book. */
export function generatedCover(bookId: string): CoverStyle {
  const hash = hashOf(bookId);
  const [background, ink, accent] = COVER_PALETTES[hash % COVER_PALETTES.length]!;
  return { background, ink, accent, motif: MOTIFS[hash % MOTIFS.length]! };
}

export function toProfileBook(book: ApiBook): Book {
  return {
    id: book.id,
    title: book.title,
    author: authorLine(book.authors),
    cover: generatedCover(book.id),
    coverUrl: book.coverUrl,
  };
}

/** The signed-in reader's bookplate. Genres are not stored yet, so none are listed. */
export function toProfileUser(me: ApiMe, bio: string | null = null): ProfileUser {
  return {
    name: me.displayName,
    initials: initialsOf(me.displayName),
    handle: me.username,
    memberSince: me.createdAt.slice(0, 10),
    bio: bio ?? undefined,
    genres: [],
    privacy: me.profileVisibility === 'public' ? 'public' : 'private',
  };
}

const newestFirst = (a: ApiLibraryItem, b: ApiLibraryItem) =>
  b.updatedAt.localeCompare(a.updatedAt);

/** Books in progress, the one read most recently first. */
export function currentlyReadingFrom(library: readonly ApiLibraryItem[]): ReadingProgress[] {
  return library
    .filter((item) => item.status === 'in-progress')
    .sort(newestFirst)
    .map((item) => ({
      book: toProfileBook(item.book),
      page: item.currentPage,
      pages: item.book.pageCount || 1,
    }));
}

/**
 * Finished books as spines: thicker for longer books (22–48 px), with a height that
 * varies by book (156–198 px) so the shelf does not look like a bar chart.
 */
export function shelfFrom(library: readonly ApiLibraryItem[]): Spine[] {
  return library
    .filter((item) => item.status === 'finished')
    .sort(newestFirst)
    .map((item) => {
      const pages = item.book.pageCount ?? 300;
      return {
        book: toProfileBook(item.book),
        width: Math.round(Math.min(48, Math.max(22, 22 + (pages - 150) / 25))),
        height: 156 + (hashOf(item.book.id) % 43),
      };
    });
}

/** The books touched most recently in the library (the API has no "date added" yet). */
export function recentlyAddedFrom(library: readonly ApiLibraryItem[], limit = 6): Book[] {
  return [...library]
    .sort(newestFirst)
    .slice(0, limit)
    .map((item) => toProfileBook(item.book));
}

/** The reader's folders with up to three of their books as the cover preview. */
export function foldersFrom(
  folders: readonly FolderSummary[],
  library: readonly ApiLibraryItem[],
): Folder[] {
  return folders.map((folder) => {
    const books = library.filter((item) => item.folderIds?.includes(folder.id));
    return {
      id: folder.id,
      name: folder.name,
      bookCount: books.length,
      previewBooks: books
        .sort(newestFirst)
        .slice(0, 3)
        .map((item) => toProfileBook(item.book)),
    };
  });
}

/**
 * True when the reader won this finished challenge (#124): they hold the top score and it
 * is above zero. Every reader tied on the top score is a winner.
 */
export function wonChallenge(group: ApiChallengeGroupDetail, userId: string): boolean {
  if (group.status !== 'completed') return false;
  const top = Math.max(0, ...group.standings.map((s) => s.score ?? 0));
  if (top === 0) return false;
  return group.standings.some((s) => s.userId === userId && s.score === top);
}
