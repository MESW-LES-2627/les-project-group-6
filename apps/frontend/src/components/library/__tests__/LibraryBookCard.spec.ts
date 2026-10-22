import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import { mockLibrary } from '@/mocks/library';
import LibraryBookCard from '../LibraryBookCard.vue';

const book = mockLibrary.books[0]!;

describe('LibraryBookCard', () => {
  it('shows the book, reading status and progress', () => {
    const wrapper = mount(LibraryBookCard, { props: { book } });

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

  it('emits the book from the overflow menu', async () => {
    const wrapper = mount(LibraryBookCard, { props: { book } });

    await wrapper.get('.menu-button').trigger('click');

    expect(wrapper.emitted('menu')).toEqual([[book]]);
  });
});
