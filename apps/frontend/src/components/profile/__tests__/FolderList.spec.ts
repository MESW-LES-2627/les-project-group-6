// @req F-LIB-03
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import FolderList from '../FolderList.vue';

describe('FolderList', () => {
  it('asks to create a folder from the new folder tile', async () => {
    const wrapper = mount(FolderList, { props: { folders: [] } });

    await wrapper.get('.new-folder').trigger('click');

    expect(wrapper.emitted('create')).toHaveLength(1);
  });
});
