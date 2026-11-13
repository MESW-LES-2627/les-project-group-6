/** Where a book sits in the reader's library. */
export type ReadingStatus = 'not-started' | 'in-progress' | 'finished' | 'did-not-finish';

/** The shelf filter, including the unfiltered "All books" option. */
export type ShelfId = ReadingStatus | 'all';

export interface LibraryBook {
  id: string;
  title: string;
  author: string;
  /** Imported cover image URL. */
  cover: string;
  /** Portrait cover for the detail page; falls back to `cover`. */
  detailCover?: string;
  status: ReadingStatus;
  pages: number;
  /** Page the reader stopped at; 0 for a book that is not started. */
  currentPage: number;
  genre: string;
  /** Short line under the progress bar, for example "Ready when you are". */
  summary: string;
  /** 1 to 5, only for finished books. */
  rating?: number;
  /** How many times the reader finished the book. */
  readCount?: number;
  /** Folder ids the book belongs to. A book can live in several folders. */
  folderIds: string[];
  /** Tag ids attached to the book. */
  tagIds: string[];
  /** The folder or tag name shown in the card's pill. */
  chip: string;
  /** ISO datetime, used by the "Recently updated" sort. */
  updatedAt: string;
}

export interface Shelf {
  id: ShelfId;
  label: string;
  count: number;
}

export interface FolderSummary {
  id: string;
  name: string;
  count: number;
}

export interface TagSummary {
  id: string;
  name: string;
  count: number;
}

export interface Library {
  /** Total books in the library, including the ones not shown in the grid. */
  total: number;
  books: LibraryBook[];
  shelves: Shelf[];
  folders: FolderSummary[];
  tags: TagSummary[];
}

export type LibrarySort = 'recent' | 'title' | 'author';

export interface BookEdition {
  publishedYear: number;
  publisher: string;
  isbn: string;
  genres: string[];
}

export interface ReadingClubSummary {
  name: string;
  monthLabel: string;
  memberCount: number;
  deadlineLabel: string;
}

export interface BookDetail {
  tagline: string;
  synopsis: string;
  readThroughLabel: string;
  edition: BookEdition;
  club?: ReadingClubSummary;
}
