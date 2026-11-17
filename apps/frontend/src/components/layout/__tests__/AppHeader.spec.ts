// @req F-EXP-01
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it } from 'vitest';
import AppHeader from '../AppHeader.vue';

describe('AppHeader', () => {
  it('offers sign out from the account menu on every page', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:any(.*)*', component: { template: '<p />' } }],
    });
    const wrapper = mount(AppHeader, {
      props: { initials: 'EW', unreadNotifications: 0 },
      global: { plugins: [router] },
    });

    await wrapper.get('[aria-label="Account menu"]').trigger('click');
    await wrapper
      .findAll('[role="menuitem"]')
      .find((m) => m.text() === 'Sign out')!
      .trigger('click');

    expect(wrapper.emitted('sign-out')).toHaveLength(1);
    expect(wrapper.find('#account-menu').exists()).toBe(false);
    expect(wrapper.text()).toContain('EW');
  });
  it('links Explore to the explore page', () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: '/:any(.*)*', component: { template: '<p />' } }],
    });
    const wrapper = mount(AppHeader, {
      props: { initials: 'EW', unreadNotifications: 0 },
      global: { plugins: [router] },
    });

    const explore = wrapper.findAll('.nav-link').find((l) => l.text() === 'Explore')!;
    expect(explore.attributes('href')).toBe('/explore');
    // Search lives on the Explore page, not in the header
    expect(wrapper.find('[role="search"]').exists()).toBe(false);
  });
});
