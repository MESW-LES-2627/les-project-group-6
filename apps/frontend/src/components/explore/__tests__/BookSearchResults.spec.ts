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
  description: null,
  isbn13: null,
  pageCount: 688,
  coverUrl: null,
});

function mountResults(props: { books?: (typeof dune)[]; loading?: boolean; error?: boolean } = {}) {
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
});
