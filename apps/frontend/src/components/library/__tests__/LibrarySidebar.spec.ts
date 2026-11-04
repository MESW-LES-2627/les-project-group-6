import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import { mockLibrary } from '@/mocks/library';
import LibrarySidebar from '../LibrarySidebar.vue';

function mountSidebar() {
  return mount(LibrarySidebar, {
    props: {
      folders: mockLibrary.folders,
      tags: mockLibrary.tags,
      activeFolder: 'autumn',
      activeTag: null,
    },
  });
}

describe('LibrarySidebar', () => {
  it('shows the folders and tags', () => {
    const wrapper = mountSidebar();

    const titles = wrapper.findAll('h2').map((h) => h.text());
    expect(titles).toEqual(['Folders', 'Tags']);
    expect(wrapper.text()).toContain('Autumn reading');
    expect(wrapper.text()).toContain('borrowed');
  });

  it('marks the active folder', () => {
    const wrapper = mountSidebar();

    expect(wrapper.get('.folder-list .row.active').text()).toContain('Autumn reading');
  });

  it('emits the selected folder, tag and a new folder', async () => {
    const wrapper = mountSidebar();

    await wrapper.findAll('.folder-list .row')[1]!.trigger('click');
    await wrapper.findAll('.tag')[0]!.trigger('click');
    await wrapper.get('.add-folder').trigger('click');

    expect(wrapper.emitted('selectFolder')).toEqual([['favorites']]);
    expect(wrapper.emitted('selectTag')).toEqual([['borrowed']]);
    expect(wrapper.emitted('createFolder')).toHaveLength(1);
  });
});
