import { computed, reactive, readonly } from 'vue';
import {
  ApiError,
  createMe,
  getMe,
  isUsernameAvailable,
  type ApiMe,
  type CreateProfilePayload,
} from '@/services/api';
import {
  authProvider,
  type AuthAccount,
  type AuthOutcome,
  type AuthProvider,
  type SignInInput,
  type SignUpInput,
} from '@/services/auth';

/**
 * - `unknown`: not checked yet (first navigation)
 * - `signed-out`: no Supabase session
 * - `profile-required`: a session but no `users` row (interrupted sign-up)
 * - `ready`: signed in with a profile
 * - `error`: signed in, but the API could not be reached
 * - `recovery`: recovery owns the session; finish or abandon it before loading a profile
 */
export type SessionStatus =
  'unknown' | 'signed-out' | 'profile-required' | 'ready' | 'error' | 'recovery';

export interface SessionState {
  status: SessionStatus;
  account: AuthAccount | null;
  me: ApiMe | null;
  error: string | null;
}

export interface ProfileApi {
  getMe(): Promise<ApiMe>;
  createMe(payload: CreateProfilePayload): Promise<ApiMe>;
  isUsernameAvailable(username: string): Promise<boolean>;
}

export const USERNAME_TAKEN = 'This username is already taken';

/** The browser's IANA time zone, stored on the profile (F-AUTH-01). */
export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Lisbon';
  } catch {
    return 'Europe/Lisbon';
  }
}

const normalizeUsername = (raw: string) => raw.trim().replace(/^@/, '');

const isProfileRequired = (error: unknown) =>
  error instanceof ApiError && error.code === 'PROFILE_REQUIRED';

export function createSession(
  auth: AuthProvider = authProvider,
  api: ProfileApi = { getMe, createMe, isUsernameAvailable },
) {
  const state = reactive<SessionState>({
    status: 'unknown',
    account: null,
    me: null,
    error: null,
  });
  let started: Promise<unknown> | null = null;

  function reset(status: SessionStatus = 'signed-out') {
    state.status = status;
    state.account = null;
    state.me = null;
  }

  async function createProfile(payload: Omit<CreateProfilePayload, 'timezone'>): Promise<ApiMe> {
    try {
      state.me = await api.createMe({
        username: normalizeUsername(payload.username),
        displayName: payload.displayName.trim(),
        timezone: browserTimezone(),
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === 'USERNAME_TAKEN') {
        throw new Error(USERNAME_TAKEN);
      }
      throw error;
    }
    state.status = 'ready';
    return state.me;
  }

  /** Re-reads the Supabase session and our profile. */
  async function refresh(): Promise<SessionStatus> {
    state.error = null;
    if (await isRecovering()) {
      reset('recovery');
      return state.status;
    }
    let account: AuthAccount | null;
    try {
      account = await auth.currentAccount();
    } catch {
      account = null; // Supabase is not configured: nobody can be signed in.
    }
    if (!account) {
      reset();
      return state.status;
    }
    state.account = account;
    try {
      state.me = await api.getMe();
      state.status = 'ready';
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // The API rejected the token (expired, revoked or from another project).
        void auth.signOut().catch(() => {});
        reset();
        state.error = 'Your session has expired. Please log in again.';
        return state.status;
      }
      if (!isProfileRequired(error)) {
        state.me = null;
        state.status = 'error';
        state.error = 'We could not load your profile. Please try again.';
        return state.status;
      }
      state.status = 'profile-required';
      // Sign-up stored username and display name as metadata: finish it silently.
      if (account.username && account.displayName) {
        try {
          await createProfile({ username: account.username, displayName: account.displayName });
        } catch {
          // e.g. the username was taken meanwhile: the complete-profile page asks again.
        }
      }
    }
    return state.status;
  }

  /** Waits for the first session check, then returns the current status. */
  async function ensure(): Promise<SessionStatus> {
    if (!started) {
      started = refresh();
      try {
        auth.onChange((account) => {
          // Signed out in another tab, or the refresh token was revoked.
          if (!account && state.status !== 'signed-out') reset();
        });
      } catch {
        // Supabase is not configured; there is nothing to listen to.
      }
    }
    await started;
    return state.status;
  }

  async function signIn(input: SignInInput): Promise<SessionStatus> {
    await auth.signIn(input);
    return refresh();
  }

  /**
   * Checks the username first, so a taken one never creates a Supabase account,
   * then creates the account and, when a session is returned, the profile.
   */
  async function signUp(input: SignUpInput): Promise<AuthOutcome> {
    const username = normalizeUsername(input.username);
    if (!(await api.isUsernameAvailable(username))) throw new Error(USERNAME_TAKEN);
    const outcome = await auth.signUp({ ...input, username });
    if (outcome === 'authenticated') {
      state.account = await auth.currentAccount();
      state.status = 'profile-required';
      await createProfile({ username, displayName: input.displayName });
    }
    return outcome;
  }

  async function signOut(): Promise<void> {
    try {
      await auth.signOut();
    } finally {
      reset();
    }
  }

  /** The API rejected the token: drop the local session. */
  function expire(): void {
    if (state.status === 'signed-out') return;
    void auth.signOut().catch(() => {});
    reset();
  }

  async function isRecovering(): Promise<boolean> {
    try {
      return await auth.hasRecoverySession();
    } catch {
      return false;
    }
  }

  return {
    isRecovering,
    state: readonly(state),
    ensure,
    refresh,
    signIn,
    signUp,
    signOut,
    expire,
    createProfile,
  };
}

export type Session = ReturnType<typeof createSession>;

export const session = createSession();

/** True once the reader is signed in with a profile. */
export const isSignedIn = computed(() => session.state.status === 'ready');

/** The signed-in reader's id. Only call on pages behind the router guard. */
export function currentUserId(): string {
  const id = session.state.me?.id;
  if (!id) throw new Error('No signed-in reader');
  return id;
}
