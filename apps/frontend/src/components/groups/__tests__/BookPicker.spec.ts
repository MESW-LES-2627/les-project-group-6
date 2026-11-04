import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ApiBook } from '@/services/api';
import BookPicker from '../BookPicker.vue';

const searchBooks = vi.hoisted(() => vi.fn<(title: string) => Promise<ApiBook[]>>());
const addBook = vi.hoisted(() => vi.fn<(title: string) => Promise<ApiBook>>());

vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  searchBooks,
  addBook,
}));

const book = (id: string, title: string): ApiBook => ({
  id,
  title,
  description: null,
  isbn13: null,
  pageCount: 300,
  coverUrl: null,
});

function mountPicker() {
  return mount(BookPicker, {
    props: { inputId: 'pick', label: 'Selected book', debounce: 0, modelValue: null },
  });
}

describe('BookPicker', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('searches the catalog and picks a result', async () => {
    searchBooks.mockResolvedValue([book('b1', 'Emma'), book('b2', 'Emmanuelle')]);
    const wrapper = mountPicker();

    await wrapper.get('#pick').setValue('Emma');
    await vi.waitFor(() => expect(wrapper.findAll('.result')).toHaveLength(2));
    expect(searchBooks).toHaveBeenCalledWith('Emma');
    // An exact match exists, so there is no "add" option
    expect(wrapper.text()).not.toContain('as a new book');

    await wrapper.findAll('.result')[0]!.trigger('click');

    expect(wrapper.emitted('update:modelValue')![0]).toEqual([{ id: 'b1', title: 'Emma' }]);
  });

  it('adds a missing book with only its title', async () => {
    searchBooks.mockResolvedValue([]);
    addBook.mockResolvedValue(book('b9', 'Middlemarch'));
    const wrapper = mountPicker();

    await wrapper.get('#pick').setValue('Middlemarch');
    await vi.waitFor(() => expect(wrapper.text()).toContain('Add “Middlemarch” as a new book'));
    await wrapper.get('.add').trigger('click');
    await vi.waitFor(() => expect(wrapper.emitted('update:modelValue')).toBeTruthy());

    expect(addBook).toHaveBeenCalledWith('Middlemarch');
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([{ id: 'b9', title: 'Middlemarch' }]);
  });
});
