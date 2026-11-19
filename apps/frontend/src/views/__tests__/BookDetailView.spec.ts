// @req F-BOOK-01 F-EXP-02 F-LIB-03 F-LIB-04
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import router from '@/router';
import type {
  ApiBook,
  ApiBookClub,
  ApiBookReviews,
  ApiLibraryItem,
  ApiReview,
} from '@/services/api';
import type { TagSummary } from '@/types/library';
import BookDetailView from '../BookDetailView.vue';

const api = vi.hoisted(() => ({
  getBookReviews: vi.fn<(bookId: string) => Promise<ApiBookReviews>>(),
  getUserLibrary: vi.fn<() => Promise<ApiLibraryItem[]>>(),
  getUserBookClubs: vi.fn<() => Promise<ApiBookClub[]>>(),
  getBook: vi.fn<(bookId: string) => Promise<ApiBook>>(),
  getLibraryFolders: vi.fn<() => Promise<unknown>>(),
  getLibraryTags: vi.fn<() => Promise<TagSummary[]>>(),
  tagBook: vi.fn<(bookId: string, name: string) => Promise<TagSummary>>(),
  untagBook: vi.fn<(bookId: string, tagId: string) => Promise<void>>(),
  addBookToFolder: vi.fn<(folderId: string, bookId: string) => Promise<void>>(),
  removeBookFromFolder: vi.fn<(folderId: string, bookId: string) => Promise<void>>(),
  updateReadingStatus: vi.fn<(payload: unknown) => Promise<void>>(async () => {}),
}));
vi.mock('@/services/api', async (original) => ({
  ...(await original<typeof import('@/services/api')>()),
  ...api,
}));

const book = (id: string, title: string, overrides: Partial<ApiBook> = {}): ApiBook => ({
  id,
  title,
  authors: [],
  description: null,
  isbn13: null,
  pageCount: 474,
  coverUrl: null,
  ...overrides,
});

const EMMA = book('emma', 'Emma', {
  authors: ['Jane Austen'],
  description: 'Emma Woodhouse takes up matchmaking.',
  isbn13: '9780141439587',
});
const CIRCE = book('circe', 'Circe', { pageCount: 393 });

const LIBRARY: ApiLibraryItem[] = [
  {
    id: 'li-emma',
    book: EMMA,
    status: 'in-progress',
    currentPage: 294,
    updatedAt: '2026-11-10T00:00:00Z',
    folderIds: ['autumn', 'club'],
    tagIds: [],
  },
  {
    id: 'li-circe',
    book: CIRCE,
    status: 'finished',
    currentPage: 393,
    updatedAt: '2026-11-01T00:00:00Z',
    folderIds: [],
    tagIds: [],
  },
];

const CLASSICS: ApiBookClub = {
  id: 'classics',
  name: 'Classics',
  description: '',
  adminId: 'u1',
  members: [
    { userId: 'u1', role: 'admin', joinedAt: '2026-10-01T00:00:00Z' },
    { userId: 'u2', role: 'member', joinedAt: '2026-10-01T00:00:00Z' },
  ],
  round: {
    id: 'r1',
    number: 1,
    startDate: '2026-11-01',
    deadline: '2026-11-30',
    outcome: 'active',
    finished: 0,
    expected: 2,
    daysLeft: 13,
    book: { id: 'emma', title: 'Emma', authors: ['Jane Austen'], pageCount: 474, coverUrl: null },
  },
  createdAt: '2026-10-01T00:00:00Z',
};

const review = (id: string, name: string, rating: number, comment: string | null): ApiReview => ({
  id,
  bookId: 'emma',
  rating,
  comment,
  createdAt: '2026-11-01T00:00:00Z',
  updatedAt: '2026-11-02T12:00:00Z',
  author: { id: `u-${id}`, username: name.toLowerCase(), displayName: name, photoUrl: null },
});

