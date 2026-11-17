// @req F-BOOK-01 F-EXP-02 F-LIB-03 F-LIB-04
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockLibrary } from '@/mocks/library';
import router from '@/router';
import type { ApiBook, ApiBookReviews, ApiLibraryItem, ApiReview } from '@/services/api';
import BookDetailView from '../BookDetailView.vue';

const api = vi.hoisted(() => ({
  getBookReviews: vi.fn<(bookId: string) => Promise<ApiBookReviews>>(),
  getUserLibrary: vi.fn<() => Promise<ApiLibraryItem[]>>(async () => []),
  getBook: vi.fn<(bookId: string) => Promise<ApiBook>>(async () => {
    throw new Error('offline');
  }),
  updateReadingStatus: vi.fn<(payload: unknown) => Promise<void>>(async () => {}),
}));
vi.mock('@/services/api', async (original) => ({
  ...(await original<typeof import('@/services/api')>()),
  ...api,
}));

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

describe('BookDetailView', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the reading, edition and club content for a book', async () => {
    api.getBookReviews.mockRejectedValueOnce(new Error('offline'));
    const wrapper = await mountView();

    expect(wrapper.get('h1').text()).toBe('Emma');
    expect(wrapper.get('.subtitle').text()).toContain('Jane Austen');
    expect(wrapper.get('.reading-panel').text()).toContain('Page 294 of 474 • 62% complete');
    expect(wrapper.get('.start-session').attributes('href')).toBe('/session/emma');
    expect(wrapper.get('.edition-panel').text()).toContain('Published 1815');
    expect(wrapper.get('.club-panel').text()).toContain('Classics • October');
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

  it('shows a skeleton while the book loads instead of Book not found', async () => {
    let resolveLibrary!: (items: ApiLibraryItem[]) => void;
    api.getUserLibrary.mockImplementationOnce(
      () => new Promise<ApiLibraryItem[]>((resolve) => (resolveLibrary = resolve)),
    );
    api.getBook.mockResolvedValueOnce({
      id: 'dune',
      title: 'Dune',
      description: null,
      isbn13: null,
      pageCount: 688,
      coverUrl: null,
    });
    api.getBookReviews.mockResolvedValueOnce(noReviews);

    const wrapper = mount(BookDetailView, {
      props: { bookId: 'dune' },
      global: { plugins: [router] },
    });

    expect(wrapper.find('.book-detail-skeleton').exists()).toBe(true);
    expect(wrapper.text()).toContain('Loading book details…');
    expect(wrapper.text()).not.toContain('Book not found');

    resolveLibrary([]);
    await flushPromises();

    expect(wrapper.find('.book-detail-skeleton').exists()).toBe(false);
    expect(wrapper.get('h1').text()).toBe('Dune');
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

  it('updates the status of a mock book after saving it', async () => {
    api.getBookReviews.mockResolvedValueOnce(noReviews);
    const wrapper = await mountView('circe');

    await wrapper.get('.update-status').trigger('click');
    await wrapper.get('.editor-select').setValue('did-not-finish');
    await wrapper.get('.editor-input').setValue('12');
    await wrapper.get('.status-editor').trigger('submit');
    await flushPromises();

    // Mock books are plain objects: the update is written onto the shared mock entry.
    expect(api.updateReadingStatus).toHaveBeenCalledWith({
      bookId: 'circe',
      status: 'did-not-finish',
      currentPage: 12,
    });
    const circe = mockLibrary.books.find((item) => item.id === 'circe')!;
    expect(circe.status).toBe('did-not-finish');
    expect(circe.currentPage).toBe(12);
  });
});
