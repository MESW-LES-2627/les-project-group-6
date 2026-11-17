import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type SdkResult = { data: { session: object | null }; error: { message: string } | null };

const sdk = vi.hoisted(() => ({
  createClient: vi.fn<(...args: unknown[]) => unknown>(),
  signInWithPassword: vi.fn<(input: unknown) => Promise<SdkResult>>(),
  signUp: vi.fn<(input: unknown) => Promise<SdkResult>>(),
  signInWithOAuth: vi.fn<(input: unknown) => Promise<{ error: { message: string } | null }>>(),
  signOut: vi.fn<(input: unknown) => Promise<{ error: { message: string } | null }>>(),
  getSession: vi.fn<() => Promise<{ data: { session: object | null } }>>(),
  onAuthStateChange: vi.fn<(cb: (event: string, session: unknown) => void) => unknown>(),
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
  sdk.signOut.mockResolvedValue({ error: null });
  sdk.getSession.mockResolvedValue({ data: { session: null } });
  const makeStorage = () => {
    const store = new Map<string, string>();
    return {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, String(v)),
      removeItem: (k: string) => store.delete(k),
      key: (i: number) => Array.from(store.keys())[i] ?? null,
    } as Storage;
  };
  if (!window.localStorage || typeof window.localStorage.clear !== 'function') {
    Object.defineProperty(window, 'localStorage', { value: makeStorage(), configurable: true });
  }
  if (!window.sessionStorage || typeof window.sessionStorage.clear !== 'function') {
    Object.defineProperty(window, 'sessionStorage', { value: makeStorage(), configurable: true });
  }
  window.localStorage.clear();
  window.sessionStorage.clear();
  auth = await import('../auth');
});
afterEach(() => vi.unstubAllEnvs());

describe('Supabase auth adapter', () => {
  it('fails without credentials and makes no SDK or network request', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    await expect(
      auth.authProvider.signIn({
        email: 'reader@example.com',
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
          email: ' reader@example.com ',
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
            storage: auth.rememberAwareStorage,
            autoRefreshToken: true,
            detectSessionInUrl: true,
          },
        },
      );
      // The session the SDK stores lands in the storage the checkbox chose.
      auth.rememberAwareStorage.setItem('sb-session', 'value');
      const chosen = remember ? window.localStorage : window.sessionStorage;
      const other = remember ? window.sessionStorage : window.localStorage;
      expect(chosen.getItem('sb-session')).toBe('value');
      expect(other.getItem('sb-session')).toBeNull();
      expect(auth.rememberAwareStorage.getItem('sb-session')).toBe('value');
    },
  );

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
    const input = { email: 'reader@example.com', password: 'secret', remember: false };
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

  it('signs out globally so Supabase revokes the refresh tokens', async () => {
    auth.rememberAwareStorage.setItem('sb-session', 'value');
    await auth.authProvider.signOut();
    expect(sdk.signOut).toHaveBeenCalledExactlyOnceWith();
    auth.rememberAwareStorage.removeItem('sb-session');
    expect(auth.rememberAwareStorage.getItem('sb-session')).toBeNull();
  });

  it('still signs out locally when the global sign-out fails', async () => {
    sdk.signOut
      .mockResolvedValueOnce({ error: { message: 'Network error' } })
      .mockResolvedValueOnce({ error: null });
    await auth.authProvider.signOut();
    expect(sdk.signOut).toHaveBeenNthCalledWith(2, { scope: 'local' });
  });

  it('reports an error when even the local sign-out fails', async () => {
    sdk.signOut.mockResolvedValue({ error: { message: 'Storage unavailable' } });
    await expect(auth.authProvider.signOut()).rejects.toThrow('Storage unavailable');
  });

  it('exposes the access token and the account without SDK types', async () => {
    expect(await auth.authProvider.accessToken()).toBeNull();
    expect(await auth.authProvider.currentAccount()).toBeNull();

    sdk.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'jwt-token',
          user: {
            id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            email: 'reader@example.com',
            user_metadata: { username: 'reader_name', display_name: 'Reader' },
          },
        },
      },
    });
    expect(await auth.authProvider.accessToken()).toBe('jwt-token');
    expect(await auth.authProvider.currentAccount()).toEqual({
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      email: 'reader@example.com',
      username: 'reader_name',
      displayName: 'Reader',
    });
  });

  it('notifies session changes as our account shape', () => {
    const unsubscribe = vi.fn<() => void>();
    let callback!: (event: string, session: unknown) => void;
    sdk.onAuthStateChange.mockImplementation((cb) => {
      callback = cb;
      return { data: { subscription: { unsubscribe } } };
    });
    const listener = vi.fn<(account: unknown) => void>();
    const stop = auth.authProvider.onChange(listener);

    callback('SIGNED_OUT', null);
    expect(listener).toHaveBeenCalledWith(null);
    stop();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
