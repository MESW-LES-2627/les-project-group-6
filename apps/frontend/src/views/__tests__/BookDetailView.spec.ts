import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import router from '@/router';
import BookDetailView from '../BookDetailView.vue';

function mountView(bookId = 'emma') {
  return mount(BookDetailView, {
    props: { bookId },
    global: { plugins: [router] },
  });
}

describe('BookDetailView', () => {
  it('shows the reading, edition, reviews and club content for a book', () => {
    const wrapper = mountView();

    expect(wrapper.get('h1').text()).toBe('Emma');
    expect(wrapper.get('.subtitle').text()).toContain('Jane Austen');
    expect(wrapper.get('.reading-panel').text()).toContain('Page 294 of 474 • 62% complete');
    expect(wrapper.get('.start-session').attributes('href')).toBe('/session/emma');
    expect(wrapper.get('.edition-panel').text()).toContain('Published 1815');
    expect(wrapper.get('.friends-panel').text()).toContain('Maya Laurent');
    expect(wrapper.get('.reviews-panel').text()).toContain('18,426 public ratings');
    expect(wrapper.get('.thoughts-panel').text()).toContain('Friends only');
    expect(wrapper.get('.club-panel').text()).toContain('Classics • October');
  });

  it('falls back to the card data for books without a full detail record', () => {
    const wrapper = mountView('circe');

    expect(wrapper.get('h1').text()).toBe('Circe');
    expect(wrapper.get('.friends-panel').text()).toContain('No friend reviews yet.');
    expect(wrapper.find('.club-panel').exists()).toBe(false);
  });

  it('shows a friendly message for an unknown book id', () => {
    const wrapper = mountView('missing-book');

    expect(wrapper.get('h1').text()).toBe('Book not found');
    expect(wrapper.get('.missing-link').attributes('href')).toBe('/library');
  });
});
