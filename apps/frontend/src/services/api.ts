import type { LibraryBook, ReadingStatus } from '@/types/library';

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

export const DEMO_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

export interface ApiBook {
  id: string;
  title: string;
  description: string | null;
  isbn13: string | null;
  pageCount: number;
  coverUrl: string | null;
  isCommunityAdded?: boolean;
  createdAt?: string;
}

export interface ApiLibraryItem {
  id: string;
  book: ApiBook;
  status: ReadingStatus;
  currentPage: number;
  updatedAt: string;
}

const KNOWN_AUTHORS: Record<string, string> = {
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01': 'Jane Austen',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02': 'Matt Haig',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03': 'Madeline Miller',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04': 'Donna Tartt',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05': 'Virginia Woolf',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a06': 'Susanna Clarke',
};

const KNOWN_GENRES: Record<string, string> = {
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01': 'Classics',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02': 'Literary fiction',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a03': 'Fantasy',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a04': 'Dark academia',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a05': 'Essays',
  'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a06': 'Fantasy',
};

export function mapApiLibraryItemToBook(item: ApiLibraryItem): LibraryBook {
  const book = item.book;
  const author = KNOWN_AUTHORS[book.id] ?? 'Unknown Author';
  const genre = KNOWN_GENRES[book.id] ?? 'General';
  const pages = book.pageCount || 1;
  const currentPage = item.currentPage || 0;
  const percent = Math.round((currentPage / pages) * 100);

  let summary = '';
  if (item.status === 'not-started') {
    summary = 'Ready when you are';
  } else if (item.status === 'in-progress') {
    summary = `${currentPage} / ${pages} pages • ${percent}% complete`;
  } else if (item.status === 'finished') {
    summary = `Read 1 time • ★★★★★`;
  } else {
    summary = `Stopped at page ${currentPage}`;
  }

  const chip =
    item.status === 'not-started'
      ? 'To read'
      : item.status === 'in-progress'
        ? 'Reading'
        : item.status === 'finished'
          ? 'Finished'
          : 'DNF';

  return {
    id: book.id,
    title: book.title,
    author,
    cover: book.coverUrl || '/placeholder-cover.png',
    detailCover: book.coverUrl || undefined,
    status: item.status,
    pages,
    currentPage,
    genre,
    summary,
    folderIds: [],
    tagIds: [],
    chip,
    updatedAt: item.updatedAt,
  };
}

export function mapApiBookToLibraryBook(
  book: ApiBook,
  status: ReadingStatus = 'not-started',
  currentPage = 0,
): LibraryBook {
  return mapApiLibraryItemToBook({
    id: book.id,
    book,
    status,
    currentPage,
    updatedAt: book.createdAt || new Date().toISOString(),
  });
}

export async function getHealth(): Promise<string> {
  const response = await fetch(`${baseUrl}/health`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const body: unknown = await response.json();
  if (
    typeof body !== 'object' ||
    body === null ||
    !('status' in body) ||
    typeof body.status !== 'string'
  ) {
    throw new Error('Invalid health response');
  }

  return body.status;
}

export async function getUserLibrary(
  userId: string = DEMO_USER_ID,
  statusFilter?: ReadingStatus,
): Promise<ApiLibraryItem[]> {
  const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
  const response = await fetch(`${baseUrl}/user/${encodeURIComponent(userId)}/library${query}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to load user library: HTTP ${response.status}`);
  }

  return response.json() as Promise<ApiLibraryItem[]>;
}

export async function getBook(bookId: string): Promise<ApiBook> {
  const response = await fetch(`${baseUrl}/book/${encodeURIComponent(bookId)}`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to load book: HTTP ${response.status}`);
  }

  return response.json() as Promise<ApiBook>;
}

export async function updateReadingStatus(payload: {
  userId?: string;
  bookId: string;
  status: ReadingStatus;
  currentPage?: number;
}): Promise<unknown> {
  const response = await fetch(`${baseUrl}/reading-status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      userId: payload.userId || DEMO_USER_ID,
      bookId: payload.bookId,
      status: payload.status,
      currentPage: payload.currentPage ?? 0,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to update reading status: HTTP ${response.status}`);
  }

  return response.json();
}
