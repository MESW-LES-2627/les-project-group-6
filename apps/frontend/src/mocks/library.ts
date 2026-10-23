import aRoomOfOnesOwnCover from '@/assets/covers/a-room-of-ones-own.png';
import circeCover from '@/assets/covers/circe.png';
import emmaDetailCover from '@/assets/covers/emma-detail.png';
import emmaCover from '@/assets/covers/emma.png';
import piranesiCover from '@/assets/covers/piranesi.png';
import theMidnightLibraryCover from '@/assets/covers/the-midnight-library.png';
import theSecretHistoryCover from '@/assets/covers/the-secret-history.png';
import type { BookDetail, Library, LibraryBook } from '@/types/library';

// Mock data for the library prototype, matching the design reference.
// Replace it with the library API once those endpoints exist.

export const mockLibrary: Library = {
  total: 32,
  books: [
    {
      id: 'emma',
      title: 'Emma',
      author: 'Jane Austen',
      cover: emmaCover,
      detailCover: emmaDetailCover,
      status: 'in-progress',
      pages: 474,
      currentPage: 294,
      genre: 'Classics',
      summary: '294 / 474 pages • next chapter awaits',
      folderIds: ['autumn', 'club'],
      tagIds: ['borrowed'],
      chip: 'borrowed',
      updatedAt: '2026-10-21T18:40:00Z',
    },
    {
      id: 'the-midnight-library',
      title: 'The Midnight Library',
      author: 'Matt Haig',
      cover: theMidnightLibraryCover,
      status: 'not-started',
      pages: 304,
      currentPage: 0,
      genre: 'Literary fiction',
      summary: 'Ready when you are',
      folderIds: ['autumn'],
      tagIds: ['audiobook'],
      chip: 'Autumn reading',
      updatedAt: '2026-10-20T09:15:00Z',
    },
    {
      id: 'circe',
      title: 'Circe',
      author: 'Madeline Miller',
      cover: circeCover,
      status: 'finished',
      pages: 393,
      currentPage: 393,
      genre: 'Fantasy',
      summary: 'Read 1 time • ★★★★★',
      rating: 5,
      readCount: 1,
      folderIds: ['autumn', 'favorites'],
      tagIds: [],
      chip: 'Autumn reading',
      updatedAt: '2026-10-19T21:05:00Z',
    },
    {
      id: 'the-secret-history',
      title: 'The Secret History',
      author: 'Donna Tartt',
      cover: theSecretHistoryCover,
      status: 'did-not-finish',
      pages: 559,
      currentPage: 156,
      genre: 'Literary fiction',
      summary: 'Stopped at page 156 • not counted as finished',
      folderIds: ['autumn', 'club'],
      tagIds: [],
      chip: 'Autumn reading',
      updatedAt: '2026-10-18T14:30:00Z',
    },
    {
      id: 'a-room-of-ones-own',
      title: "A Room of One's Own",
      author: 'Virginia Woolf',
      cover: aRoomOfOnesOwnCover,
      status: 'finished',
      pages: 112,
      currentPage: 112,
      genre: 'Classics',
      summary: 'Read 2 times • ★★★★★',
      rating: 5,
      readCount: 2,
      folderIds: ['autumn', 'favorites', 'club'],
      tagIds: ['reread'],
      chip: 'reread',
      updatedAt: '2026-10-17T11:20:00Z',
    },
    {
      id: 'piranesi',
      title: 'Piranesi',
      author: 'Susanna Clarke',
      cover: piranesiCover,
      status: 'finished',
      pages: 272,
      currentPage: 272,
      genre: 'Fantasy',
      summary: 'Read 1 time • ★★★★★',
      rating: 5,
      readCount: 1,
      folderIds: ['autumn', 'favorites'],
      tagIds: [],
      chip: 'Autumn reading',
      updatedAt: '2026-10-16T20:10:00Z',
    },
  ],
  shelves: [
    { id: 'all', label: 'All books', count: 32 },
    { id: 'not-started', label: 'Not started', count: 10 },
    { id: 'in-progress', label: 'In progress', count: 2 },
    { id: 'finished', label: 'Finished', count: 18 },
    { id: 'did-not-finish', label: 'Did not finish', count: 2 },
  ],
  folders: [
    { id: 'autumn', name: 'Autumn reading', count: 6 },
    { id: 'favorites', name: 'All-time favorites', count: 8 },
    { id: 'club', name: 'Classics club', count: 4 },
  ],
  tags: [
    { id: 'borrowed', name: 'borrowed', count: 3 },
    { id: 'audiobook', name: 'audiobook', count: 5 },
    { id: 'reread', name: 'reread', count: 4 },
  ],
};

const emmaDetail: BookDetail = {
  tagline: 'Jane Austen • A comedy of manners, matchmaking, and learning to see clearly.',
  synopsis:
    "Beautiful, clever, and rich, Emma Woodhouse has very little to distress or vex her. Convinced that she understands the hearts of those around her, she takes up matchmaking with disastrous consequences. Austen's sparkling portrait of self-deception and affection finds its heroine learning that love rarely follows a plan.",
  readThroughLabel: 'First read-through',
  edition: {
    publishedYear: 1815,
    publisher: 'Penguin Classics',
    isbn: '9780141439587',
    genres: ['Classics', 'Romance'],
  },
  friends: [
    {
      id: 'maya',
      initials: 'ML',
      name: 'Maya Laurent',
      rating: 5,
      finishedLabel: 'Finished • 4 October',
      quote: 'The wit is wonderful, but the kindness underneath it is what stayed with me.',
    },
    {
      id: 'priya',
      initials: 'PS',
      name: 'Priya Shah',
      rating: 5,
      finishedLabel: 'Finished • 8 October',
      quote: "Emma's slow change of heart feels so beautifully human.",
    },
  ],
  friendCount: 3,
  publicRating: 4.2,
  publicRatingCount: 18426,
  publicReviews: [
    {
      id: 'amelia',
      initials: 'AR',
      name: 'Amelia R.',
      rating: 5,
      helpfulCount: 128,
      quote: 'A sharp, tender novel. Every reread reveals another perfectly observed detail.',
    },
  ],
  club: {
    name: 'Classics',
    monthLabel: 'October',
    memberCount: 6,
    deadlineLabel: '31 October',
  },
  thoughts: {
    rating: 4,
    comment: "Austen's observations feel as alive as ever. I'm loving the dialogue.",
    audience: 'friends',
  },
};

const mockBookDetails: Record<string, BookDetail> = {
  emma: emmaDetail,
};

/** Detail content for a book. Other books get a sensible fallback from the card data. */
export function getBookDetail(book: LibraryBook): BookDetail {
  return (
    mockBookDetails[book.id] ?? {
      tagline: `${book.author} • ${book.genre}`,
      synopsis: book.summary,
      readThroughLabel: 'First read-through',
      edition: {
        publishedYear: 2024,
        publisher: `${book.genre} edition`,
        isbn: 'Not recorded',
        genres: [book.genre],
      },
      friends: [],
      publicRating: book.rating ?? 0,
      publicRatingCount: 0,
      publicReviews: [],
      thoughts: {
        rating: book.rating ?? 0,
        comment: '',
        audience: 'friends',
      },
    }
  );
}
