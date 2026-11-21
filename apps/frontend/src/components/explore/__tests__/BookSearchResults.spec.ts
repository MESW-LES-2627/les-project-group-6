// @req F-EXP-01 F-BOOK-02
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it } from 'vitest';
import { mapApiBookToLibraryBook } from '@/services/api';
import BookSearchResults from '../BookSearchResults.vue';

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<p />' } },
    { path: '/library/:bookId', name: 'book-detail', component: { template: '<p />' } },
  ],
});

const dune = mapApiBookToLibraryBook({
  id: 'b1',
  title: 'Dune',
  authors: [],
  description: null,
  isbn13: null,
  pageCount: 688,
  coverUrl: null,
});

function mountResults(
  props: {
    books?: (typeof dune)[];
    loading?: boolean;
    error?: boolean;
    mode?: 'view' | 'add';
    ownedIds?: string[];
    busyId?: string;
  } = {},
) {
  return mount(BookSearchResults, {
    props: { query: 'Dune', books: [dune], loading: false, error: false, ...props },
    global: { plugins: [router] },
  });
}

describe('BookSearchResults', () => {
  it('lists the books with a link to each book page', async () => {
    const wrapper = mountResults();

    expect(wrapper.get('h2').text()).toBe('Books');
    expect(wrapper.text()).toContain('1 result');
    expect(wrapper.get('li').text()).toContain('Dune');
    expect(wrapper.get('li a').attributes('href')).toBe('/library/b1');

    await wrapper.get('.link-button').trigger('click');
    expect(wrapper.emitted('clear')).toHaveLength(1);
  });

  it('says when nothing matches, while searching and when search fails', () => {
    expect(mountResults({ books: [] }).text()).toContain('No books match "Dune".');
    expect(mountResults({ error: true }).text()).toContain('Search is unavailable right now.');
    expect(mountResults({ loading: true }).text()).toContain('Searching…');
  });

  it('offers Add in add mode and emits the picked book', async () => {
    const wrapper = mountResults({ mode: 'add' });
    const add = wrapper.get('.result-add');

    expect(add.text()).toBe('Add');
    expect(wrapper.find('li a').exists()).toBe(false);

    await add.trigger('click');
    expect(wrapper.emitted('pick')![0]).toEqual([dune]);
  });

  it('marks a book already in the library instead of offering Add', () => {
    const wrapper = mountResults({ mode: 'add', ownedIds: ['b1'] });

    expect(wrapper.get('.owned').text()).toBe('In your library');
    expect(wrapper.find('.result-add').exists()).toBe(false);
  });

  it('disables Add while that book is being added', () => {
    const wrapper = mountResults({ mode: 'add', busyId: 'b1' });
    const add = wrapper.get('.result-add');

    expect(add.attributes('disabled')).toBeDefined();
    expect(add.text()).toBe('Adding…');
  });
});
