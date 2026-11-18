// @req F-LIB-01 F-LIB-03
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import LibrarySidebar from '@/components/library/LibrarySidebar.vue';
import router from '@/router';
import LibraryView from '../LibraryView.vue';

function mountView() {
  return mount(LibraryView, { global: { plugins: [router] } });
}

describe('LibraryView', () => {
  it('shows the plate, the status tabs and all six books', () => {
    const wrapper = mountView();

    expect(wrapper.get('h1').text()).toBe('Library');
    expect(wrapper.text()).toContain('32 books · 2 reading now · 18 finished');
    expect(wrapper.findAll('article')).toHaveLength(6);
    expect(wrapper.get('#books-title').text()).toBe('All books');
    expect(wrapper.get('.summary').text()).toBe('6 of 32 shown');
  });

  it('filters by reading status and by folder', async () => {
    const wrapper = mountView();
    const tab = (label: string) =>
      wrapper.findAll('.page-tab').find((t) => t.text().startsWith(label))!;

    await tab('Finished').trigger('click');
    expect(wrapper.findAll('article')).toHaveLength(3);
    expect(wrapper.get('#books-title').text()).toBe('Finished');
    expect(tab('Finished').attributes('aria-pressed')).toBe('true');

    await tab('All books').trigger('click');
    await wrapper
      .findAll('.folder-list .row')
      .find((r) => r.text().startsWith('Classics club'))!
      .trigger('click');
    expect(wrapper.get('#books-title').text()).toBe('Classics club');
    expect(wrapper.findAll('article')).toHaveLength(3);
  });

  it('searches by title and shows everything again', async () => {
    const wrapper = mountView();

    await wrapper.get('input[type="search"]').setValue('piranesi');

    expect(wrapper.findAll('article')).toHaveLength(1);
    expect(wrapper.get('article .title').text()).toBe('Piranesi');

    await wrapper.get('.view-all').trigger('click');

    expect(wrapper.findAll('article')).toHaveLength(6);
    expect((wrapper.get('input[type="search"]').element as HTMLInputElement).value).toBe('');
    expect(wrapper.get('.summary').text()).toBe('6 of 32 shown');
  });

  it('creates a folder and rejects a duplicate name in any case', async () => {
    const wrapper = mountView();

    await wrapper.get('.add-folder').trigger('click');
    await wrapper.get('.create-form .folder-input').setValue('Winter reading');
    await wrapper.get('.create-form').trigger('submit');

    expect(wrapper.get('.folder-list').text()).toContain('Winter reading');

    await wrapper.get('.add-folder').trigger('click');
    await wrapper.get('.create-form .folder-input').setValue('winter READING');
    await wrapper.get('.create-form').trigger('submit');

    expect(wrapper.get('.folder-error').text()).toBe('You already have a folder with this name');
    expect(wrapper.findAll('.folder-list .folder-item')).toHaveLength(4);
  });

  it('renames and deletes a folder without removing books', async () => {
    const wrapper = mountView();

    await wrapper.get('[aria-label="Rename Autumn reading"]').trigger('click');
    await wrapper.get('[aria-label="Rename Autumn reading"]').setValue('Autumn reads');
    await wrapper.get('.folder-form').trigger('submit');

    expect(wrapper.get('.folder-list').text()).toContain('Autumn reads');
    expect(wrapper.get('.folder-list').text()).not.toContain('Autumn reading');

    await wrapper.get('[aria-label="Delete Classics club"]').trigger('click');

    expect(wrapper.get('.folder-list').text()).not.toContain('Classics club');
    expect(wrapper.findAll('article')).toHaveLength(6);
  });

  it('filters by genre and sorts by title or author', async () => {
    const wrapper = mountView();
    const titles = () => wrapper.findAll('article .title').map((t) => t.text());
    const [genre, sort] = wrapper.findAll('select.field-input');

    await sort!.setValue('title');
    expect(titles()).toEqual([...titles()].sort((a, b) => a.localeCompare(b)));

    await sort!.setValue('author');
    const authors = wrapper.findAll('article .author').map((a) => a.text());
    expect(authors).toEqual([...authors].sort((a, b) => a.localeCompare(b)));

    await genre!.setValue('Fantasy');
    expect(wrapper.findAll('article').length).toBeGreaterThan(0);
    expect(wrapper.findAll('article').length).toBeLessThan(6);
    expect(titles()).toContain('Piranesi');
  });

  it('rejects renaming a folder to the name of another one', async () => {
    const wrapper = mountView();

    await wrapper.get('[aria-label="Rename Autumn reading"]').trigger('click');
    await wrapper.get('[aria-label="Rename Autumn reading"]').setValue('classics CLUB');
    await wrapper.get('.folder-form').trigger('submit');

    expect(wrapper.get('.folder-error').text()).toBe('You already have a folder with this name');
    expect(wrapper.get('.folder-list').text()).toContain('Autumn reading');
  });

  it('ignores blank folder names', async () => {
    const wrapper = mountView();
    const sidebar = wrapper.getComponent(LibrarySidebar);
    const before = wrapper.findAll('.folder-list .folder-item').length;

    sidebar.vm.$emit('createFolder', '   ');
    sidebar.vm.$emit('renameFolder', 'autumn', '   ');
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll('.folder-list .folder-item')).toHaveLength(before);
    expect(wrapper.get('.folder-list').text()).toContain('Autumn reading');
    expect(wrapper.find('.folder-error').exists()).toBe(false);
  });

  it('clears the folder filter when the selected folder is deleted', async () => {
    const wrapper = mountView();

    await wrapper
      .findAll('.folder-list .row')
      .find((r) => r.text().startsWith('Classics club'))!
      .trigger('click');
    expect(wrapper.get('#books-title').text()).toBe('Classics club');

    await wrapper.get('[aria-label="Delete Classics club"]').trigger('click');

    expect(wrapper.get('#books-title').text()).toBe('All books');
    expect(wrapper.findAll('article')).toHaveLength(6);
  });
});
