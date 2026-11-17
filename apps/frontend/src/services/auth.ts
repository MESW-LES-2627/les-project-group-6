import {
  createClient,
  type Provider,
  type SupabaseClient,
  type Session as SdkSession,
} from '@supabase/supabase-js';

export interface SignInInput {
  email: string;
  password: string;
  remember: boolean;
}

export interface SignUpInput {
  displayName: string;
  username: string;
  email: string;
  password: string;
}

export type AuthOutcome = 'authenticated' | 'confirmation-required';

/** The signed-in Supabase account, in our own shape (no SDK types leak out). */
export interface AuthAccount {
  id: string;
  email: string | null;
  /** What the sign-up form sent as metadata, used to finish an interrupted sign-up. */
  username: string | null;
  displayName: string | null;
}

export interface AuthProvider {
  signIn(input: SignInInput): Promise<AuthOutcome>;
  signUp(input: SignUpInput): Promise<AuthOutcome>;
  signInWithOidc(provider: Provider): Promise<void>;
  signOut(): Promise<void>;
  requestPasswordReset(email: string): Promise<void>;
  recoveryStatus(): Promise<boolean>;
  hasRecoverySession(): Promise<boolean>;
  updateRecoveryPassword(password: string): Promise<void>;
  finishRecovery(): Promise<void>;
  /** The account of the stored session, or null when signed out. */
  currentAccount(): Promise<AuthAccount | null>;
  /** A fresh access token for `Authorization: Bearer`, or null when signed out. */
  accessToken(): Promise<string | null>;
  /** Calls back whenever the session is created, refreshed or removed. */
  onChange(listener: (account: AuthAccount | null) => void): () => void;
}

export type AuthClient = Pick<SupabaseClient, 'auth'>;

const REMEMBER_KEY = 'bookmarked.remember';

/**
 * Session storage that follows "Keep me signed in": local storage when checked,
 * session storage (gone when the browser closes) otherwise. Reads check both, so
 * one client restores either kind of session.
 */
export const rememberAwareStorage = {
  remember(value: boolean): void {
    try {
      if (value) window.localStorage.setItem(REMEMBER_KEY, '1');
      else window.localStorage.removeItem(REMEMBER_KEY);
    } catch {
      // Storage can be blocked (private mode); the session still lives in memory.
    }
  },
  getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      const keep = window.localStorage.getItem(REMEMBER_KEY) === '1';
      (keep ? window.localStorage : window.sessionStorage).setItem(key, value);
      (keep ? window.sessionStorage : window.localStorage).removeItem(key);
    } catch {
      // See remember().
    }
  },
  removeItem(key: string): void {
    try {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } catch {
      // See remember().
    }
  },
};

let client: SupabaseClient | null = null;

