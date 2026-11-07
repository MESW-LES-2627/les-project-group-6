import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, type ApiMe, type CreateProfilePayload } from '@/services/api';
import { TEST_ME } from '@/stores/__tests__/fake-session';
import LoginView from '../LoginView.vue';

type SdkResult = { data: { session: object | null }; error: { message: string } | null };

const sdk = vi.hoisted(() => ({
  createClient: vi.fn<(...args: unknown[]) => unknown>(),
  signInWithPassword: vi.fn<(input: unknown) => Promise<SdkResult>>(),
  signUp: vi.fn<(input: unknown) => Promise<SdkResult>>(),
  getSession: vi.fn<() => Promise<{ data: { session: object | null } }>>(),
  signOut: vi.fn<() => Promise<{ error: null }>>(),
  onAuthStateChange: vi.fn<() => unknown>(() => ({
    data: { subscription: { unsubscribe: () => {} } },
  })),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: sdk.createClient }));

// The page → session store → Supabase adapter run for real; only our API is faked.
const api = vi.hoisted(() => ({
  getMe: vi.fn<() => Promise<ApiMe>>(),
  createMe: vi.fn<(payload: CreateProfilePayload) => Promise<ApiMe>>(),
  isUsernameAvailable: vi.fn<(username: string) => Promise<boolean>>(),
}));
vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  ...api,
}));

const SDK_SESSION = {
  access_token: 'jwt',
  user: { id: TEST_ME.id, email: TEST_ME.email, user_metadata: {} },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-public-key');
  sdk.createClient.mockReturnValue({ auth: sdk });
  sdk.signInWithPassword.mockResolvedValue({ data: { session: SDK_SESSION }, error: null });
  sdk.signUp.mockResolvedValue({ data: { session: null }, error: null });
  sdk.getSession.mockResolvedValue({ data: { session: SDK_SESSION } });
  api.getMe.mockResolvedValue(TEST_ME);
  api.createMe.mockImplementation(async (payload) => ({ ...TEST_ME, ...payload }));
  api.isUsernameAvailable.mockResolvedValue(true);
});
afterEach(() => vi.unstubAllEnvs());

async function render(path = '/login') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/login', component: LoginView },
      { path: '/home', component: { template: '<p>Home</p>' } },
      { path: '/library', component: { template: '<p>Library</p>' } },
      {
        path: '/complete-profile',
        name: 'complete-profile',
        component: { template: '<p>Complete</p>' },
      },
    ],
  });
  await router.push(path);
  await router.isReady();
  const wrapper = mount(LoginView, { global: { plugins: [router] } });
  return { wrapper, router };
}

async function fillSignup(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('#signup-name').setValue('Eleanor Whitmore');
  await wrapper.get('#signup-username').setValue('eleanorreads');
  await wrapper.get('#signup-email').setValue('eleanor@example.com');
  await wrapper.get('#signup-password').setValue('long-password-123');
}

