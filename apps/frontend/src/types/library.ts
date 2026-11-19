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
  /** Not served by the API yet; the genre filter only lists genres that books have. */
  genre?: string;
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
  /** False for a catalogue book the reader has not added yet (F-LIB-01). */
  inLibrary?: boolean;
  /** Day the reader started and finished the book (YYYY-MM-DD), when known. */
  startedOn?: string | null;
  finishedOn?: string | null;
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

/** Edition facts the catalogue knows; publisher, year and genres are not stored yet. */
export interface BookEdition {
  isbn: string | null;
}

/** The reader's book club whose current round reads this book. */
export interface ReadingClubSummary {
  groupId: string;
  name: string;
  roundLabel: string;
  memberCount: number;
  deadlineLabel: string;
}

export interface BookDetail {
  /** The authors, e.g. "Terry Pratchett, Neil Gaiman"; empty when unknown. */
  tagline: string;
  /** The catalogue description; empty when there is none. */
  synopsis: string;
  edition: BookEdition;
  club?: ReadingClubSummary;
}
