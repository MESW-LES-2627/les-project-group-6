// @req F-BOOK-01 F-LIB-03 F-LIB-04
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import router from '@/router';
import type { ApiBook, ApiLibraryItem } from '@/services/api';
import BookDetailView from '../BookDetailView.vue';

const api = vi.hoisted(() => ({
  getUserLibrary: vi.fn<(...args: unknown[]) => unknown>(),
  getBook: vi.fn<(...args: unknown[]) => unknown>(),
  getBookReviews: vi.fn<(...args: unknown[]) => unknown>(),
  getLibraryFolders: vi.fn<(...args: unknown[]) => unknown>(),
  getLibraryTags: vi.fn<(...args: unknown[]) => unknown>(),
  updateReadingStatus: vi.fn<(...args: unknown[]) => unknown>(),
  addBookToFolder: vi.fn<(...args: unknown[]) => unknown>(),
}));

vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  ...api,
}));

vi.mock('@/stores/session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/stores/session')>()),
  session: { state: { status: 'ready' }, ensure: async () => 'ready' },
  isSignedIn: (await import('vue')).ref(true),
}));

const BOOK_ID = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01';
const OTHER_ID = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02';
const FOLDER = { id: '11111111-1111-4111-8111-111111111111', name: 'Favourites', count: 0 };
const TAG = { id: '44444444-4444-4444-8444-444444444444', name: 'audiobook', count: 1 };

const apiBook = (id: string, title: string): ApiBook => ({
  authors: [],
  id,
  title,
  description: null,
  isbn13: null,
  pageCount: 400,
  coverUrl: null,
  createdAt: '2026-11-01T00:00:00Z',
});

const libraryItem: ApiLibraryItem = {
  id: 'item-1',
  book: apiBook(BOOK_ID, 'Pride and Prejudice'),
  status: 'in-progress',
  currentPage: 100,
  updatedAt: '2026-11-10T00:00:00Z',
  folderIds: [],
  tagIds: [TAG.id],
};

async function mountView(bookId = BOOK_ID) {
  const wrapper = mount(BookDetailView, { props: { bookId }, global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getUserLibrary.mockResolvedValue([libraryItem]);
  api.getBook.mockRejectedValue(new Error('offline'));
  api.getBookReviews.mockRejectedValue(new Error('offline'));
  api.getLibraryFolders.mockResolvedValue([FOLDER]);
  api.getLibraryTags.mockResolvedValue([TAG]);
});

describe('BookDetailView signed in', () => {
  it('shows a book from the reader library with their folders and tags', async () => {
    const wrapper = await mountView();

    expect(wrapper.get('h1').text()).toBe('Pride and Prejudice');
    expect(wrapper.get('.reading-panel').text()).toContain('Page 100 of 400 • 25% complete');
    expect(wrapper.findAll('.tag-chip').map((c) => c.text().replace('×', '').trim())).toEqual([
      'audiobook',
    ]);
    expect(api.getBook).not.toHaveBeenCalled();
    expect(api.getLibraryFolders).toHaveBeenCalled();
  });

  it('fetches a book outside the library from the catalogue', async () => {
    api.getUserLibrary.mockResolvedValue([]);
    api.getBook.mockResolvedValue(apiBook(OTHER_ID, 'The Midnight Library'));
    const wrapper = await mountView(OTHER_ID);

    expect(api.getBook).toHaveBeenCalledWith(OTHER_ID);
    expect(wrapper.get('h1').text()).toBe('The Midnight Library');
    expect(wrapper.get('.status-badge').text()).toBe('NOT STARTED');
  });

  it('shows no folders or tags when loading them fails', async () => {
    api.getLibraryFolders.mockRejectedValue(new Error('offline'));
    api.getLibraryTags.mockRejectedValue(new Error('offline'));
    const wrapper = await mountView();

    await wrapper.get('.folder-toggle').trigger('click');
    expect(wrapper.get('.folder-empty').text()).toContain('No folders yet');
    expect(wrapper.get('.tag-empty').text()).toBe('No tags');
  });

  it('reloads the book and its reviews when the book id changes', async () => {
    const wrapper = await mountView();
    api.getUserLibrary.mockResolvedValue([
      { ...libraryItem, book: apiBook(OTHER_ID, 'The Midnight Library') },
    ]);

    await wrapper.setProps({ bookId: OTHER_ID });
    await flushPromises();

    expect(api.getBookReviews).toHaveBeenLastCalledWith(OTHER_ID);
    expect(wrapper.get('h1').text()).toBe('The Midnight Library');
  });

  it('updates the shown status after saving it', async () => {
    api.updateReadingStatus.mockResolvedValue(undefined);
    const wrapper = await mountView();

    await wrapper.get('.update-status').trigger('click');
    await wrapper.get('.editor-select').setValue('finished');
    await wrapper.get('.editor-input').setValue('400');
    await wrapper.get('.status-editor').trigger('submit');
    await flushPromises();

    expect(wrapper.get('.status-badge').text()).toBe('FINISHED');
    expect(wrapper.get('.reading-panel').text()).toContain('Page 400 of 400 • 100% complete');
  });

  it('shows the new folder after adding the book to it', async () => {
    api.addBookToFolder.mockResolvedValue(undefined);
    const wrapper = await mountView();

    await wrapper.get('.folder-toggle').trigger('click');
    await wrapper.get('.folder-option input').trigger('change');
    await flushPromises();

    expect(api.addBookToFolder).toHaveBeenCalledWith(FOLDER.id, BOOK_ID);
    expect(wrapper.get('.folder-toggle').text()).toBe('Favourites');
  });
});
