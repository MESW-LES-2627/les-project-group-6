import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/services/api';
import { createSession, type Session } from '@/stores/session';
import { fakeAuth, fakeProfileApi, TEST_ACCOUNT } from '@/stores/__tests__/fake-session';

const holder = vi.hoisted(() => ({ session: null as unknown as Session }));
vi.mock('@/stores/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/stores/session')>();
  return {
    ...actual,
    get session() {
      return holder.session;
    },
  };
});

const { default: CompleteProfileView } = await import('../CompleteProfileView.vue');

const api = fakeProfileApi(null);
const fake = fakeAuth({ ...TEST_ACCOUNT, username: null, displayName: 'Eleanor W' });

async function render() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/complete-profile', component: CompleteProfileView },
      { path: '/home', component: { template: '<p>Home</p>' } },
      { path: '/login', name: 'login', component: { template: '<p>Login</p>' } },
    ],
  });
  await router.push('/complete-profile');
  await router.isReady();
  const wrapper = mount(CompleteProfileView, { global: { plugins: [router] } });
  return { wrapper, router };
}

beforeEach(async () => {
  vi.restoreAllMocks();
  api.createMe = fakeProfileApi().createMe;
  holder.session = createSession(fake.auth, api);
  await holder.session.ensure();
});

describe('complete-profile step', () => {
  it('prefills what sign-up saved and creates the profile, then opens Home', async () => {
    const createMe = vi.spyOn(api, 'createMe');
    const { wrapper, router } = await render();
    expect(wrapper.get<HTMLInputElement>('#profile-name').element.value).toBe('Eleanor W');
    expect(wrapper.text()).toContain(TEST_ACCOUNT.email!);

    await wrapper.get('#profile-username').setValue('eleanorreads');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(createMe).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'eleanorreads', displayName: 'Eleanor W' }),
    );
    expect(holder.session.state.status).toBe('ready');
    expect(router.currentRoute.value.path).toBe('/home');
  });

  it('shows the taken-username message and stays on the step', async () => {
    api.createMe = async () => {
      throw new ApiError('This username is already taken', 409, 'USERNAME_TAKEN');
    };
    const { wrapper, router } = await render();
    await wrapper.get('#profile-username').setValue('ana_reads');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toBe('This username is already taken');
    expect(router.currentRoute.value.path).toBe('/complete-profile');
  });

  it('lets the reader log out instead', async () => {
    const { wrapper, router } = await render();
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Log out')!
      .trigger('click');
    await flushPromises();

    expect(holder.session.state.status).toBe('signed-out');
    expect(router.currentRoute.value.path).toBe('/login');
  });
});
