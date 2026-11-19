// @req F-LIB-01
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import {
  circe,
  emma,
  midnightLibrary,
  roomOfOnesOwn,
  secretHistory,
} from '@/__tests__/library-fixtures';
import router from '@/router';
import type { LibraryBook } from '@/types/library';
import LibraryBookCard from '../LibraryBookCard.vue';

const book = emma;

function mountCard(props: { book: LibraryBook }) {
  return mount(LibraryBookCard, { props, global: { plugins: [router] } });
}

describe('LibraryBookCard', () => {
  it('shows the cover, title, author and reading progress', () => {
    const wrapper = mountCard({ book });

    expect(wrapper.get('.title').text()).toBe('Emma');
    expect(wrapper.get('.author').text()).toBe('Jane Austen');
    expect(wrapper.get('img').attributes('alt')).toBe('Cover of Emma');
    expect(wrapper.get('.note').text()).toBe('p. 294 of 474 · 62%');

    const progress = wrapper.get('progress');
    expect(progress.attributes('max')).toBe('474');
    expect(progress.attributes('value')).toBe('294');
  });

  it('links the book to its detail page', () => {
    const wrapper = mountCard({ book });

    expect(wrapper.get('a').attributes('href')).toBe('/library/emma');
  });

  it('shows a short note for books that are not in progress', () => {
    const note = (b: LibraryBook) => mountCard({ book: b }).get('.note').text();

    expect(note(midnightLibrary)).toBe('Not started');
    expect(note(circe)).toBe('Finished');
    expect(note(roomOfOnesOwn)).toBe('Read 2 times');
    expect(note(secretHistory)).toBe('Stopped at p. 156');
  });

  it('shows the title instead of a cover that fails to load', async () => {
    const wrapper = mountCard({ book });

    await wrapper.get('img').trigger('error');

    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.get('.placeholder').text()).toBe('Emma');
  });
});
