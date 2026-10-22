import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import { mockLibrary } from '@/mocks/library';
import LibrarySidebar from '../LibrarySidebar.vue';

function mountSidebar() {
  return mount(LibrarySidebar, {
    props: {
      shelves: mockLibrary.shelves,
      folders: mockLibrary.folders,
      tags: mockLibrary.tags,
      activeShelf: 'all' as const,
      activeFolder: 'autumn',
      activeTag: null,
    },
  });
}

describe('LibrarySidebar', () => {
  it('shows the shelves, folders, tags and the tip', () => {
    const wrapper = mountSidebar();

    expect(wrapper.get('.panel-title').text()).toBe('Your shelves');
    expect(wrapper.text()).toContain('All books');
    expect(wrapper.text()).toContain('Autumn reading');
    expect(wrapper.text()).toContain('borrowed');
    expect(wrapper.get('.tip-title').text()).toBe('Shelves, not duplicates');
    expect(wrapper.get('.tip-body').text()).toContain('Deleting a folder never deletes its books');
  });

  it('marks the active shelf, folder and tag', () => {
    const wrapper = mountSidebar();

    expect(wrapper.get('.shelf-list .row.active').text()).toContain('All books');
    expect(wrapper.get('.folder-list .row.active').text()).toContain('Autumn reading');
  });

  it('emits the selected shelf, folder and tag', async () => {
    const wrapper = mountSidebar();

    await wrapper.findAll('.shelf-list .row')[3]!.trigger('click');
    await wrapper.findAll('.folder-list .row')[1]!.trigger('click');
    await wrapper.findAll('.tag')[0]!.trigger('click');

    expect(wrapper.emitted('selectShelf')).toEqual([['finished']]);
    expect(wrapper.emitted('selectFolder')).toEqual([['favorites']]);
    expect(wrapper.emitted('selectTag')).toEqual([['borrowed']]);
  });
});
