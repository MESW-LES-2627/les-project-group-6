import type { ApiMe } from '@/services/api';
import type { AuthAccount, AuthProvider } from '@/services/auth';
import type { createSession as CreateSession, ProfileApi } from '@/stores/session';

export const TEST_ME: ApiMe = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  email: 'eleanor@example.com',
  username: 'eleanorreads',
  displayName: 'Eleanor Whitmore',
  timezone: 'Europe/Lisbon',
  photoUrl: null,
  profileVisibility: 'private',
  createdAt: '2026-11-01T10:00:00.000Z',
};

export const TEST_ACCOUNT: AuthAccount = {
  id: TEST_ME.id,
  email: TEST_ME.email,
  username: TEST_ME.username,
  displayName: TEST_ME.displayName,
};

/** An AuthProvider double whose signed-in account can be changed by the test. */
export function fakeAuth(account: AuthAccount | null = TEST_ACCOUNT) {
  let current = account;
  const listeners: ((a: AuthAccount | null) => void)[] = [];
  const auth: AuthProvider = {
    signIn: async () => {
      current = TEST_ACCOUNT;
      return 'authenticated';
    },
    signUp: async () => 'confirmation-required',
    signInWithOidc: async () => {},
    signOut: async () => {
      current = null;
    },
    currentAccount: async () => current,
    accessToken: async () => (current ? 'token' : null),
    onChange: (listener) => {
      listeners.push(listener);
      return () => {};
    },
  };
  return {
    auth,
    setAccount(next: AuthAccount | null) {
      current = next;
      listeners.forEach((l) => l(next));
    },
  };
}

export function fakeProfileApi(me: ApiMe | null = TEST_ME): ProfileApi {
  return {
    getMe: async () => {
      if (me) return me;
      const { ApiError } = await import('@/services/api');
      throw new ApiError('Complete your profile to continue', 403, 'PROFILE_REQUIRED');
    },
    createMe: async (payload) => ({ ...TEST_ME, ...payload }),
    isUsernameAvailable: async () => true,
  };
}

/** A real session (from `createSession`) that is already signed in with TEST_ME. */
export function readySession(createSession: typeof CreateSession) {
  return createSession(fakeAuth().auth, fakeProfileApi());
}
