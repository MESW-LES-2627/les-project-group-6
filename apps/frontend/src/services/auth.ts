import { createClient, type Provider, type SupabaseClient } from '@supabase/supabase-js';

export interface SignInInput {
  identifier: string;
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
  /** The account of the stored session, or null when signed out. */
  currentAccount(): Promise<AuthAccount | null>;
  /** A fresh access token for `Authorization: Bearer`, or null when signed out. */
  accessToken(): Promise<string | null>;
  /** Calls back whenever the session is created, refreshed or removed. */
  onChange(listener: (account: AuthAccount | null) => void): () => void;
}

// Supabase does not support username/password directly. Supply a trusted backend
// resolver once it exists; never expose a public users/email lookup in the browser.
export type UsernameResolver = (username: string) => Promise<string>;
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

export function createAuthProvider(
  getClient: () => AuthClient = getSupabaseClient,
  resolveUsername?: UsernameResolver,
  remember: (value: boolean) => void = rememberAwareStorage.remember,
): AuthProvider {
  return {
    async signIn({ identifier, password, remember: keep }) {
      let email = identifier.trim();
      if (!email.includes('@') || email.startsWith('@')) {
        if (!resolveUsername) {
          throw new Error('Username sign-in is not available yet. Please use your email address.');
        }
        email = await resolveUsername(email.replace(/^@/, ''));
      }
      remember(keep);
      const { data, error } = await getClient().auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      if (!data.session) throw new Error('Sign in did not create a session. Please try again.');
      return 'authenticated';
    },
    async signUp({ displayName, username, email, password }) {
      remember(false);
      const { data, error } = await getClient().auth.signUp({
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
      const { error } = await getClient().auth.signInWithOAuth({
        provider,
        options: { redirectTo: new URL('/home', window.location.origin).href },
      });
      if (error) throw new Error(error.message);
    },
    async signOut() {
      // Clears the local session even when the network call fails.
      const { error } = await getClient().auth.signOut({ scope: 'local' });
      if (error) throw new Error(error.message);
    },
    async currentAccount() {
      const { data } = await getClient().auth.getSession();
      return toAccount(data.session?.user);
    },
    async accessToken() {
      // getSession refreshes an expired token before returning it.
      const { data } = await getClient().auth.getSession();
      return data.session?.access_token ?? null;
    },
    onChange(listener) {
      const { data } = getClient().auth.onAuthStateChange((_event, session) => {
        listener(toAccount(session?.user));
      });
      return () => data.subscription.unsubscribe();
    },
  };
}

export const authProvider = createAuthProvider();
