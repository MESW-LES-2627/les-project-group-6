import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import router from '@/router';
import HomeView from '../HomeView.vue';

const mountView = () => mount(HomeView, { global: { plugins: [router] } });

describe('HomeView content', () => {
  it('shows the greeting, the bedside book, the streak and the goals', () => {
    const wrapper = mountView();

    expect(wrapper.get('h1').text()).toBe('A little reading, a little wonder.');
    expect(wrapper.text()).toContain('Page 294 of 474 · 62%');
    expect(wrapper.text()).toContain('12 day streak');
    expect(wrapper.text()).toContain('18/24');
    expect(wrapper.text()).toContain('6 books and 1,720 counted minutes to go');
    wrapper.unmount();
  });

  it('links to the session, the book and the groups', () => {
    const wrapper = mountView();
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'));

    expect(hrefs).toContain('/session/emma');
    expect(hrefs).toContain('/library/emma');
    expect(hrefs).toContain('/groups/october-sprint');
    expect(hrefs).toContain('/groups/classics');
    wrapper.unmount();
  });

  it('removes a friend request once accepted and the section once all are answered', async () => {
    const wrapper = mountView();
    const button = (label: string) => wrapper.findAll('button').find((b) => b.text() === label)!;

    await button('Accept').trigger('click');
    expect(wrapper.get('[role="status"]').text()).toBe('You and Sofia Chen are now friends.');

    await button('Decline').trigger('click');
    expect(wrapper.text()).not.toContain('A seat saved for you');
    wrapper.unmount();
  });
});
