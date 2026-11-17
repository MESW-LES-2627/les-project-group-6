// @req F-EXP-01
import { mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { describe, expect, it, vi } from 'vitest';
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

  describe('account menu', () => {
    function mountHeader(unreadNotifications = 0) {
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/:any(.*)*', component: { template: '<p />' } }],
      });
      return mount(AppHeader, {
        props: { initials: 'EW', unreadNotifications },
        global: { plugins: [router] },
        attachTo: document.body,
      });
    }

    it('closes on a click outside the menu but not inside it', async () => {
      const wrapper = mountHeader();
      await wrapper.get('[aria-label="Account menu"]').trigger('click');

      document.getElementById('account-menu')!.click();
      await wrapper.vm.$nextTick();
      expect(wrapper.find('#account-menu').exists()).toBe(true);

      document.body.click();
      await wrapper.vm.$nextTick();
      expect(wrapper.find('#account-menu').exists()).toBe(false);
      wrapper.unmount();
    });

    it('closes on Escape and returns focus to the menu button', async () => {
      const wrapper = mountHeader();
      await wrapper.get('[aria-label="Account menu"]').trigger('click');

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await wrapper.vm.$nextTick();

      expect(wrapper.find('#account-menu').exists()).toBe(false);
      expect(document.activeElement).toBe(wrapper.get('[aria-label="Account menu"]').element);
      wrapper.unmount();
    });

    it('closes after choosing Settings or Privacy', async () => {
      const wrapper = mountHeader();

      for (const label of ['Settings', 'Privacy']) {
        await wrapper.get('[aria-label="Account menu"]').trigger('click');
        await wrapper
          .findAll('[role="menuitem"]')
          .find((m) => m.text() === label)!
          .trigger('click');
        expect(wrapper.find('#account-menu').exists()).toBe(false);
      }
      wrapper.unmount();
    });

    it('stops listening to the document once unmounted', async () => {
      const remove = vi.spyOn(document, 'removeEventListener');
      const wrapper = mountHeader();

      wrapper.unmount();

      expect(remove).toHaveBeenCalledWith('click', expect.any(Function));
      expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function));
      remove.mockRestore();
    });

    it('announces the unread notification count', () => {
      const wrapper = mountHeader(3);

      expect(wrapper.find('[aria-label="Notifications, 3 unread"]').exists()).toBe(true);
      expect(wrapper.get('.badge').text()).toBe('3');
      wrapper.unmount();
    });
  });
});
