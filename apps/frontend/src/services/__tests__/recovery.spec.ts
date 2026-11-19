// @req F-AUTH-02 F-AUTH-01
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthProvider, type AuthClient } from '../auth';

const account = { id: 'reader', email: 'reader@example.com' };
function recoverySession(id = 'recovery-session') {
  return {
    access_token: `header.${btoa(JSON.stringify({ session_id: id }))}.signature`,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: account,
  };
}
function setup() {
  let current: ReturnType<typeof recoverySession> | null = null;
  let callback: (event: string, session: unknown) => void = () => {};
  const sdk = {
    onAuthStateChange: vi.fn<(cb: typeof callback) => void>((cb: typeof callback) => {
      callback = cb;
    }),
    getSession: vi.fn<() => Promise<{ data: { session: typeof current } }>>(async () => ({
      data: { session: current },
    })),
    resetPasswordForEmail: vi.fn<
      (
        email: string,
        options: unknown,
      ) => Promise<{ error: { status?: number; code?: string; message: string } | null }>
    >(
      async (
        _email: string,
        _options: unknown,
      ): Promise<{ error: { status?: number; code?: string; message: string } | null }> => ({
        error: null,
      }),
    ),
    getUser: vi.fn<() => Promise<{ error: object | null }>>(
      async (): Promise<{ error: object | null }> => ({ error: null }),
    ),
    updateUser: vi.fn<
      (input: unknown) => Promise<{ error: { status?: number; message: string } | null }>
    >(async (_input: unknown): Promise<{ error: { status?: number; message: string } | null }> => ({
      error: null,
    })),
    signOut: vi.fn<(input: unknown) => Promise<{ error: object | null }>>(
      async (_input: unknown): Promise<{ error: object | null }> => ({ error: null }),
    ),
  };
  const provider = () => createAuthProvider(() => ({ auth: sdk }) as unknown as AuthClient);
  const auth = provider();
  function emit(event = 'PASSWORD_RECOVERY', id = 'recovery-session') {
    current = recoverySession(id);
    callback(event, current);
  }
  return {
    sdk,
    auth,
    emit,
    provider,
    setCurrent(value: typeof current) {
      current = value;
    },
  };
}
beforeEach(() => {
  window.sessionStorage.clear();
  window.history.replaceState({}, '', '/reset-password');
  vi.unstubAllEnvs();
});

