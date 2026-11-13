import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ApiBook, NewBookPayload } from '@/services/api';
import AddBookModal from '../AddBookModal.vue';

const api = vi.hoisted(() => ({
  searchBooks: vi.fn<(query: string, signal?: AbortSignal) => Promise<ApiBook[]>>(),
  addToLibrary: vi.fn<(bookId: string) => Promise<void>>(),
  addBook: vi.fn<(book: NewBookPayload) => Promise<ApiBook>>(),
}));
vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  ...api,
}));

const book = (id: string, title: string): ApiBook => ({
  id,
  title,
  description: null,
  isbn13: null,
  pageCount: 300,
  coverUrl: null,
});

function mountModal(props: { libraryIds?: string[]; signedIn?: boolean } = {}) {
  return mount(AddBookModal, {
    props: { libraryIds: [], signedIn: true, ...props },
    attachTo: document.body,
  });
}

async function search(wrapper: ReturnType<typeof mountModal>, text: string) {
  await wrapper.get('#add-book-search').setValue(text);
  await wrapper.get('.search-form').trigger('submit');
  await flushPromises();
}

describe('AddBookModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('searches the catalogue and adds a found book to the library', async () => {
    api.searchBooks.mockResolvedValue([book('b1', 'Dune')]);
    api.addToLibrary.mockResolvedValue();
    const wrapper = mountModal();

    expect(wrapper.get('#add-book-modal-title').text()).toBe('Add a book');
    await search(wrapper, 'Dune');

    expect(api.searchBooks).toHaveBeenCalledWith('Dune', expect.any(AbortSignal));
    expect(wrapper.get('.result .title').text()).toBe('Dune');

    await wrapper.get('.result .button-outline').trigger('click');
    await flushPromises();

    expect(api.addToLibrary).toHaveBeenCalledWith('b1');
    expect(wrapper.emitted('added')).toEqual([[expect.objectContaining({ id: 'b1' })]]);

    wrapper.unmount();
  });

  it('says when a book is already in the library instead of adding it twice', async () => {
    api.searchBooks.mockResolvedValue([book('b1', 'Dune')]);
    const wrapper = mountModal({ libraryIds: ['b1'] });

    await search(wrapper, 'Dune');

    expect(wrapper.get('.result .tag').text()).toBe('In library');
    expect(wrapper.find('.result button').exists()).toBe(false);
    expect(api.addToLibrary).not.toHaveBeenCalled();

    wrapper.unmount();
  });

  it('does not search under 2 characters and shows the empty result states', async () => {
    api.searchBooks.mockResolvedValue([]);
    const wrapper = mountModal();

    await wrapper.get('#add-book-search').setValue('d');
    await wrapper.get('.search-form').trigger('submit');
    await flushPromises();
    expect(api.searchBooks).not.toHaveBeenCalled();

    await search(wrapper, 'dune');
    expect(wrapper.text()).toContain('No books match "dune".');

    wrapper.unmount();
  });

  it('reports when the search or the add fails', async () => {
    api.searchBooks.mockRejectedValueOnce(new Error('down'));
    const wrapper = mountModal();

    await search(wrapper, 'Dune');
    expect(wrapper.text()).toContain('Search is unavailable right now.');

    api.searchBooks.mockResolvedValueOnce([book('b1', 'Dune')]);
    api.addToLibrary.mockRejectedValueOnce(new Error('The book is gone'));
    await search(wrapper, 'Dune');
    await wrapper.get('.result .button-outline').trigger('click');
    await flushPromises();

    expect(wrapper.text()).toContain('The book is gone');

    wrapper.unmount();
  });

  it('adds a book by hand from the search text', async () => {
    api.addBook.mockResolvedValue(book('b2', "My grandmother's diary"));
    api.addToLibrary.mockResolvedValue();
    const wrapper = mountModal();

    await wrapper.get('#add-book-search').setValue("My grandmother's diary");
    await wrapper.get('.manual .link-button').trigger('click');

    expect((wrapper.get('#add-book-title-input').element as HTMLInputElement).value).toBe(
      "My grandmother's diary",
    );

    await wrapper.get('.add-book form').trigger('submit');
    await flushPromises();

    expect(api.addBook).toHaveBeenCalledWith({ title: "My grandmother's diary" });
    expect(api.addToLibrary).toHaveBeenCalledWith('b2');
    expect(wrapper.emitted('added')).toEqual([[expect.objectContaining({ id: 'b2' })]]);

    wrapper.unmount();
  });

  it('adds a manual book to the prototype library without calling the API', async () => {
    const wrapper = mountModal({ signedIn: false });

    await wrapper.get('.manual .link-button').trigger('click');
    await wrapper.get('#add-book-title-input').setValue('A local book');
    await wrapper.get('.add-book form').trigger('submit');
    await flushPromises();

    expect(api.addBook).not.toHaveBeenCalled();
    expect(wrapper.emitted('added')).toEqual([
      [expect.objectContaining({ title: 'A local book', status: 'not-started' })],
    ]);

    wrapper.unmount();
  });

  it('does not move a book that is already on the shelf back to Not started', async () => {
    api.addBook.mockResolvedValue(book('b1', 'Dune'));
    const wrapper = mountModal({ libraryIds: ['b1'] });

    await wrapper.get('.manual .link-button').trigger('click');
    await wrapper.get('#add-book-title-input').setValue('Dune');
    await wrapper.get('.add-book form').trigger('submit');
    await flushPromises();

    expect(api.addToLibrary).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain('This book is already in your library.');
    expect(wrapper.emitted('added')).toBeUndefined();

    wrapper.unmount();
  });
});
