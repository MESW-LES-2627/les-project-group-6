// @req F-BOOK-02 F-EXP-01
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiBook } from '@/services/api';
import AddBookModal from '../AddBookModal.vue';

const api = vi.hoisted(() => ({
  searchBooks: vi.fn<(query: string, signal?: AbortSignal) => Promise<ApiBook[]>>(),
  addBook: vi.fn<(book: { title: string }) => Promise<ApiBook>>(),
  addToLibrary: vi.fn<(bookId: string) => Promise<void>>(),
}));

vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  ...api,
}));

const book = (id: string, title: string, author = ''): ApiBook => ({
  id,
  title,
  authors: author ? [author] : [],
  description: null,
  isbn13: null,
  pageCount: 300,
  coverUrl: null,
});

function mountModal(ownedIds: string[] = []) {
  return mount(AddBookModal, { props: { ownedIds } });
}

async function search(wrapper: VueWrapper, text: string) {
  await wrapper.get('#library-add-book-search').setValue(text);
  await wrapper.get('form[role="search"]').trigger('submit');
  await flushPromises();
}

beforeEach(() => {
  vi.clearAllMocks();
  api.searchBooks.mockReset().mockResolvedValue([]);
  api.addBook.mockReset();
  api.addToLibrary.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  document.body.style.overflow = '';
});

describe('AddBookModal', () => {
  it('searches the catalogue and lists the results', async () => {
    api.searchBooks.mockResolvedValue([book('b1', 'Dune', 'Frank Herbert')]);
    const wrapper = mountModal();

    await search(wrapper, 'Dune');

    expect(api.searchBooks).toHaveBeenCalledWith('Dune', expect.any(AbortSignal));
    expect(wrapper.text()).toContain('Dune');
    expect(wrapper.text()).toContain('Frank Herbert');
  });

  it('adds a result to the library and reports it', async () => {
    api.searchBooks.mockResolvedValue([book('b1', 'Dune')]);
    const wrapper = mountModal();

    await search(wrapper, 'Dune');
    await wrapper.get('.result-add').trigger('click');
    await flushPromises();

    expect(api.addToLibrary).toHaveBeenCalledWith('b1');
    expect(wrapper.emitted('added')).toHaveLength(1);
  });

  it('does not offer to add a book already on the shelf', async () => {
    api.searchBooks.mockResolvedValue([book('b1', 'Dune')]);
    const wrapper = mountModal(['b1']);

    await search(wrapper, 'Dune');

    expect(wrapper.get('.owned').text()).toBe('In your library');
    expect(wrapper.find('.result-add').exists()).toBe(false);
  });

  it('shows the server error when adding a result fails', async () => {
    api.searchBooks.mockResolvedValue([book('b1', 'Dune')]);
    api.addToLibrary.mockRejectedValue(new Error('Already there'));
    const wrapper = mountModal();

    await search(wrapper, 'Dune');
    await wrapper.get('.result-add').trigger('click');
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toBe('Already there');
    expect(wrapper.emitted('added')).toBeUndefined();
  });

  it('opens the manual form prefilled and adds the new book', async () => {
    api.addBook.mockResolvedValue(book('b9', 'Middlemarch'));
    const wrapper = mountModal();

    await search(wrapper, 'Middlemarch');
    await wrapper
      .findAll('.link-button')
      .find((b) => b.text() === 'Add this book')!
      .trigger('click');

    const title = wrapper.get('#add-book-title-input').element as HTMLInputElement;
    expect(title.value).toBe('Middlemarch');

    await wrapper.get('.add-book form').trigger('submit');
    await flushPromises();

    expect(api.addBook).toHaveBeenCalledWith({ title: 'Middlemarch' });
    expect(api.addToLibrary).toHaveBeenCalledWith('b9');
    expect(wrapper.emitted('added')).toHaveLength(1);
  });

  it('opens the manual form without a search', async () => {
    const wrapper = mountModal();

    await wrapper.get('.manual-link').trigger('click');

    expect(wrapper.find('#add-book-title-input').exists()).toBe(true);
  });

  it('clears the search and its results', async () => {
    api.searchBooks.mockResolvedValue([book('b1', 'Dune')]);
    const wrapper = mountModal();

    await search(wrapper, 'Dune');
    await wrapper.get('.results .link-button').trigger('click');

    expect(wrapper.find('.results').exists()).toBe(false);
    expect((wrapper.get('#library-add-book-search').element as HTMLInputElement).value).toBe('');
  });

  it('closes when the dialog asks to', async () => {
    const wrapper = mountModal();

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  describe('while typing', () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('searches once, 300 ms after the last keystroke', async () => {
      api.searchBooks.mockResolvedValue([book('b1', 'Dune')]);
      const wrapper = mountModal();
      const input = wrapper.get('#library-add-book-search');

      await input.setValue('Du');
      await input.setValue('Dune');
      vi.advanceTimersByTime(299);
      await flushPromises();
      expect(api.searchBooks).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      await flushPromises();

      expect(api.searchBooks).toHaveBeenCalledTimes(1);
      expect(api.searchBooks).toHaveBeenCalledWith('Dune', expect.any(AbortSignal));
      expect(wrapper.text()).toContain('Dune');
    });
  });
});
