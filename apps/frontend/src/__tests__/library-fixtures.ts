import type { FolderSummary, LibraryBook, TagSummary } from '@/types/library';

// Library books for component and view tests (the app itself has no mock library).

const base = {
  folderIds: [] as string[],
  tagIds: [] as string[],
  updatedAt: '2026-11-01T00:00:00Z',
};

export const emma: LibraryBook = {
  ...base,
  id: 'emma',
  title: 'Emma',
  author: 'Jane Austen',
  cover: '/covers/emma.png',
  status: 'in-progress',
  pages: 474,
  currentPage: 294,
  summary: '294 / 474 pages • 62% complete',
  folderIds: ['autumn'],
  chip: 'Reading',
};

export const midnightLibrary: LibraryBook = {
  ...base,
  id: 'the-midnight-library',
  title: 'The Midnight Library',
  author: 'Matt Haig',
  cover: '',
  status: 'not-started',
  pages: 304,
  currentPage: 0,
  summary: 'Ready when you are',
  chip: 'To read',
};

export const circe: LibraryBook = {
  ...base,
  id: 'circe',
  title: 'Circe',
  author: 'Madeline Miller',
  cover: '',
  status: 'finished',
  pages: 393,
  currentPage: 393,
  summary: 'Finished • 393 pages',
  chip: 'Finished',
};

export const roomOfOnesOwn: LibraryBook = {
  ...circe,
  id: 'a-room-of-ones-own',
  title: "A Room of One's Own",
  author: 'Virginia Woolf',
  pages: 172,
  currentPage: 172,
  readCount: 2,
};

export const secretHistory: LibraryBook = {
  ...base,
  id: 'the-secret-history',
  title: 'The Secret History',
  author: 'Donna Tartt',
  cover: '',
  status: 'did-not-finish',
  pages: 559,
  currentPage: 156,
  summary: 'Stopped at page 156',
  chip: 'DNF',
};

export const libraryBooks = [emma, midnightLibrary, circe, roomOfOnesOwn, secretHistory];

export const libraryFolders: FolderSummary[] = [
  { id: 'autumn', name: 'Autumn reading', count: 1 },
  { id: 'favorites', name: 'All-time favorites', count: 0 },
  { id: 'club', name: 'Classics club', count: 0 },
];

export const libraryTags: TagSummary[] = [
  { id: 'borrowed', name: 'borrowed', count: 1 },
  { id: 'gift', name: 'gift', count: 0 },
];