describe('password recovery adapter', () => {
  it.each(['', 'bad', 'a@', 'a@b', 'a b@example.com'])(
    'rejects invalid email %s before the SDK request',
    async (email) => {
      const { auth, sdk } = setup();
      await expect(auth.requestPasswordReset(email)).rejects.toThrow('valid email');
      expect(sdk.resetPasswordForEmail).not.toHaveBeenCalled();
    },
  );
  it.each(['known@example.com', 'unknown@example.com'])(
    'returns the same successful outcome for %s',
    async (email) => {
      const { auth, sdk } = setup();
      vi.stubEnv('BASE_URL', '/bookmarked/');
      await expect(auth.requestPasswordReset(` ${email} `)).resolves.toBeUndefined();
      expect(sdk.resetPasswordForEmail).toHaveBeenCalledWith(email, {
        redirectTo: `${window.location.origin}/bookmarked/reset-password`,
      });
    },
  );
  it('uses generic network and provider errors, with safe rate-limit guidance', async () => {
    const { auth, sdk } = setup();
    sdk.resetPasswordForEmail.mockRejectedValueOnce(new Error('private account details'));
    await expect(auth.requestPasswordReset('reader@example.com')).rejects.toThrow('Unable to send');
    sdk.resetPasswordForEmail.mockRejectedValueOnce(
      new Error('Please wait; private account details'),
    );
    await expect(auth.requestPasswordReset('reader@example.com')).rejects.toThrow('Unable to send');
    sdk.resetPasswordForEmail.mockResolvedValueOnce({
      error: { status: 400, message: 'User not found' },
    });
    await expect(auth.requestPasswordReset('reader@example.com')).rejects.toThrow('Unable to send');
    sdk.resetPasswordForEmail.mockResolvedValueOnce({
      error: { status: 429, message: 'rate limit' },
    });
    await expect(auth.requestPasswordReset('reader@example.com')).rejects.toThrow('Please wait');
  });
  it('rejects missing context and an ordinary existing session', async () => {
    const { auth, sdk, setCurrent } = setup();
    expect(await auth.recoveryStatus()).toBe(false);
    setCurrent(recoverySession('ordinary'));
    expect(await auth.recoveryStatus()).toBe(false);
    await expect(auth.updateRecoveryPassword('a-long-new-password')).rejects.toThrow('invalid');
    await auth.finishRecovery();
    expect(sdk.updateUser).not.toHaveBeenCalled();
    expect(sdk.signOut).not.toHaveBeenCalled();
  });
  it('accepts only a recovery event and restores matching context after refresh', async () => {
    const { auth, sdk, emit, provider } = setup();
    await auth.recoveryStatus();
    emit('SIGNED_IN');
    expect(await auth.recoveryStatus()).toBe(false);
    emit();
    expect(await auth.recoveryStatus()).toBe(true);
    const restored = provider();
    sdk.getSession.mockImplementationOnce(async () => {
      emit('SIGNED_IN');
      return { data: { session: recoverySession() } };
    });
    expect(await restored.recoveryStatus()).toBe(true);
  });
  it('handles a recovery event queued during SDK initialization and scrubs the fragment', async () => {
    const { auth, sdk, emit } = setup();
    window.history.replaceState({}, '', '/reset-password#type=recovery&access_token=synthetic');
    sdk.getSession.mockImplementationOnce(async () => {
      setTimeout(() => emit(), 0);
      return { data: { session: recoverySession() } };
    });
    expect(await auth.recoveryStatus()).toBe(true);
    expect(window.location.hash).toBe('');
  });
  it('rejects expired and mismatched recovery context without signing out another session', async () => {
    const { auth, emit, sdk, setCurrent } = setup();
    await auth.recoveryStatus();
    emit();
    setCurrent(recoverySession('another-session'));
    expect(await auth.recoveryStatus()).toBe(false);
    await auth.finishRecovery();
    expect(sdk.signOut).not.toHaveBeenCalled();
    window.sessionStorage.setItem(
      'bookmarked.recovery',
      JSON.stringify({ id: 'another-session', until: Date.now() - 1, consumed: false }),
    );
    const expired = createAuthProvider(() => ({ auth: sdk }) as unknown as AuthClient);
    expect(await expired.recoveryStatus()).toBe(false);
    expect(await expired.hasRecoverySession()).toBe(true);
  });
  it('rejects malformed storage and error callbacks even with a signed-in session', async () => {
    const { sdk, setCurrent } = setup();
    setCurrent(recoverySession());
    window.sessionStorage.setItem('bookmarked.recovery', 'broken-json');
    window.history.replaceState(
      {},
      '',
      '/reset-password#error=access_denied&error_code=otp_expired',
    );
    const auth = createAuthProvider(() => ({ auth: sdk }) as unknown as AuthClient);
    expect(await auth.recoveryStatus()).toBe(false);
    await auth.finishRecovery();
    expect(sdk.signOut).not.toHaveBeenCalled();
  });
  it('does not accept a malformed new callback as a previously valid recovery session', async () => {
    const { auth, sdk, emit, provider } = setup();
    await auth.recoveryStatus();
    emit();
    expect(await auth.recoveryStatus()).toBe(true);
    window.history.replaceState({}, '', '/reset-password?code=malformed#type=recovery');
    const reopened = provider();
    expect(await reopened.recoveryStatus()).toBe(false);
    await expect(reopened.updateRecoveryPassword('twelve-characters')).rejects.toThrow('invalid');
    expect(sdk.updateUser).not.toHaveBeenCalled();
    expect(window.location.search).toBe('');
    expect(window.location.hash).toBe('');
  });
  it('validates passwords, updates successfully once, and cleans only the local recovery session', async () => {
    const { auth, emit, sdk, provider } = setup();
    await auth.recoveryStatus();
    emit();
    await expect(auth.updateRecoveryPassword('short')).rejects.toThrow('12');
    expect(sdk.updateUser).not.toHaveBeenCalled();
    await auth.updateRecoveryPassword('twelve-characters');
    expect(sdk.updateUser).toHaveBeenCalledExactlyOnceWith({ password: 'twelve-characters' });
    await expect(auth.updateRecoveryPassword('twelve-characters')).rejects.toThrow('invalid');
    expect(await auth.hasRecoverySession()).toBe(true);
    await auth.finishRecovery();
    expect(sdk.signOut).toHaveBeenCalledExactlyOnceWith({ scope: 'local' });
    const reopened = provider();
    await reopened.recoveryStatus();
    emit();
    expect(await reopened.recoveryStatus()).toBe(false);
  });
  it('retains cleanup ownership after a sign-out error, without allowing another update', async () => {
    const { auth, emit, sdk } = setup();
    await auth.recoveryStatus();
    emit();
    await auth.updateRecoveryPassword('twelve-characters');
    sdk.signOut.mockResolvedValueOnce({ error: { message: 'network' } });
    await expect(auth.finishRecovery()).rejects.toThrow('retry');
    expect(await auth.recoveryStatus()).toBe(false);
    await auth.finishRecovery();
    expect(sdk.signOut).toHaveBeenCalledTimes(2);
  });
  it('rejects revoked sessions and safely handles failed updates', async () => {
    const { auth, emit, sdk } = setup();
    await auth.recoveryStatus();
    emit();
    sdk.getUser.mockRejectedValueOnce(new Error('private provider details'));
    await expect(auth.updateRecoveryPassword('twelve-characters')).rejects.toThrow(
      'Unable to verify',
    );
    sdk.updateUser.mockRejectedValueOnce(new Error('private provider details'));
    await expect(auth.updateRecoveryPassword('twelve-characters')).rejects.toThrow(
      'Unable to change',
    );
    sdk.updateUser.mockClear();
    sdk.getUser.mockResolvedValueOnce({ error: { status: 401, message: 'expired' } });
    await expect(auth.updateRecoveryPassword('twelve-characters')).rejects.toThrow('invalid');
    expect(sdk.updateUser).not.toHaveBeenCalled();
    emit('PASSWORD_RECOVERY', 'fresh-session');
    sdk.updateUser.mockResolvedValueOnce({ error: { message: 'sensitive error' } });
    await expect(auth.updateRecoveryPassword('twelve-characters')).rejects.toThrow(
      'Unable to change',
    );
    expect(await auth.recoveryStatus()).toBe(true);
    sdk.updateUser.mockResolvedValueOnce({ error: { status: 401, message: 'expired' } });
    await expect(auth.updateRecoveryPassword('twelve-characters')).rejects.toThrow('invalid');
  });
});
