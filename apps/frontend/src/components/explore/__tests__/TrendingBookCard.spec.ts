import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it } from 'vitest';
import { mapApiBookToLibraryBook } from '@/services/api';
import TrendingBookCard from '../TrendingBookCard.vue';

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<p />' } },
    { path: '/library/:bookId', name: 'book-detail', component: { template: '<p />' } },
  ],
});

const emma = mapApiBookToLibraryBook({
  id: 'b2',
  title: 'Emma',
  description: null,
  isbn13: null,
  pageCount: 474,
  coverUrl: null,
});

describe('TrendingBookCard', () => {
  it('shows the book, its metric and a link to the book page', () => {
    const wrapper = mount(TrendingBookCard, {
      props: { book: emma, metric: '4 readers added it', rankLabel: '#1 Trending' },
      global: { plugins: [router] },
    });

    expect(wrapper.get('h3').text()).toBe('Emma');
    expect(wrapper.text()).toContain('4 readers added it');
    expect(wrapper.get('.tag-highlight').text()).toBe('#1 Trending');
    expect(wrapper.get('a').attributes('href')).toBe('/library/b2');
  });

  it('has no rank label unless given one', () => {
    const wrapper = mount(TrendingBookCard, {
      props: { book: emma, metric: '12 min read' },
      global: { plugins: [router] },
    });

    expect(wrapper.find('.tag-highlight').exists()).toBe(false);
  });
});
