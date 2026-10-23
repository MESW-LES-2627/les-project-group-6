import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import { mockLibrary } from '@/mocks/library';
import router from '@/router';
import LibraryBookCard from '../LibraryBookCard.vue';

const book = mockLibrary.books[0]!;

describe('LibraryBookCard', () => {
  it('shows the book, reading status and progress', () => {
    const wrapper = mount(LibraryBookCard, {
      props: { book },
      global: { plugins: [router] },
    });

    expect(wrapper.get('.title').text()).toBe('Emma');
    expect(wrapper.get('.author').text()).toBe('Jane Austen');
    expect(wrapper.get('.status').text()).toBe('In progress');
    expect(wrapper.get('.status').classes()).toContain('status--in-progress');
    expect(wrapper.get('.pages').text()).toBe('474 pages');
    expect(wrapper.get('.summary').text()).toBe('294 / 474 pages • next chapter awaits');
    expect(wrapper.get('.chip').text()).toBe('borrowed');
    expect(wrapper.get('.cover').attributes('alt')).toBe('Cover of Emma');

    const progress = wrapper.get('progress');
    expect(progress.attributes('max')).toBe('474');
    expect(progress.attributes('value')).toBe('294');
  });

  it('links the cover and title to the book detail page', () => {
    const wrapper = mount(LibraryBookCard, {
      props: { book },
      global: { plugins: [router] },
    });

    expect(wrapper.get('.cover-link').attributes('href')).toBe('/library/emma');
    expect(wrapper.get('.title a').attributes('href')).toBe('/library/emma');
  });

  it('opens the detail page when the card body is clicked', async () => {
    const push = vi.spyOn(router, 'push');
    const wrapper = mount(LibraryBookCard, {
      props: { book },
      global: { plugins: [router] },
    });

    await wrapper.get('.summary').trigger('click');

    expect(push).toHaveBeenCalledWith({ name: 'book-detail', params: { bookId: 'emma' } });
    push.mockRestore();
  });

  it('emits the book from the overflow menu', async () => {
    const wrapper = mount(LibraryBookCard, {
      props: { book },
      global: { plugins: [router] },
    });

    await wrapper.get('.menu-button').trigger('click');

    expect(wrapper.emitted('menu')).toEqual([[book]]);
  });
});
