import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import LibraryView from '../LibraryView.vue';

describe('LibraryView', () => {
  it('shows the library heading, filters and all six cards', () => {
    const wrapper = mount(LibraryView);

    expect(wrapper.get('h1').text()).toBe('A life between the covers.');
    expect(wrapper.findAll('article')).toHaveLength(6);
    expect(wrapper.get('.summary').text()).toBe('Showing 6 of 32 books • Autumn reading folder');
    expect(wrapper.get('.panel-title').text()).toBe('Your shelves');
  });

  it('filters by reading status', async () => {
    const wrapper = mount(LibraryView);
    const finished = wrapper.findAll('.tab').find((tab) => tab.text() === 'Finished');

    await finished!.trigger('click');

    expect(wrapper.findAll('article')).toHaveLength(3);
    expect(wrapper.get('.summary').text()).toBe('Showing 3 of 32 books • Autumn reading folder');
  });

  it('searches by title and clears the filters', async () => {
    const wrapper = mount(LibraryView);

    await wrapper.get('input[type="search"]').setValue('piranesi');

    expect(wrapper.findAll('article')).toHaveLength(1);
    expect(wrapper.get('.title').text()).toBe('Piranesi');

    await wrapper.get('.view-all').trigger('click');

    expect(wrapper.findAll('article')).toHaveLength(6);
    expect((wrapper.get('input[type="search"]').element as HTMLInputElement).value).toBe('');
    expect(wrapper.get('.summary').text()).toBe('Showing 6 of 32 books');
  });
});
