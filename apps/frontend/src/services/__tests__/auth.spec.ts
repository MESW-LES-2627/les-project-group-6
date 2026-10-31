import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type SdkResult = { data: { session: object | null }; error: { message: string } | null };

const sdk = vi.hoisted(() => ({
  createClient: vi.fn<(...args: unknown[]) => unknown>(),
  signInWithPassword: vi.fn<(input: unknown) => Promise<SdkResult>>(),
  signUp: vi.fn<(input: unknown) => Promise<SdkResult>>(),
  signInWithOAuth: vi.fn<(input: unknown) => Promise<{ error: { message: string } | null }>>(),
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: sdk.createClient }));

let auth: typeof import('../auth');

beforeEach(async () => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'test-public-key');
  sdk.createClient.mockReturnValue({ auth: sdk });
  sdk.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
  sdk.signUp.mockResolvedValue({ data: { session: null }, error: null });
  sdk.signInWithOAuth.mockResolvedValue({ error: null });
  auth = await import('../auth');
});
afterEach(() => vi.unstubAllEnvs());

describe('Supabase auth adapter', () => {
  it('fails without credentials and makes no SDK or network request', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    await expect(
      auth.authProvider.signIn({
        identifier: 'reader@example.com',
        password: 'secret',
        remember: false,
      }),
    ).rejects.toThrow('Sign in is not available yet');
    expect(sdk.createClient).not.toHaveBeenCalled();
    expect(sdk.signInWithPassword).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    'logs in with the selected persistence (remember=%s)',
    async (remember) => {
      await expect(
        auth.authProvider.signIn({
          identifier: ' reader@example.com ',
          password: 'secret',
          remember,
        }),
      ).resolves.toBe('authenticated');
      expect(sdk.signInWithPassword).toHaveBeenCalledExactlyOnceWith({
        email: 'reader@example.com',
        password: 'secret',
      });
      expect(sdk.createClient).toHaveBeenCalledExactlyOnceWith(
        'https://example.supabase.co',
        'test-public-key',
        {
          auth: {
            persistSession: true,
            storage: remember ? window.localStorage : window.sessionStorage,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        },
      );
    },
  );

  it.each(['reader_name', '@reader_name'])(
    'resolves username %s through the injected backend hook',
    async (identifier) => {
      const resolve = vi
        .fn<(username: string) => Promise<string>>()
        .mockResolvedValue('reader@example.com');
      const provider = auth.createAuthProvider(auth.getSupabaseClient, resolve);
      await provider.signIn({ identifier, password: 'secret', remember: false });
      expect(resolve).toHaveBeenCalledExactlyOnceWith('reader_name');
      expect(sdk.signInWithPassword).toHaveBeenCalledExactlyOnceWith({
        email: 'reader@example.com',
        password: 'secret',
      });
    },
  );

  it('does not invent a username lookup when the backend is not ready', async () => {
    await expect(
      auth.authProvider.signIn({ identifier: 'reader_name', password: 'secret', remember: false }),
    ).rejects.toThrow('Username sign-in is not available yet');
    expect(sdk.createClient).not.toHaveBeenCalled();
  });

  it('maps signup profile metadata and waits for email confirmation', async () => {
    await expect(
      auth.authProvider.signUp({
        displayName: ' Reader ',
        username: '@reader_name',
        email: 'reader@example.com',
        password: 'long-password',
      }),
    ).resolves.toBe('confirmation-required');
    expect(sdk.signUp).toHaveBeenCalledExactlyOnceWith({
      email: 'reader@example.com',
      password: 'long-password',
      options: {
        data: { display_name: 'Reader', username: 'reader_name' },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
  });

  it('recognizes an immediate signup session', async () => {
    sdk.signUp.mockResolvedValue({ data: { session: {} }, error: null });
    await expect(
      auth.authProvider.signUp({
        displayName: 'Reader',
        username: 'reader',
        email: 'reader@example.com',
        password: 'long-password',
      }),
    ).resolves.toBe('authenticated');
  });

  it('prepares OIDC provider sign-in with a local Home callback', async () => {
    await auth.authProvider.signInWithOidc('google');
    expect(sdk.signInWithOAuth).toHaveBeenCalledExactlyOnceWith({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/home` },
    });
  });

  it('propagates provider errors and rejects missing sessions', async () => {
    sdk.signInWithPassword.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    });
    const input = { identifier: 'reader@example.com', password: 'secret', remember: false };
    await expect(auth.authProvider.signIn(input)).rejects.toThrow('Invalid login credentials');
    sdk.signInWithPassword.mockResolvedValueOnce({ data: { session: null }, error: null });
    await expect(auth.authProvider.signIn(input)).rejects.toThrow('did not create a session');
    sdk.signUp.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Signup unavailable' },
    });
    await expect(
      auth.authProvider.signUp({
        displayName: 'Reader',
        username: 'reader',
        email: 'reader@example.com',
        password: 'long-password',
      }),
    ).rejects.toThrow('Signup unavailable');
    sdk.signInWithOAuth.mockResolvedValueOnce({ error: { message: 'Provider unavailable' } });
    await expect(auth.authProvider.signInWithOidc('google')).rejects.toThrow(
      'Provider unavailable',
    );
  });
});
