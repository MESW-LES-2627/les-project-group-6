// @req F-LIB-01 F-LIB-03 F-BOOK-02
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LibrarySidebar from '@/components/library/LibrarySidebar.vue';
import router from '@/router';
import type { ApiLibraryItem } from '@/services/api';
import type { ReadingStatus } from '@/types/library';
import LibraryView from '../LibraryView.vue';

const api = vi.hoisted(() => ({
  getUserLibrary: vi.fn<(...args: unknown[]) => unknown>(),
  getLibraryFolders: vi.fn<(...args: unknown[]) => unknown>(),
  getLibraryTags: vi.fn<(...args: unknown[]) => unknown>(),
  createLibraryFolder: vi.fn<(name: string) => unknown>(),
  renameLibraryFolder: vi.fn<(...args: unknown[]) => unknown>(),
  deleteLibraryFolder: vi.fn<(...args: unknown[]) => unknown>(),
  addBook: vi.fn<(book: unknown) => unknown>(),
  addToLibrary: vi.fn<(bookId: string) => unknown>(),
  searchBooks: vi.fn<(...args: unknown[]) => unknown>(),
}));

vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  ...api,
}));

const item = (
  id: string,
  title: string,
  author: string,
  status: ReadingStatus,
  folderIds: string[] = [],
): ApiLibraryItem => ({
  id: `status-${id}`,
  book: {
    id,
    title,
    authors: [author],
    description: null,
    isbn13: null,
    pageCount: 300,
    coverUrl: null,
  },
  status,
  currentPage: status === 'in-progress' ? 120 : 0,
  updatedAt: '2026-11-12T00:00:00.000Z',
  folderIds,
  tagIds: [],
});

const LIBRARY = [
  item('emma', 'Emma', 'Jane Austen', 'in-progress', ['autumn', 'club']),
  item('piranesi', 'Piranesi', 'Susanna Clarke', 'in-progress'),
  item('midnight', 'The Midnight Library', 'Matt Haig', 'not-started'),
  item('circe', 'Circe', 'Madeline Miller', 'finished', ['club']),
  item('room', "A Room of One's Own", 'Virginia Woolf', 'finished', ['club']),
  item('secret', 'The Secret History', 'Donna Tartt', 'did-not-finish'),
];

const FOLDERS = [
  { id: 'autumn', name: 'Autumn reading', count: 1 },
  { id: 'favorites', name: 'All-time favorites', count: 0 },
  { id: 'club', name: 'Classics club', count: 3 },
];

