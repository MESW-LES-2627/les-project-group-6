// @req F-AUTH-02
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';

import { TEST_ME } from '@/stores/__tests__/fake-session';
import App from '../App.vue';

const fakeSession = vi.hoisted(() => ({
  state: { me: null as { displayName: string } | null },
  signOut: vi.fn<() => Promise<void>>(),
}));

vi.mock('@/stores/session', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/stores/session')>()),
  session: fakeSession,
}));

async function mountApp(path = '/home', errorHandler?: (error: unknown) => void) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/home', name: 'home', component: { template: '<p class="page">Home page</p>' } },
      {
        path: '/login',
        name: 'login',
        component: { template: '<p class="page">Login page</p>' },
        meta: { hideAppChrome: true },
      },
    ],
  });
  await router.push(path);
  const wrapper = mount(App, {
    global: { plugins: [router], config: errorHandler ? { errorHandler } : {} },
    attachTo: document.body,
  });
  await flushPromises();
  return { wrapper, router };
}

async function clickSignOut(wrapper: Awaited<ReturnType<typeof mountApp>>['wrapper']) {
  await wrapper.get('[aria-label="Account menu"]').trigger('click');
  await wrapper
    .findAll('[role="menuitem"]')
    .find((m) => m.text() === 'Sign out')!
    .trigger('click');
  await flushPromises();
}

beforeEach(() => {
  vi.clearAllMocks();
  fakeSession.state.me = { displayName: TEST_ME.displayName };
});

describe('App', () => {
  it('shows the header with the reader initials, the page and the footer', async () => {
    const { wrapper } = await mountApp();

    expect(wrapper.find('header').exists()).toBe(true);
    expect(wrapper.get('[aria-label="Account menu"]').text()).toContain('EW');
    expect(wrapper.get('.page').text()).toBe('Home page');
    expect(wrapper.get('footer').text()).toContain('Bookmarked');
    wrapper.unmount();
  });

  it('shows no initials without a signed-in reader', async () => {
    fakeSession.state.me = null;
    const { wrapper } = await mountApp();

    expect(wrapper.get('[aria-label="Account menu"]').text()).not.toContain('EW');
    wrapper.unmount();
  });

  it('hides the header and footer on pages without app chrome', async () => {
    const { wrapper } = await mountApp('/login');

    expect(wrapper.get('.page').text()).toBe('Login page');
    expect(wrapper.find('header').exists()).toBe(false);
    expect(wrapper.find('footer').exists()).toBe(false);
    wrapper.unmount();
  });

  it('signs out and goes to the login page', async () => {
    fakeSession.signOut.mockResolvedValue();
    const { wrapper, router } = await mountApp();

    await clickSignOut(wrapper);

    expect(fakeSession.signOut).toHaveBeenCalledTimes(1);
    expect(router.currentRoute.value.name).toBe('login');
    wrapper.unmount();
  });

  it('still goes to the login page when signing out fails', async () => {
    fakeSession.signOut.mockRejectedValue(new Error('offline'));
    const errorHandler = vi.fn<(error: unknown) => void>();
    const { wrapper, router } = await mountApp('/home', errorHandler);

    await clickSignOut(wrapper);

    expect(router.currentRoute.value.name).toBe('login');
    expect(errorHandler).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'offline' }),
      expect.anything(),
      expect.any(String),
    );
    wrapper.unmount();
  });
});
