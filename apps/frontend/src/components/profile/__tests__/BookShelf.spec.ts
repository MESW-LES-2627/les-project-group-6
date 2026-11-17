// @req F-PROF-01
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import BookShelf from '../BookShelf.vue';

describe('BookShelf', () => {
  it('draws an empty shelf when no book is finished yet', () => {
    const wrapper = mount(BookShelf, { props: { spines: [] } });

    expect(wrapper.get('.count').text()).toBe('0 finished');
    expect(wrapper.find('.scroller').exists()).toBe(false);
    expect(wrapper.findAll('.placeholder')).toHaveLength(5);
    expect(wrapper.get('.empty-text').text()).toBe('Finish a book to start your shelf');
  });
});