async function mountView() {
  const wrapper = mount(LibraryView, { global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getUserLibrary.mockResolvedValue(LIBRARY);
  api.getLibraryFolders.mockResolvedValue(FOLDERS);
  api.getLibraryTags.mockResolvedValue([]);
  api.createLibraryFolder.mockImplementation(async (name: string) => ({
    id: 'winter',
    name,
    count: 0,
  }));
  api.renameLibraryFolder.mockResolvedValue(undefined);
  api.deleteLibraryFolder.mockResolvedValue(undefined);
  api.addBook.mockReset();
  api.addToLibrary.mockReset().mockResolvedValue(undefined);
  api.searchBooks.mockReset().mockResolvedValue([]);
});

afterEach(() => {
  document.body.style.overflow = '';
});

describe('LibraryView', () => {
  it('shows the plate, the status tabs and every book from the API', async () => {
    const wrapper = await mountView();

    expect(wrapper.get('h1').text()).toBe('Library');
    expect(wrapper.text()).toContain('6 books · 2 reading now · 2 finished');
    expect(wrapper.findAll('article')).toHaveLength(6);
    expect(wrapper.get('#books-title').text()).toBe('All books');
    expect(wrapper.get('.summary').text()).toBe('6 of 6 shown');
  });

  it('shows the authors the API sends', async () => {
    const wrapper = await mountView();

    const authors = wrapper.findAll('article .author').map((a) => a.text());
    expect(authors).toContain('Jane Austen');
    expect(authors).not.toContain('Unknown Author');
  });

  it('filters by reading status and by folder', async () => {
    const wrapper = await mountView();
    const tab = (label: string) =>
      wrapper.findAll('.page-tab').find((t) => t.text().startsWith(label))!;

    await tab('Finished').trigger('click');
    expect(wrapper.findAll('article')).toHaveLength(2);
    expect(wrapper.get('#books-title').text()).toBe('Finished');
    expect(tab('Finished').attributes('aria-pressed')).toBe('true');

    await tab('All books').trigger('click');
    await wrapper
      .findAll('.folder-list .row')
      .find((r) => r.text().startsWith('Classics club'))!
      .trigger('click');
    expect(wrapper.get('#books-title').text()).toBe('Classics club');
    expect(wrapper.findAll('article')).toHaveLength(3);
  });

  it('searches by title and shows everything again', async () => {
    const wrapper = await mountView();

    await wrapper.get('input[type="search"]').setValue('piranesi');

    expect(wrapper.findAll('article')).toHaveLength(1);
    expect(wrapper.get('article .title').text()).toBe('Piranesi');

    await wrapper.get('.view-all').trigger('click');

    expect(wrapper.findAll('article')).toHaveLength(6);
    expect((wrapper.get('input[type="search"]').element as HTMLInputElement).value).toBe('');
    expect(wrapper.get('.summary').text()).toBe('6 of 6 shown');
  });

  it('creates a folder and rejects a duplicate name in any case', async () => {
    const wrapper = await mountView();

    await wrapper.get('.add-folder').trigger('click');
    await wrapper.get('.create-form .folder-input').setValue('Winter reading');
    await wrapper.get('.create-form').trigger('submit');
    await flushPromises();

    expect(api.createLibraryFolder).toHaveBeenCalledWith('Winter reading');
    expect(wrapper.get('.folder-list').text()).toContain('Winter reading');

    await wrapper.get('.add-folder').trigger('click');
    await wrapper.get('.create-form .folder-input').setValue('winter READING');
    await wrapper.get('.create-form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('.folder-error').text()).toBe('You already have a folder with this name');
    expect(api.createLibraryFolder).toHaveBeenCalledTimes(1);
    expect(wrapper.findAll('.folder-list .folder-item')).toHaveLength(4);
  });

  it('renames and deletes a folder without removing books', async () => {
    const wrapper = await mountView();

    await wrapper.get('[aria-label="Rename Autumn reading"]').trigger('click');
    await wrapper.get('[aria-label="Rename Autumn reading"]').setValue('Autumn reads');
    await wrapper.get('.folder-form').trigger('submit');
    await flushPromises();

    expect(api.renameLibraryFolder).toHaveBeenCalledWith('autumn', 'Autumn reads');
    expect(wrapper.get('.folder-list').text()).toContain('Autumn reads');
    expect(wrapper.get('.folder-list').text()).not.toContain('Autumn reading');

    await wrapper.get('[aria-label="Delete Classics club"]').trigger('click');
    await flushPromises();

    expect(api.deleteLibraryFolder).toHaveBeenCalledWith('club');
    expect(wrapper.get('.folder-list').text()).not.toContain('Classics club');
    expect(wrapper.findAll('article')).toHaveLength(6);
  });

  it('hides the genre filter (the API serves no genres) and sorts by title or author', async () => {
    const wrapper = await mountView();
    const titles = () => wrapper.findAll('article .title').map((t) => t.text());
    const selects = wrapper.findAll('select.field-input');

    expect(selects).toHaveLength(1);
    const sort = selects[0]!;

    await sort.setValue('title');
    expect(titles()).toEqual([...titles()].sort((a, b) => a.localeCompare(b)));

    await sort.setValue('author');
    const authors = wrapper.findAll('article .author').map((a) => a.text());
    expect(authors).toEqual([...authors].sort((a, b) => a.localeCompare(b)));
  });

  it('rejects renaming a folder to the name of another one', async () => {
    const wrapper = await mountView();

    await wrapper.get('[aria-label="Rename Autumn reading"]').trigger('click');
    await wrapper.get('[aria-label="Rename Autumn reading"]').setValue('classics CLUB');
    await wrapper.get('.folder-form').trigger('submit');

    expect(wrapper.get('.folder-error').text()).toBe('You already have a folder with this name');
    expect(api.renameLibraryFolder).not.toHaveBeenCalled();
    expect(wrapper.get('.folder-list').text()).toContain('Autumn reading');
  });

  it('ignores blank folder names', async () => {
    const wrapper = await mountView();
    const sidebar = wrapper.getComponent(LibrarySidebar);
    const before = wrapper.findAll('.folder-list .folder-item').length;

    sidebar.vm.$emit('createFolder', '   ');
    sidebar.vm.$emit('renameFolder', 'autumn', '   ');
    await flushPromises();

    expect(wrapper.findAll('.folder-list .folder-item')).toHaveLength(before);
    expect(wrapper.get('.folder-list').text()).toContain('Autumn reading');
    expect(wrapper.find('.folder-error').exists()).toBe(false);
    expect(api.createLibraryFolder).not.toHaveBeenCalled();
  });

  it('clears the folder filter when the selected folder is deleted', async () => {
    const wrapper = await mountView();

    await wrapper
      .findAll('.folder-list .row')
      .find((r) => r.text().startsWith('Classics club'))!
      .trigger('click');
    expect(wrapper.get('#books-title').text()).toBe('Classics club');

    await wrapper.get('[aria-label="Delete Classics club"]').trigger('click');
    await flushPromises();

    expect(wrapper.get('#books-title').text()).toBe('All books');
    expect(wrapper.findAll('article')).toHaveLength(6);
  });

  describe('adding a book', () => {
    const NEW_BOOK = {
      id: 'new-book',
      title: 'The Left Hand of Darkness',
      authors: ['Ursula K. Le Guin'],
      description: null,
      isbn13: null,
      pageCount: 304,
      coverUrl: null,
    };

    it('opens the modal with a catalogue search and closes it', async () => {
      const wrapper = await mountView();

      await wrapper.get('.plate-button').trigger('click');

      expect(wrapper.get('[role="dialog"]').attributes('aria-labelledby')).toBe(
        'add-book-modal-title',
      );
      expect(wrapper.find('#library-add-book-search').exists()).toBe(true);

      await wrapper.get('.modal-close').trigger('click');

      expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    });

    it('searches the catalogue and adds a result to the shelf', async () => {
      api.searchBooks.mockResolvedValue([NEW_BOOK]);
      api.getUserLibrary
        .mockResolvedValueOnce(LIBRARY)
        .mockResolvedValueOnce([
          ...LIBRARY,
          item('new-book', 'The Left Hand of Darkness', 'Ursula K. Le Guin', 'not-started'),
        ]);
      const wrapper = await mountView();

      await wrapper.get('.plate-button').trigger('click');
      await wrapper.get('#library-add-book-search').setValue('Left Hand');
      await wrapper.get('form[role="search"]').trigger('submit');
      await flushPromises();

      expect(api.searchBooks).toHaveBeenCalledWith('Left Hand', expect.any(AbortSignal));

      await wrapper.get('.result-add').trigger('click');
      await flushPromises();

      expect(api.addToLibrary).toHaveBeenCalledWith('new-book');
      expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
      expect(wrapper.findAll('article')).toHaveLength(7);
    });

    it('does not offer to add a book that is already in the library', async () => {
      api.searchBooks.mockResolvedValue([
        { ...NEW_BOOK, id: 'emma', title: 'Emma', authors: ['Jane Austen'] },
      ]);
      const wrapper = await mountView();

      await wrapper.get('.plate-button').trigger('click');
      await wrapper.get('#library-add-book-search').setValue('Emma');
      await wrapper.get('form[role="search"]').trigger('submit');
      await flushPromises();

      expect(wrapper.get('.owned').text()).toBe('In your library');
      expect(wrapper.find('.result-add').exists()).toBe(false);
    });

    it('adds a missing book manually, closes the modal and refreshes the library', async () => {
      api.addBook.mockResolvedValue(NEW_BOOK);
      api.getUserLibrary
        .mockResolvedValueOnce(LIBRARY)
        .mockResolvedValueOnce([
          ...LIBRARY,
          item('left-hand', 'The Left Hand of Darkness', 'Ursula K. Le Guin', 'not-started'),
        ]);
      const wrapper = await mountView();

      await wrapper.get('.plate-button').trigger('click');
      await wrapper.get('.manual-link').trigger('click');
      await wrapper.get('#add-book-title-input').setValue('The Left Hand of Darkness');
      await wrapper.get('#add-book-author').setValue('Ursula K. Le Guin');
      await wrapper.get('#add-book-pages').setValue('304');
      await wrapper.get('.add-book form').trigger('submit');
      await flushPromises();

      expect(api.addBook).toHaveBeenCalledWith({
        title: 'The Left Hand of Darkness',
        authors: ['Ursula K. Le Guin'],
        pageCount: 304,
      });
      expect(api.addToLibrary).toHaveBeenCalledWith('new-book');
      expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
      expect(wrapper.findAll('article')).toHaveLength(7);
    });

    it('keeps the modal open and shows the server error when adding fails', async () => {
      api.addBook.mockRejectedValue(new Error('That ISBN already exists'));
      const wrapper = await mountView();

      await wrapper.get('.plate-button').trigger('click');
      await wrapper.get('.manual-link').trigger('click');
      await wrapper.get('#add-book-title-input').setValue('Diary');
      await wrapper.get('.add-book form').trigger('submit');
      await flushPromises();

      expect(wrapper.get('.add-book').text()).toContain('That ISBN already exists');
      expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
      expect(api.addToLibrary).not.toHaveBeenCalled();
    });

    it('closes the modal on Escape', async () => {
      const wrapper = await mountView();
      await wrapper.get('.plate-button').trigger('click');

      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await flushPromises();

      expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    });
  });
});