describe('authentication page and Supabase integration', () => {
  it('renders both labeled forms without invented OIDC controls', async () => {
    const { wrapper } = await render();
    expect(wrapper.get('h1').text()).toBe('Welcome to Bookmarked');
    expect(wrapper.findAll('form')).toHaveLength(2);
    expect(wrapper.get('#login-password').attributes('autocomplete')).toBe('current-password');
    expect(wrapper.get('#signup-password').attributes('minlength')).toBe('12');
    expect(wrapper.text()).not.toContain('Available ·');
    expect(wrapper.text()).not.toContain('Google');
    expect(sdk.signInWithPassword).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('switches between the log in and create account tabs', async () => {
    const { wrapper } = await render();
    const hidden = (title: string) =>
      wrapper.get<HTMLFormElement>(`form[aria-labelledby="${title}"]`).element.style.display ===
      'none';
    expect(hidden('login-title')).toBe(false);
    expect(hidden('signup-title')).toBe(true);

    await wrapper
      .findAll('.page-tab')
      .find((t) => t.text() === 'Create account')!
      .trigger('click');
    expect(hidden('login-title')).toBe(true);
    expect(hidden('signup-title')).toBe(false);

    await wrapper
      .findAll('.page-tab')
      .find((t) => t.text() === 'Log in')!
      .trigger('click');
    expect(hidden('login-title')).toBe(false);
    wrapper.unmount();
  });

  it('submits the login form through the adapter and navigates only after a session', async () => {
    const { wrapper, router } = await render();
    await wrapper.get('#login-identifier').setValue('eleanor@example.com');
    await wrapper.get('#login-password').setValue('long-password-123');
    await wrapper.get('input[type="checkbox"]').setValue(true);
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(sdk.signInWithPassword).toHaveBeenCalledExactlyOnceWith({
      email: 'eleanor@example.com',
      password: 'long-password-123',
    });
    expect(router.currentRoute.value.path).toBe('/home');
    expect(wrapper.get<HTMLInputElement>('#login-password').element.value).toBe('');
    wrapper.unmount();
  });

  it('shows missing configuration without pretending to authenticate', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    const { wrapper, router } = await render();
    await wrapper.get('#login-identifier').setValue('eleanor@example.com');
    await wrapper.get('#login-password').setValue('long-password-123');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain('not available yet');
    expect(router.currentRoute.value.path).toBe('/login');
    expect(sdk.signInWithPassword).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('shows signup confirmation without navigating to Home', async () => {
    const { wrapper, router } = await render();
    await fillSignup(wrapper);
    await wrapper.get('form[aria-labelledby="signup-title"]').trigger('submit');
    await flushPromises();
    expect(sdk.signUp).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        email: 'eleanor@example.com',
        password: 'long-password-123',
        options: expect.objectContaining({
          data: { display_name: 'Eleanor Whitmore', username: 'eleanorreads' },
        }),
      }),
    );
    expect(wrapper.get('[role="status"]').text()).toContain('Check your email');
    expect(router.currentRoute.value.path).toBe('/login');
    wrapper.unmount();
  });

  it('keeps duplicate submissions out while pending, then displays provider errors', async () => {
    let rejectRequest!: (error: Error) => void;
    sdk.signInWithPassword.mockImplementationOnce(
      () =>
        new Promise((_resolve, reject) => {
          rejectRequest = reject;
        }),
    );
    const { wrapper, router } = await render();
    await wrapper.get('#login-identifier').setValue('eleanor@example.com');
    await wrapper.get('#login-password').setValue('long-password-123');
    await wrapper.get('form').trigger('submit');
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined();
    await wrapper.get('form').trigger('submit');
    rejectRequest(new Error('Invalid login credentials'));
    await flushPromises();
    expect(sdk.signInWithPassword).toHaveBeenCalledTimes(1);
    expect(wrapper.get('[role="alert"]').text()).toBe('Invalid login credentials');
    expect(router.currentRoute.value.path).toBe('/login');
    wrapper.unmount();
  });

  it('enforces required fields, email syntax, usernames and password length natively', async () => {
    const { wrapper } = await render();
    expect(wrapper.get<HTMLFormElement>('form').element.checkValidity()).toBe(false);
    await fillSignup(wrapper);
    const form = wrapper.get<HTMLFormElement>('form[aria-labelledby="signup-title"]');
    expect(form.element.checkValidity()).toBe(true);
    await wrapper.get('#signup-username').setValue('spaces not allowed');
    expect(form.element.checkValidity()).toBe(false);
    await wrapper.get('#signup-username').setValue('eleanorreads');
    await wrapper.get('#signup-email').setValue('invalid-email');
    expect(form.element.checkValidity()).toBe(false);
    wrapper.unmount();
  });

  it('returns to the page the visitor first opened after logging in', async () => {
    const { wrapper, router } = await render('/login?redirect=/library');
    await wrapper.get('#login-identifier').setValue('eleanor@example.com');
    await wrapper.get('#login-password').setValue('long-password-123');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/library');
    wrapper.unmount();
  });

  it('ignores redirects to other sites', async () => {
    const { wrapper, router } = await render('/login?redirect=//evil.example');
    await wrapper.get('#login-identifier').setValue('eleanor@example.com');
    await wrapper.get('#login-password').setValue('long-password-123');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/home');
    wrapper.unmount();
  });

  it('sends a reader without a profile to the complete-profile step', async () => {
    api.getMe.mockRejectedValue(new ApiError('Complete your profile', 403, 'PROFILE_REQUIRED'));
    const { wrapper, router } = await render();
    await wrapper.get('#login-identifier').setValue('eleanor@example.com');
    await wrapper.get('#login-password').setValue('long-password-123');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(router.currentRoute.value.path).toBe('/complete-profile');
    wrapper.unmount();
  });

  it('rejects a taken username before creating the account', async () => {
    api.isUsernameAvailable.mockResolvedValue(false);
    const { wrapper, router } = await render();
    await fillSignup(wrapper);
    await wrapper.get('form[aria-labelledby="signup-title"]').trigger('submit');
    await flushPromises();
    expect(api.isUsernameAvailable).toHaveBeenCalledWith('eleanorreads');
    expect(wrapper.get('[role="alert"]').text()).toBe('This username is already taken');
    expect(sdk.signUp).not.toHaveBeenCalled();
    expect(router.currentRoute.value.path).toBe('/login');
    wrapper.unmount();
  });

  it('creates the profile with the browser timezone and opens Home after an instant sign-up', async () => {
    sdk.signUp.mockResolvedValue({ data: { session: SDK_SESSION }, error: null });
    const { wrapper, router } = await render();
    await fillSignup(wrapper);
    await wrapper.get('form[aria-labelledby="signup-title"]').trigger('submit');
    await flushPromises();
    expect(api.createMe).toHaveBeenCalledExactlyOnceWith({
      username: 'eleanorreads',
      displayName: 'Eleanor Whitmore',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    expect(router.currentRoute.value.path).toBe('/home');
    wrapper.unmount();
  });
});
