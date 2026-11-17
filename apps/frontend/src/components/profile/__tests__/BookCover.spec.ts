// @req F-PROF-01
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import type { Book } from '@/types/profile';
import BookCover from '../BookCover.vue';

const book: Book = {
  id: 'emma',
  title: 'Emma',
  author: 'Jane Austen',
  cover: { background: '#6f1d1b', ink: '#ffe6a7', accent: '#bb9457', motif: 'frame' },
};

describe('BookCover', () => {
  it('draws the generated cover when the book has no image', () => {
    const wrapper = mount(BookCover, { props: { book } });

    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.find('.motif-frame').exists()).toBe(true);
  });

  it('shows the cover image, and the generated cover if it fails to load', async () => {
    const wrapper = mount(BookCover, { props: { book: { ...book, coverUrl: 'e.png' } } });

    expect(wrapper.get('img').attributes('src')).toBe('e.png');
    await wrapper.get('img').trigger('error');

    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.find('.motif-frame').exists()).toBe(true);
  });
});