const noReviews: ApiBookReviews = {
  mine: null,
  friends: [],
  publicReviews: [],
  publicAverage: null,
  publicCount: 0,
};

async function mountView(bookId = 'emma') {
  const wrapper = mount(BookDetailView, { props: { bookId }, global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  api.getUserLibrary.mockResolvedValue(LIBRARY);
  api.getUserBookClubs.mockResolvedValue([CLASSICS]);
  api.getBook.mockRejectedValue(new Error('Book not found'));
  api.getLibraryFolders.mockResolvedValue([
    { id: 'autumn', name: 'Autumn reading', count: 1 },
    { id: 'favorites', name: 'All-time favorites', count: 0 },
    { id: 'club', name: 'Classics club', count: 1 },
  ]);
  api.getLibraryTags.mockResolvedValue([]);
  api.tagBook.mockImplementation(async (_bookId, name) => ({
    id: 'tag-new',
    name: name.trim().toLowerCase(),
    count: 1,
  }));
  api.untagBook.mockResolvedValue(undefined);
  api.addBookToFolder.mockResolvedValue(undefined);
  api.removeBookFromFolder.mockResolvedValue(undefined);
});

describe('BookDetailView', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the authors, reading progress, edition, description and club from the API', async () => {
    api.getBookReviews.mockRejectedValueOnce(new Error('offline'));
    const wrapper = await mountView();

    expect(wrapper.get('h1').text()).toBe('Emma');
    expect(wrapper.get('.subtitle').text()).toBe('Jane Austen');
    expect(wrapper.get('.reading-panel').text()).toContain('Page 294 of 474 • 62% complete');
    expect(wrapper.get('.start-session').attributes('href')).toBe('/session/emma');
    expect(wrapper.get('.edition-panel').text()).toContain('474 pages');
    expect(wrapper.get('.edition-panel').text()).toContain('ISBN 9780141439587');
    expect(wrapper.get('.synopsis').text()).toBe('Emma Woodhouse takes up matchmaking.');
    expect(wrapper.get('.club-panel').text()).toContain('Classics • Round 1');
    expect(wrapper.get('.club-panel').text()).toContain('2 members');
    expect(wrapper.get('.club-link').attributes('href')).toBe('/groups/classics');
  });

  it('invents nothing the catalogue does not have', async () => {
    api.getBookReviews.mockResolvedValueOnce(noReviews);
    const wrapper = await mountView('circe');

    expect(wrapper.find('.subtitle').exists()).toBe(false);
    expect(wrapper.get('.about-section').text()).toContain('No description yet.');
    expect(wrapper.get('.edition-panel').text()).not.toContain('ISBN');
    expect(wrapper.get('.edition-panel').text()).not.toContain('Published');
    expect(wrapper.find('.club-panel').exists()).toBe(false);
  });

  it('loads a book that is not in the library from the catalogue', async () => {
    api.getBookReviews.mockResolvedValueOnce(noReviews);
    api.getBook.mockResolvedValueOnce(book('dune', 'Dune', { authors: ['Frank Herbert'] }));
    const wrapper = await mountView('dune');

    expect(api.getBook).toHaveBeenCalledWith('dune');
    expect(wrapper.get('h1').text()).toBe('Dune');
    expect(wrapper.get('.subtitle').text()).toBe('Frank Herbert');
  });

  it('shows friend reviews, public reviews and the public average from the API', async () => {
    api.getBookReviews.mockResolvedValueOnce({
      mine: null,
      friends: [review('f1', 'Maya Laurent', 5, 'Loved it')],
      publicReviews: [review('p1', 'Sam Reed', 3, null)],
      publicAverage: 3.5,
      publicCount: 2,
    });
    const wrapper = await mountView();

    expect(api.getBookReviews).toHaveBeenCalledWith('emma');
    expect(wrapper.get('.friends-panel').text()).toContain('Maya Laurent');
    expect(wrapper.get('.friends-panel').text()).toContain('Loved it');
    expect(wrapper.get('.reviews-panel').text()).toContain('Sam Reed');
    expect(wrapper.get('.big-rating').text()).toBe('3.5 / 5');
    expect(wrapper.get('.rating-count').text()).toBe('2 public ratings');
    expect(wrapper.find('.read-more').exists()).toBe(false);
    expect(wrapper.find('select').exists()).toBe(false);
  });

  it('shows the empty states when nobody has reviewed the book', async () => {
    api.getBookReviews.mockResolvedValueOnce(noReviews);
    const wrapper = await mountView('circe');

    expect(wrapper.get('h1').text()).toBe('Circe');
    expect(wrapper.get('.friends-panel').text()).toContain('No friend reviews yet.');
    expect(wrapper.get('.reviews-panel').text()).toContain('No public reviews yet.');
    expect(wrapper.get('.big-rating').text()).toBe('— / 5');
    expect(wrapper.get('.rating-count').text()).toBe('No public ratings yet');
    expect(wrapper.find('.club-panel').exists()).toBe(false);
  });

  it('passes my review to the thoughts panel', async () => {
    api.getBookReviews.mockResolvedValueOnce({
      ...noReviews,
      mine: review('m1', 'Me', 4, 'Great world building'),
    });
    const wrapper = await mountView();

    const textarea = wrapper.get('.thoughts-panel textarea').element as HTMLTextAreaElement;
    expect(textarea.value).toBe('Great world building');
  });

  it('shows a friendly message for an unknown book id', async () => {
    api.getBookReviews.mockRejectedValueOnce(new Error('offline'));
    const wrapper = await mountView('missing-book');

    expect(wrapper.get('h1').text()).toBe('Book not found');
    expect(wrapper.get('.missing-link').attributes('href')).toBe('/library');
  });

  it('adds and removes the book from folders without changing its status', async () => {
    const wrapper = await mountView();

    expect(wrapper.get('.reading-panel').text()).toContain('Autumn reading • Classics club');

    await wrapper.get('.folder-toggle').trigger('click');
    const options = wrapper.findAll('.folder-option');
    await options[1]!.get('input').setValue(true);

    expect(wrapper.get('.folder-toggle').text()).toContain('All-time favorites');
    expect(wrapper.get('.status-badge').text()).toBe('IN PROGRESS');

    await options[0]!.get('input').setValue(false);

    expect(wrapper.get('.folder-toggle').text()).not.toContain('Autumn reading');
    expect(wrapper.get('.folder-toggle').text()).toContain('All-time favorites • Classics club');
  });

  it('adds and removes a tag on the book page', async () => {
    api.getBookReviews.mockResolvedValueOnce(noReviews);
    const wrapper = await mountView();
    const chips = () =>
      wrapper.findAll('.tag-chip').map((chip) => chip.text().replace('×', '').trim());
    const before = chips();

    await wrapper.get('.tag-input').setValue('Book Club Pick');
    await wrapper.get('.tag-form').trigger('submit');
    await flushPromises();
    expect(chips()).toEqual([...before, 'book club pick']);

    await wrapper.get('[aria-label="Remove tag book club pick"]').trigger('click');
    await flushPromises();
    expect(chips()).toEqual(before);
  });

  it('updates the status of a book after saving it', async () => {
    api.getBookReviews.mockResolvedValueOnce(noReviews);
    const wrapper = await mountView('circe');

    await wrapper.get('.update-status').trigger('click');
    await wrapper.get('.editor-select').setValue('did-not-finish');
    await wrapper.get('.editor-input').setValue('12');
    await wrapper.get('.status-editor').trigger('submit');
    await flushPromises();

    expect(api.updateReadingStatus).toHaveBeenCalledWith({
      bookId: 'circe',
      status: 'did-not-finish',
      currentPage: 12,
    });
    expect(wrapper.get('.status-badge').text()).toBe('DID NOT FINISH');
    expect(wrapper.get('.reading-panel').text()).toContain('Page 12 of 393');
  });
});
