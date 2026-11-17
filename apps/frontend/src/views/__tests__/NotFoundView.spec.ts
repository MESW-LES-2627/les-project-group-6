import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import NotFoundView from '../NotFoundView.vue';

describe('NotFoundView', () => {
  it('tells the reader the page does not exist', () => {
    const wrapper = mount(NotFoundView);

    expect(wrapper.get('h1').text()).toBe('Page Not Found');
  });
});
