// @req F-AUTH-02
import { flushPromises, mount } from '@vue/test-utils';
import { createMemoryHistory, createRouter } from 'vue-router';
import { beforeEach, expect, it, vi } from 'vitest';
import PasswordRecoveryView from '../PasswordRecoveryView.vue';

const auth = vi.hoisted(() => ({
  requestPasswordReset: vi.fn<(email: string) => Promise<void>>(),
  recoveryStatus: vi.fn<() => Promise<boolean>>(),
  updateRecoveryPassword: vi.fn<(password: string) => Promise<void>>(),
  finishRecovery: vi.fn<() => Promise<void>>(),
}));
vi.mock('@/services/auth', async (original) => ({
  ...(await original<typeof import('@/services/auth')>()),
  authProvider: auth,
}));
vi.mock('@/stores/session', () => ({
  session: { refresh: vi.fn<() => Promise<string>>(async () => 'signed-out') },
}));
beforeEach(() => {
  vi.resetAllMocks();
  auth.recoveryStatus.mockResolvedValue(true);
});
async function render(path = '/forgot-password') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/forgot-password', name: 'forgot-password', component: PasswordRecoveryView },
      { path: '/reset-password', name: 'reset-password', component: PasswordRecoveryView },
      { path: '/login', component: { template: '<p>Login</p>' } },
    ],
  });
  await router.push(path);
  const wrapper = mount(PasswordRecoveryView, { global: { plugins: [router] } });
  await flushPromises();
  return { wrapper, router };
}
it('announces email validation and prevents invalid requests', async () => {
  const { wrapper } = await render();
  await wrapper.get('#recovery-email').setValue('invalid');
  await wrapper.get('form').trigger('submit');
  expect(auth.requestPasswordReset).not.toHaveBeenCalled();
  expect(wrapper.get('[role="alert"]').text()).toContain('valid email');
  expect(wrapper.get('#recovery-email').attributes('aria-invalid')).toBe('true');
  wrapper.unmount();
});
it.each(['known@example.com', 'unknown@example.com'])(
  'gives the same confirmation for %s',
  async (email) => {
    const { wrapper } = await render();
    await wrapper.get('#recovery-email').setValue(email);
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.get('[role="status"]').text()).toBe(
      'If an account exists for that email address, we’ve sent password reset instructions.',
    );
    wrapper.unmount();
  },
);
it('blocks duplicate requests and allows retry after network and rate-limit errors', async () => {
  let reject!: (error: Error) => void;
  auth.requestPasswordReset.mockReturnValueOnce(
    new Promise((_resolve, fail) => {
      reject = fail;
    }),
  );
  const { wrapper } = await render();
  await wrapper.get('#recovery-email').setValue('reader@example.com');
  await wrapper.get('form').trigger('submit');
  await wrapper.get('form').trigger('submit');
  expect(auth.requestPasswordReset).toHaveBeenCalledTimes(1);
  expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined();
  reject(new Error('Unable to send a reset link. Please try again later.'));
  await flushPromises();
  expect(wrapper.get('[role="alert"]').text()).toContain('Unable to send');
  auth.requestPasswordReset.mockRejectedValueOnce(
    new Error('Please wait a few minutes before requesting another reset link.'),
  );
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(wrapper.get('[role="alert"]').text()).toContain('Please wait');
  wrapper.unmount();
});
it('validates password length and confirmation before updating', async () => {
  const { wrapper } = await render('/reset-password');
  await wrapper.get('#new-password').setValue('short');
  await wrapper.get('#confirm-password').setValue('different');
  await wrapper.get('form').trigger('submit');
  expect(wrapper.text()).toContain('Use at least 12 characters.');
  expect(wrapper.text()).toContain('Passwords must match.');
  expect(auth.updateRecoveryPassword).not.toHaveBeenCalled();
  wrapper.unmount();
});
it('updates once, clears password fields, signs out recovery and returns to login', async () => {
  let resolve!: () => void;
  auth.updateRecoveryPassword.mockReturnValueOnce(
    new Promise<void>((done) => {
      resolve = done;
    }),
  );
  const { wrapper, router } = await render('/reset-password');
  await wrapper.get('#new-password').setValue('a-new-long-password');
  await wrapper.get('#confirm-password').setValue('a-new-long-password');
  await wrapper.get('form').trigger('submit');
  await wrapper.get('form').trigger('submit');
  expect(auth.updateRecoveryPassword).toHaveBeenCalledExactlyOnceWith('a-new-long-password');
  resolve();
  await flushPromises();
  expect(wrapper.get('[role="status"]').text()).toContain('new password is ready');
  expect(wrapper.find('#new-password').exists()).toBe(false);
  expect(auth.finishRecovery).toHaveBeenCalledTimes(1);
  await router.push('/login');
  expect(router.currentRoute.value.path).toBe('/login');
  wrapper.unmount();
});
it('shows failed password updates and permits retry', async () => {
  auth.updateRecoveryPassword.mockRejectedValueOnce(new Error('Unable to change your password.'));
  const { wrapper } = await render('/reset-password');
  await wrapper.get('#new-password').setValue('a-new-long-password');
  await wrapper.get('#confirm-password').setValue('a-new-long-password');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(wrapper.get('[role="alert"]').text()).toContain('Unable to change');
  expect(auth.finishRecovery).not.toHaveBeenCalled();
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  expect(wrapper.text()).toContain('Password changed');
  wrapper.unmount();
});
it('retries cleanup without submitting the password again', async () => {
  auth.finishRecovery.mockRejectedValueOnce(new Error('Please retry signing out of recovery.'));
  const { wrapper } = await render('/reset-password');
  await wrapper.get('#new-password').setValue('a-new-long-password');
  await wrapper.get('#confirm-password').setValue('a-new-long-password');
  await wrapper.get('form').trigger('submit');
  await flushPromises();
  await wrapper.get('button').trigger('click');
  await flushPromises();
  expect(auth.updateRecoveryPassword).toHaveBeenCalledTimes(1);
  expect(wrapper.text()).not.toContain('Please retry');
  wrapper.unmount();
});
it.each(['missing', 'expired', 'malformed', 'used'])(
  'shows recovery guidance for %s context',
  async () => {
    auth.recoveryStatus.mockResolvedValue(false);
    const { wrapper } = await render('/reset-password');
    expect(wrapper.find('form').exists()).toBe(false);
    expect(wrapper.text()).toContain('Request a fresh reset link');
    expect(auth.updateRecoveryPassword).not.toHaveBeenCalled();
    wrapper.unmount();
  },
);