export function isAuthConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function getSupabaseClient(): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error('Sign in is not available yet. Please try again later.');
  }
  client ??= createClient(url, key, {
    auth: {
      persistSession: true,
      storage: rememberAwareStorage,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

interface SdkUser {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

const text = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : null;

export function toAccount(user: SdkUser | null | undefined): AuthAccount | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    username: text(user.user_metadata?.username),
    displayName: text(user.user_metadata?.display_name),
  };
}

export const PASSWORD_MIN_LENGTH = 12;
export const validEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
const RECOVERY_KEY = 'bookmarked.recovery';
const USED_RECOVERY_KEY = 'bookmarked.used-recovery';
const INVALID_RECOVERY = 'This reset link is invalid or has expired. Request a new link.';

/** Identifies the SDK session without copying its credentials into another store. */
function sessionId(session: SdkSession | null): string | null {
  try {
    const payload = session?.access_token.split('.')[1];
    if (!payload) return null;
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
      session_id?: unknown;
    };
    return typeof claims.session_id === 'string' ? claims.session_id : null;
  } catch {
    return null;
  }
}

interface RecoveryContext {
  id: string;
  until: number;
  consumed: boolean;
}

export function createAuthProvider(
  getClient: () => AuthClient = getSupabaseClient,
  remember: (value: boolean) => void = rememberAwareStorage.remember,
): AuthProvider {
  let subscribed = false;
  let context: RecoveryContext | null = null;
  let used: Record<string, number> = {};
  try {
    used = JSON.parse(window.sessionStorage.getItem(USED_RECOVERY_KEY) ?? '{}') as Record<
      string,
      number
    >;
  } catch {
    /* In-memory fallback. */
  }
  function consume() {
    if (!context) return;
    context.consumed = true;
    used[context.id] = context.until;
    try {
      window.sessionStorage.setItem(USED_RECOVERY_KEY, JSON.stringify(used));
    } catch {
      /* In-memory fallback. */
    }
  }
  try {
    context = JSON.parse(
      window.sessionStorage.getItem(RECOVERY_KEY) ?? 'null',
    ) as RecoveryContext | null;
  } catch {
    /* Storage unavailable: recovery still works until refresh. */
  }
  const callback = new URL(window.location.href);
  const hasCallback =
    Boolean(callback.hash) ||
    ['code', 'error', 'error_code'].some((key) => callback.searchParams.has(key));
  let receivedRecovery = false;
  const invalidCallback = callback.hash.includes('error=') || callback.searchParams.has('error');
  const saveContext = () => {
    try {
      if (context) window.sessionStorage.setItem(RECOVERY_KEY, JSON.stringify(context));
      else window.sessionStorage.removeItem(RECOVERY_KEY);
    } catch {
      /* Keep context in memory when storage is unavailable. */
    }
  };
  const sdk = () => {
    const instance = getClient();
    if (!subscribed) {
      subscribed = true;
      // Subscribe before SDK initialization completes. Never await SDK calls in this callback.
      instance.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          receivedRecovery = true;
          const id = sessionId(session);
          context =
            id && session?.expires_at
              ? {
                  id,
                  until: Math.min(
                    context?.id === id ? context.until : Infinity,
                    session.expires_at * 1000,
                    Date.now() + 3_600_000,
                  ),
                  consumed: Boolean(used[id]),
                }
              : null;
          saveContext();
        } else if (
          event === 'SIGNED_OUT' ||
          (event === 'SIGNED_IN' && context?.id !== sessionId(session))
        ) {
          context = null;
          saveContext();
        }
      });
    }
    return instance;
  };
  async function recoverySession() {
    const recoveryCallback =
      callback.hash.includes('type=recovery') || window.location.hash.includes('type=recovery');
    const instance = sdk();
    const { data } = await instance.auth.getSession();
    // Implicit URL initialization queues PASSWORD_RECOVERY on the next task.
    if (recoveryCallback) await new Promise<void>((resolve) => setTimeout(resolve, 0));
    if (window.location.pathname.endsWith('/reset-password')) {
      const clean = new URL(window.location.href);
      for (const key of [
        'code',
        'error',
        'error_code',
        'error_description',
        'access_token',
        'refresh_token',
      ])
        clean.searchParams.delete(key);
      window.history.replaceState(window.history.state, '', clean.pathname + clean.search);
    }
    return data.session;
  }
  async function recoveryStatus(): Promise<boolean> {
    const session = await recoverySession();
    return Boolean(
      !invalidCallback &&
      (!hasCallback || receivedRecovery) &&
      context &&
      !context.consumed &&
      context.until > Date.now() &&
      context.id === sessionId(session),
    );
  }
  async function finishRecovery(): Promise<void> {
    const session = await recoverySession();
    // An invalid/direct visit must never sign out an unrelated account.
    if (context && context.id === sessionId(session)) {
      consume();
      saveContext();
      const { error } = await sdk().auth.signOut({ scope: 'local' });
      if (error) throw new Error('Unable to sign out of recovery. Please retry.');
    }
    context = null;
    saveContext();
  }
  return {
    recoveryStatus,
    async hasRecoverySession() {
      const session = await recoverySession();
      return Boolean(context && context.id === sessionId(session));
    },
    finishRecovery,
    async requestPasswordReset(email) {
      if (!validEmail(email)) throw new Error('Enter a valid email address.');
      let rateLimited = false;
      try {
        const redirectTo = new URL(
          `${import.meta.env.BASE_URL}reset-password`,
          window.location.origin,
        ).href;
        const { error } = await sdk().auth.resetPasswordForEmail(email.trim(), { redirectTo });
        if (error) {
          rateLimited = error.status === 429 || error.code === 'over_email_send_rate_limit';
          throw error;
        }
      } catch {
        throw new Error(
          rateLimited
            ? 'Please wait a few minutes before requesting another reset link.'
            : 'Unable to send a reset link. Please try again later.',
        );
      }
    },
    async updateRecoveryPassword(password) {
      if (password.length < PASSWORD_MIN_LENGTH) throw new Error('Use at least 12 characters.');
      if (!(await recoveryStatus())) throw new Error(INVALID_RECOVERY);
      // Validate with Auth as well as the locally restored SDK session before updating.
      const { error: userError } = await sdk()
        .auth.getUser()
        .catch(() => {
          throw new Error('Unable to verify your reset link. Please try again.');
        });
      if (userError) {
        if (userError.status === 401 || userError.status === 403) {
          consume();
          saveContext();
          throw new Error(INVALID_RECOVERY);
        }
        throw new Error(
          'Unable to verify your reset link. Please try again or request a new link.',
        );
      }
      if (!(await recoveryStatus())) throw new Error(INVALID_RECOVERY);
      const { error } = await sdk()
        .auth.updateUser({ password })
        .catch(() => {
          throw new Error('Unable to change your password. Try again or request a new link.');
        });
      if (error) {
        if (error.status === 401 || error.status === 403) {
          consume();
          saveContext();
          throw new Error(INVALID_RECOVERY);
        }
        throw new Error('Unable to change your password. Try again or request a new link.');
      }
      consume();
      saveContext();
    },
    // Supabase signs in by email only. Username login would need a public
    // username -> email lookup, which leaks emails, so it is not offered.
    async signIn({ email, password, remember: keep }) {
      remember(keep);
      const { data, error } = await sdk().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw new Error(error.message);
      if (!data.session) throw new Error('Sign in did not create a session. Please try again.');
      return 'authenticated';
    },
    async signUp({ displayName, username, email, password }) {
      remember(false);
      const { data, error } = await sdk().auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { display_name: displayName.trim(), username: username.trim().replace(/^@/, '') },
          emailRedirectTo: new URL('/login', window.location.origin).href,
        },
      });
      if (error) throw new Error(error.message);
      return data.session ? 'authenticated' : 'confirmation-required';
    },
    async signInWithOidc(provider) {
      const { error } = await sdk().auth.signInWithOAuth({
        provider,
        options: { redirectTo: new URL('/home', window.location.origin).href },
      });
      if (error) throw new Error(error.message);
    },
    async signOut() {
      // The default (global) scope revokes the refresh tokens on Supabase, so a
      // copied session stops working. If that call fails, still sign out here.
      const { error } = await sdk().auth.signOut();
      if (!error) return;
      const local = await sdk().auth.signOut({ scope: 'local' });
      if (local.error) throw new Error(local.error.message);
    },
    async currentAccount() {
      const { data } = await sdk().auth.getSession();
      return toAccount(data.session?.user);
    },
    async accessToken() {
      // getSession refreshes an expired token before returning it.
      const { data } = await sdk().auth.getSession();
      return data.session?.access_token ?? null;
    },
    onChange(listener) {
      const { data } = sdk().auth.onAuthStateChange((_event, session) => {
        listener(toAccount(session?.user));
      });
      return () => data.subscription.unsubscribe();
    },
  };
}

export const authProvider = createAuthProvider();
