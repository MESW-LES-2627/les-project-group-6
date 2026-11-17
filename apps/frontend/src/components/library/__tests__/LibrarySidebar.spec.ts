// @req F-LIB-03 F-LIB-04
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import { mockLibrary } from '@/mocks/library';
import LibrarySidebar from '../LibrarySidebar.vue';

function mountSidebar(error: string | null = null) {
  return mount(LibrarySidebar, {
    props: {
      folders: mockLibrary.folders,
      tags: mockLibrary.tags,
      activeFolder: 'autumn',
      activeTag: null,
      error,
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

  it('emits the selected folder and tag', async () => {
    const wrapper = mountSidebar();

    await wrapper.findAll('.folder-list .row')[1]!.trigger('click');
    await wrapper.findAll('.tag')[0]!.trigger('click');

    expect(wrapper.emitted('selectFolder')).toEqual([['favorites']]);
    expect(wrapper.emitted('selectTag')).toEqual([['borrowed']]);
  });

  it('creates a folder from the inline form', async () => {
    const wrapper = mountSidebar();

    await wrapper.get('.add-folder').trigger('click');
    await wrapper.get('.create-form .folder-input').setValue('  Winter reading  ');
    await wrapper.get('.create-form').trigger('submit');

    expect(wrapper.emitted('createFolder')).toEqual([['Winter reading']]);
  });

  it('renames a folder from its row', async () => {
    const wrapper = mountSidebar();

    await wrapper.get('[aria-label="Rename Autumn reading"]').trigger('click');
    await wrapper.get('[aria-label="Rename Autumn reading"]').setValue('Autumn reads');
    await wrapper.get('.folder-form').trigger('submit');

    expect(wrapper.emitted('renameFolder')).toEqual([['autumn', 'Autumn reads']]);
  });

  it('deletes a folder from its row', async () => {
    const wrapper = mountSidebar();

    await wrapper.get('[aria-label="Delete All-time favorites"]').trigger('click');

    expect(wrapper.emitted('deleteFolder')).toEqual([['favorites']]);
  });

  it('shows the duplicate-name error exactly', () => {
    const wrapper = mountSidebar('You already have a folder with this name');

    expect(wrapper.get('.folder-error').text()).toBe('You already have a folder with this name');
  });

  it('closes the create form on cancel without emitting', async () => {
    const wrapper = mountSidebar();

    await wrapper.get('.add-folder').trigger('click');
    await wrapper.get('.create-form .folder-input').setValue('Winter');
    await wrapper.get('.create-form button[type="button"]').trigger('click');

    expect(wrapper.find('.create-form').exists()).toBe(false);
    expect(wrapper.find('.add-folder').exists()).toBe(true);
    expect(wrapper.emitted('createFolder')).toBeUndefined();
  });

  it('does not emit a blank folder name', async () => {
    const wrapper = mountSidebar();

    await wrapper.get('.add-folder').trigger('click');
    await wrapper.get('.create-form .folder-input').setValue('   ');
    await wrapper.get('.create-form').trigger('submit');

    expect(wrapper.emitted('createFolder')).toBeUndefined();
    expect(wrapper.find('.create-form').exists()).toBe(true);
  });

  it('cancels a rename and ignores a blank one', async () => {
    const wrapper = mountSidebar();

    await wrapper.get('[aria-label="Rename Autumn reading"]').trigger('click');
    await wrapper.get('[aria-label="Rename Autumn reading"]').setValue('  ');
    await wrapper.get('.folder-form').trigger('submit');
    expect(wrapper.emitted('renameFolder')).toBeUndefined();

    await wrapper.get('.folder-form button[type="button"]').trigger('click');

    expect(wrapper.find('.folder-form').exists()).toBe(false);
    expect(wrapper.text()).toContain('Autumn reading');
    expect(wrapper.emitted('renameFolder')).toBeUndefined();
  });
});
