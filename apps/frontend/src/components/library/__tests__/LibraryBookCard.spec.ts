// @req F-LIB-01
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import { mockLibrary } from '@/mocks/library';
import router from '@/router';
import type { LibraryBook } from '@/types/library';
import LibraryBookCard from '../LibraryBookCard.vue';

const book = mockLibrary.books[0]!;

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
    const byId = (id: string) => mockLibrary.books.find((b) => b.id === id)!;

    expect(note(byId('the-midnight-library'))).toBe('Not started');
    expect(note(byId('circe'))).toBe('Finished');
    expect(note(byId('a-room-of-ones-own'))).toBe('Read 2 times');
    expect(note(byId('the-secret-history'))).toBe('Stopped at p. 156');
  });

  it('shows the title instead of a cover that fails to load', async () => {
    const wrapper = mountCard({ book });

    await wrapper.get('img').trigger('error');

    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.get('.placeholder').text()).toBe('Emma');
  });
});
