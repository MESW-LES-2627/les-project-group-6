import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import router from '@/router';
import GroupsView from '../GroupsView.vue';

function mountView() {
  return mount(GroupsView, { global: { plugins: [router] } });
}

describe('GroupsView', () => {
  it('shows the heading, the invitation and all six groups', () => {
    const wrapper = mountView();

    expect(wrapper.get('h1').text()).toBe('Good books bring people together.');
    expect(wrapper.text()).toContain('The Sunday Shelf');
    expect(wrapper.findAll('article')).toHaveLength(6);
  });

  it('filters by kind and by status', async () => {
    const wrapper = mountView();
    const button = (label: string) =>
      wrapper.findAll('.filter').find((b) => b.text().startsWith(label))!;

    await button('Challenges').trigger('click');
    expect(wrapper.findAll('article')).toHaveLength(3);

    await button('Completed').trigger('click');
    expect(wrapper.findAll('article')).toHaveLength(2);
    expect(button('Completed').attributes('aria-pressed')).toBe('true');
  });

  it('adds the group when the invitation is accepted', async () => {
    const wrapper = mountView();

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'View & accept')!
      .trigger('click');

    expect(wrapper.findAll('article')).toHaveLength(7);
    expect(wrapper.text()).not.toContain('A new invitation');
    expect(wrapper.get('[role="status"]').text()).toBe('You joined The Sunday Shelf.');
  });

  it('removes the invitation when it is declined', async () => {
    const wrapper = mountView();

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Decline')!
      .trigger('click');

    expect(wrapper.findAll('article')).toHaveLength(6);
    expect(wrapper.text()).not.toContain('A new invitation');
  });

  it('links to the create page and to each group', () => {
    const wrapper = mountView();
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'));

    expect(hrefs).toContain('/groups/new');
    expect(hrefs).toContain('/groups/october-sprint');
    expect(hrefs).toContain('/groups/classics');
  });
});
