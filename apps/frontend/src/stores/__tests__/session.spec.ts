import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/services/api';
import { browserTimezone, createSession, USERNAME_TAKEN } from '../session';
import { fakeAuth, fakeProfileApi, TEST_ACCOUNT, TEST_ME } from './fake-session';

const NO_METADATA = { ...TEST_ACCOUNT, username: null, displayName: null };
const SIGN_UP = {
  displayName: ' Eleanor Whitmore ',
  username: '@eleanorreads',
  email: 'eleanor@example.com',
  password: 'long-password-123',
};

describe('session store', () => {
  it('is signed out without a Supabase session', async () => {
    const session = createSession(fakeAuth(null).auth, fakeProfileApi());

    expect(await session.ensure()).toBe('signed-out');
    expect(session.state.me).toBeNull();
  });

  it('is ready when the account has a profile', async () => {
    const session = createSession(fakeAuth().auth, fakeProfileApi());

    expect(await session.ensure()).toBe('ready');
    expect(session.state.me).toEqual(TEST_ME);
  });

  it('needs the complete-profile step when the users row is missing', async () => {
    const session = createSession(fakeAuth(NO_METADATA).auth, fakeProfileApi(null));

    expect(await session.ensure()).toBe('profile-required');
  });

  it('finishes an interrupted sign-up from the metadata saved at sign-up', async () => {
    const api = fakeProfileApi(null);
    const createMe = vi.spyOn(api, 'createMe');
    const session = createSession(fakeAuth().auth, api);

    expect(await session.ensure()).toBe('ready');
    expect(createMe).toHaveBeenCalledWith({
      username: TEST_ACCOUNT.username,
      displayName: TEST_ACCOUNT.displayName,
      timezone: browserTimezone(),
    });
  });

  it('reports an unreachable API instead of pretending to be signed in', async () => {
    const api = fakeProfileApi();
    api.getMe = async () => {
      throw new ApiError('Internal server error', 500);
    };
    const session = createSession(fakeAuth().auth, api);

    expect(await session.ensure()).toBe('error');
    expect(session.state.error).toContain('could not load your profile');
  });

  it('drops the session when the API rejects the token', async () => {
    const { auth } = fakeAuth();
    const signOut = vi.spyOn(auth, 'signOut');
    const api = fakeProfileApi();
    api.getMe = async () => {
      throw new ApiError('Invalid or expired session', 401, 'UNAUTHENTICATED');
    };
    const session = createSession(auth, api);

    expect(await session.ensure()).toBe('signed-out');
    expect(signOut).toHaveBeenCalled();
    expect(session.state.error).toContain('expired');
  });

  it('checks the username before creating the Supabase account', async () => {
    const { auth } = fakeAuth(null);
    const signUp = vi.spyOn(auth, 'signUp');
    const api = fakeProfileApi(null);
    api.isUsernameAvailable = async () => false;
    const session = createSession(auth, api);

    await expect(session.signUp(SIGN_UP)).rejects.toThrow(USERNAME_TAKEN);
    expect(signUp).not.toHaveBeenCalled();
  });

  it('creates the profile with the browser timezone when sign-up returns a session', async () => {
    const { auth } = fakeAuth(null);
    auth.signUp = async () => 'authenticated';
    auth.currentAccount = async () => TEST_ACCOUNT;
    const api = fakeProfileApi(null);
    const createMe = vi.spyOn(api, 'createMe');
    const session = createSession(auth, api);

    expect(await session.signUp(SIGN_UP)).toBe('authenticated');
    expect(createMe).toHaveBeenCalledWith({
      username: 'eleanorreads',
      displayName: 'Eleanor Whitmore',
      timezone: browserTimezone(),
    });
    expect(session.state.status).toBe('ready');
  });

  it('maps a username taken meanwhile to the sign-up message', async () => {
    const api = fakeProfileApi(null);
    api.createMe = async () => {
      throw new ApiError('This username is already taken', 409, 'USERNAME_TAKEN');
    };
    const session = createSession(fakeAuth(NO_METADATA).auth, api);
    await session.ensure();

    await expect(
      session.createProfile({ username: 'ana_reads', displayName: 'Ana' }),
    ).rejects.toThrow(USERNAME_TAKEN);
    expect(session.state.status).toBe('profile-required');
  });

  it('signs out locally even when the network call fails', async () => {
    const { auth } = fakeAuth();
    auth.signOut = async () => {
      throw new Error('offline');
    };
    const session = createSession(auth, fakeProfileApi());
    await session.ensure();

    await expect(session.signOut()).rejects.toThrow('offline');
    expect(session.state.status).toBe('signed-out');
    expect(session.state.me).toBeNull();
  });

  it('follows a sign-out from another tab', async () => {
    const fake = fakeAuth();
    const session = createSession(fake.auth, fakeProfileApi());
    await session.ensure();

    fake.setAccount(null);

    expect(session.state.status).toBe('signed-out');
  });
});
