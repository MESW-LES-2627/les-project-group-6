// @req F-HOME-01
import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';

import router from '@/router';
import HomeView from '../HomeView.vue';

const mountView = () => mount(HomeView, { global: { plugins: [router] } });

describe('HomeView content', () => {
  it('shows the greeting, the bedside book, the streak and the goals', () => {
    const wrapper = mountView();

    expect(wrapper.get('h1').text()).toBe('Good morning, Eleanor.');
    expect(wrapper.get('#bedside-title').text()).toBe('Emma');
    expect(wrapper.text()).toContain('Page 294 of 474 · 62%');
    expect(wrapper.get('.streak-line').text()).toBe('12 days in a row');
    expect(wrapper.findAll('.week-day.read')).toHaveLength(7);
    expect(wrapper.text()).toContain('18 of 24 books');
    expect(wrapper.text()).toContain('6 books and 1,720 min to go');
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
    expect(wrapper.text()).not.toContain('Waiting for you');
    wrapper.unmount();
  });
});
