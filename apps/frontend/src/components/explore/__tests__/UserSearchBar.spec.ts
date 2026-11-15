import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import UserSearchBar from '../UserSearchBar.vue';

describe('UserSearchBar', () => {
  it('submits the trimmed query', async () => {
    const wrapper = mount(UserSearchBar, { props: { modelValue: '' } });

    await wrapper.get('input[type="search"]').setValue('  @pedro  ');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.get('label').text()).toBe('Search readers');
    expect(wrapper.get('.hint').text()).toBe('Username or display name');
    expect(wrapper.emitted('submit')).toEqual([['@pedro']]);
    expect(wrapper.emitted('update:modelValue')).toContainEqual(['  @pedro  ']);
  });
});
