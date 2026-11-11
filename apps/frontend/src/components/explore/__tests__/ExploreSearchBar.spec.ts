import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ExploreSearchBar from '../ExploreSearchBar.vue';

describe('ExploreSearchBar', () => {
  it('submits the trimmed query', async () => {
    const wrapper = mount(ExploreSearchBar, { props: { modelValue: '' } });

    await wrapper.get('input[type="search"]').setValue('  Dune  ');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.get('label').text()).toBe('Search books');
    expect(wrapper.get('.hint').text()).toBe('Title, author or ISBN');
    expect(wrapper.emitted('submit')).toEqual([['Dune']]);
    expect(wrapper.emitted('update:modelValue')).toContainEqual(['  Dune  ']);
  });
});
