// @req F-LIB-01 F-LIB-03 F-LIB-04
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import router from '@/router';
import LibraryView from '../LibraryView.vue';

const api = vi.hoisted(() => ({
  getUserLibrary: vi.fn<(...args: unknown[]) => unknown>(),
  getLibraryFolders: vi.fn<(...args: unknown[]) => unknown>(),
  createLibraryFolder: vi.fn<(...args: unknown[]) => unknown>(),
  renameLibraryFolder: vi.fn<(...args: unknown[]) => unknown>(),
  deleteLibraryFolder: vi.fn<(...args: unknown[]) => unknown>(),
  getLibraryTags: vi.fn<(...args: unknown[]) => unknown>(),
  searchBooks: vi.fn<(...args: unknown[]) => unknown>(),
  addBook: vi.fn<(...args: unknown[]) => unknown>(),
  addToLibrary: vi.fn<(...args: unknown[]) => unknown>(),
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

const FOLDER_A = '11111111-1111-4111-8111-111111111111';
const FOLDER_B = '22222222-2222-4222-8222-222222222222';
const FOLDER_C = '33333333-3333-4333-8333-333333333333';
const BOOK_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BOOK_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const BOOK_C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

const folder = (id: string, name: string) => ({
  id,
  name,
  count: 0,
  createdAt: '2026-11-12T00:00:00.000Z',
});

const TAG_AUDIO = '44444444-4444-4444-8444-444444444444';
const TAG_GONE = '55555555-5555-4555-8555-555555555555';

const book = (id: string, title: string, folderIds: string[] = [], tagIds: string[] = []) => ({
  id: `status-${id}`,
  book: {
    id,
    title,
    description: null,
    isbn13: null,
    pageCount: 300,
    coverUrl: null,
  },
  status: 'in-progress',
  currentPage: 10,
  updatedAt: '2026-11-12T00:00:00.000Z',
  folderIds,
  tagIds,
});

function mountView() {
  return mount(LibraryView, { global: { plugins: [router] } });
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getUserLibrary.mockResolvedValue([]);
  api.getLibraryFolders.mockResolvedValue([]);
  api.getLibraryTags.mockResolvedValue([]);
});

describe('LibraryView with a signed-in reader', () => {
  it('replaces the mock books with the API library, even when it is empty', async () => {
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.findAll('article')).toHaveLength(0);
    expect(wrapper.get('.summary').text()).toBe('0 of 0 shown');
    expect(wrapper.text()).not.toContain('Autumn reading');
  });

  it('derives each folder count from the books on the shelf', async () => {
    api.getUserLibrary.mockResolvedValue([
      book(BOOK_A, 'Emma', [FOLDER_A]),
      book(BOOK_B, 'Circe', [FOLDER_A, FOLDER_B]),
    ]);
    api.getLibraryFolders.mockResolvedValue([folder(FOLDER_A, 'Autumn'), folder(FOLDER_B, 'Club')]);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.findAll('article')).toHaveLength(2);
    const items = wrapper.findAll('.folder-list .folder-item');
    expect(items[0]!.find('.folder-name').text()).toBe('Autumn');
    expect(items[0]!.find('.count').text()).toBe('2');
    expect(items[1]!.find('.folder-name').text()).toBe('Club');
    expect(items[1]!.find('.count').text()).toBe('1');
  });

  it('creates folders through the API and loads them again after a remount', async () => {
    api.createLibraryFolder.mockResolvedValue(folder(FOLDER_C, 'Winter'));

    const first = mountView();
    await flushPromises();

    await first.get('.add-folder').trigger('click');
    await first.get('.create-form .folder-input').setValue('Winter');
    await first.get('.create-form').trigger('submit');
    await flushPromises();

    expect(api.createLibraryFolder).toHaveBeenCalledWith('Winter');
    expect(first.get('.folder-list').text()).toContain('Winter');
    first.unmount();

    api.getLibraryFolders.mockResolvedValue([folder(FOLDER_C, 'Winter')]);
    const second = mountView();
    await flushPromises();

    expect(second.get('.folder-list').text()).toContain('Winter');
    expect(second.text()).not.toContain('Autumn reading');
  });

  it('keeps a book in every folder it belongs to when filtering', async () => {
    api.getUserLibrary.mockResolvedValue([book(BOOK_A, 'Emma', [FOLDER_A, FOLDER_B])]);
    api.getLibraryFolders.mockResolvedValue([folder(FOLDER_A, 'Autumn'), folder(FOLDER_B, 'Club')]);

    const wrapper = mountView();
    await flushPromises();

    const row = (name: string) =>
      wrapper.findAll('.folder-list .row').find((item) => item.text().startsWith(name))!;

    await row('Autumn').trigger('click');
    expect(wrapper.findAll('article')).toHaveLength(1);

    await row('Club').trigger('click');
    expect(wrapper.findAll('article')).toHaveLength(1);
    expect(wrapper.get('#books-title').text()).toBe('Club');
  });

  it('lists the reader tags from the API with counts from the books', async () => {
    api.getUserLibrary.mockResolvedValue([
      book(BOOK_A, 'Emma', [], [TAG_AUDIO]),
      book(BOOK_B, 'Circe', [], [TAG_AUDIO]),
    ]);
    api.getLibraryTags.mockResolvedValue([
      { id: TAG_GONE, name: 'borrowed', count: 1 },
      { id: TAG_AUDIO, name: 'audiobook', count: 2 },
    ]);
  it('opens the add book modal and shows a manually added book on the shelf', async () => {
    api.addBook.mockResolvedValue({
      id: BOOK_C,
      title: 'The Hobbit',
      description: null,
      isbn13: null,
      pageCount: 310,
      coverUrl: null,
    });
    api.addToLibrary.mockResolvedValue(undefined);

    const wrapper = mountView();
    await flushPromises();

    const tags = wrapper.findAll('.tag-list .tag');
    expect(tags).toHaveLength(1);
    expect(tags[0]!.text()).toBe('audiobook · 2');
    expect(wrapper.text()).not.toContain('borrowed');
  });

  it('filters the grid by the selected tag and clears it on a second click', async () => {
    api.getUserLibrary.mockResolvedValue([
      book(BOOK_A, 'Emma', [], [TAG_AUDIO]),
      book(BOOK_B, 'Circe'),
    ]);
    api.getLibraryTags.mockResolvedValue([{ id: TAG_AUDIO, name: 'audiobook', count: 1 }]);

    const wrapper = mountView();
    await flushPromises();
    expect(wrapper.findAll('article')).toHaveLength(2);

    await wrapper.get('.tag-list .tag').trigger('click');
    expect(wrapper.findAll('article')).toHaveLength(1);
    expect(wrapper.get('article').text()).toContain('Emma');

    await wrapper.get('.tag-list .tag').trigger('click');
    expect(wrapper.findAll('article')).toHaveLength(2);
  });

  it('still shows the books when the tags fail to load', async () => {
    api.getUserLibrary.mockResolvedValue([book(BOOK_A, 'Emma', [], [TAG_AUDIO])]);
    api.getLibraryTags.mockRejectedValue(new Error('offline'));

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.findAll('article')).toHaveLength(1);
    expect(wrapper.findAll('.tag-list .tag')).toHaveLength(0);
  });

  it('shows an error when the library cannot be loaded', async () => {
    api.getUserLibrary.mockRejectedValue(new Error('offline'));

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.get('.library-error').text()).toBe(
      'We could not load your library. Please refresh the page.',
    );
    expect(wrapper.findAll('article')).toHaveLength(0);
  });

  it('shows an error when the folders cannot be loaded', async () => {
    api.getLibraryFolders.mockRejectedValue(new Error('offline'));

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.get('.folder-error').text()).toBe(
      'We could not load your folders. Please refresh the page.',
    );
    expect(wrapper.findAll('.folder-list .folder-item')).toHaveLength(0);
  });

  it('lists the tags in alphabetical order', async () => {
    api.getUserLibrary.mockResolvedValue([book(BOOK_A, 'Emma', [], [TAG_AUDIO, TAG_GONE])]);
    api.getLibraryTags.mockResolvedValue([
      { id: TAG_AUDIO, name: 'zebra', count: 1 },
      { id: TAG_GONE, name: 'apple', count: 1 },
    ]);

    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.findAll('.tag-list .tag').map((t) => t.text())).toEqual([
      'apple · 1',
      'zebra · 1',
    ]);
  });

  it('shows the API error when creating a folder fails', async () => {
    api.createLibraryFolder.mockRejectedValue(new Error('Too many folders'));

    const wrapper = mountView();
    await flushPromises();
    await wrapper.get('.add-folder').trigger('click');
    await wrapper.get('.create-form .folder-input').setValue('Winter');
    await wrapper.get('.create-form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('.folder-error').text()).toBe('Too many folders');
    expect(wrapper.get('.folder-list').text()).not.toContain('Winter');
  });

  it('renames a folder through the API', async () => {
    api.getLibraryFolders.mockResolvedValue([folder(FOLDER_A, 'Autumn')]);
    api.renameLibraryFolder.mockResolvedValue(undefined);

    const wrapper = mountView();
    await flushPromises();
    await wrapper.get('[aria-label="Rename Autumn"]').trigger('click');
    await wrapper.get('[aria-label="Rename Autumn"]').setValue('Fall');
    await wrapper.get('.folder-form').trigger('submit');
    await flushPromises();

    expect(api.renameLibraryFolder).toHaveBeenCalledWith(FOLDER_A, 'Fall');
    expect(wrapper.get('.folder-list').text()).toContain('Fall');
  });

  it('keeps the old name and shows the error when renaming fails', async () => {
    api.getLibraryFolders.mockResolvedValue([folder(FOLDER_A, 'Autumn')]);
    api.renameLibraryFolder.mockRejectedValue(new Error('Rename failed'));

    const wrapper = mountView();
    await flushPromises();
    await wrapper.get('[aria-label="Rename Autumn"]').trigger('click');
    await wrapper.get('[aria-label="Rename Autumn"]').setValue('Fall');
    await wrapper.get('.folder-form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('.folder-error').text()).toBe('Rename failed');
    expect(wrapper.get('.folder-list').text()).toContain('Autumn');
  });

  it('deletes a folder through the API and drops it from the books', async () => {
    api.getUserLibrary.mockResolvedValue([book(BOOK_A, 'Emma', [FOLDER_A])]);
    api.getLibraryFolders.mockResolvedValue([folder(FOLDER_A, 'Autumn')]);
    api.deleteLibraryFolder.mockResolvedValue(undefined);

    const wrapper = mountView();
    await flushPromises();
    await wrapper.get('[aria-label="Delete Autumn"]').trigger('click');
    await flushPromises();

    expect(api.deleteLibraryFolder).toHaveBeenCalledWith(FOLDER_A);
    expect(wrapper.findAll('.folder-list .folder-item')).toHaveLength(0);
    expect(wrapper.findAll('article')).toHaveLength(1);
  });

  it('keeps the folder and shows the error when deleting fails', async () => {
    api.getLibraryFolders.mockResolvedValue([folder(FOLDER_A, 'Autumn')]);
    api.deleteLibraryFolder.mockRejectedValue(new Error('Delete failed'));

    const wrapper = mountView();
    await flushPromises();
    await wrapper.get('[aria-label="Delete Autumn"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('.folder-error').text()).toBe('Delete failed');
    expect(wrapper.get('.folder-list').text()).toContain('Autumn');
    await wrapper.get('.plate-button').trigger('click');
    expect(wrapper.get('[role="dialog"]').text()).toContain('Add a book');

    await wrapper.get('.manual .link-button').trigger('click');
    await wrapper.get('#add-book-title-input').setValue('The Hobbit');
    await wrapper.get('.add-book form').trigger('submit');
    await flushPromises();

    expect(api.addBook).toHaveBeenCalledWith({ title: 'The Hobbit' });
    expect(api.addToLibrary).toHaveBeenCalledWith(BOOK_C);
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    expect(wrapper.findAll('article')).toHaveLength(1);
    expect(wrapper.get('article .title').text()).toBe('The Hobbit');
  });

  it('opens the add book modal and shows a manually added book on the shelf', async () => {
    api.addBook.mockResolvedValue({
      id: BOOK_C,
      title: 'The Hobbit',
      description: null,
      isbn13: null,
      pageCount: 310,
      coverUrl: null,
    });
    api.addToLibrary.mockResolvedValue(undefined);

    const wrapper = mountView();
    await flushPromises();

    await wrapper.get('.plate-button').trigger('click');
    expect(wrapper.get('[role="dialog"]').text()).toContain('Add a book');

    await wrapper.get('.manual .link-button').trigger('click');
    await wrapper.get('#add-book-title-input').setValue('The Hobbit');
    await wrapper.get('.add-book form').trigger('submit');
    await flushPromises();

    expect(api.addBook).toHaveBeenCalledWith({ title: 'The Hobbit' });
    expect(api.addToLibrary).toHaveBeenCalledWith(BOOK_C);
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    expect(wrapper.findAll('article')).toHaveLength(1);
    expect(wrapper.get('article .title').text()).toBe('The Hobbit');
  });
});
