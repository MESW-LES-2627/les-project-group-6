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

export interface AuthProvider {
  signIn(input: SignInInput): Promise<AuthOutcome>;
  signUp(input: SignUpInput): Promise<AuthOutcome>;
  signInWithOidc(provider: Provider): Promise<void>;
}

// Supabase does not support username/password directly. Supply a trusted backend
// resolver once it exists; never expose a public users/email lookup in the browser.
export type UsernameResolver = (username: string) => Promise<string>;
export type AuthClient = Pick<SupabaseClient, 'auth'>;

const clients = new Map<boolean, SupabaseClient>();

export function getSupabaseClient(remember: boolean): SupabaseClient {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error('Sign in is not available yet. Please try again later.');
  }

  let client = clients.get(remember);
  if (!client) {
    client = createClient(url, key, {
      auth: {
        persistSession: true,
        storage: remember ? window.localStorage : window.sessionStorage,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    clients.set(remember, client);
  }
  return client;
}

export function createAuthProvider(
  getClient: (remember: boolean) => AuthClient = getSupabaseClient,
  resolveUsername?: UsernameResolver,
): AuthProvider {
  return {
    async signIn({ identifier, password, remember }) {
      let email = identifier.trim();
      if (!email.includes('@') || email.startsWith('@')) {
        if (!resolveUsername) {
          throw new Error('Username sign-in is not available yet. Please use your email address.');
        }
        email = await resolveUsername(email.replace(/^@/, ''));
      }
      const { data, error } = await getClient(remember).auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.message);
      if (!data.session) throw new Error('Sign in did not create a session. Please try again.');
      return 'authenticated';
    },
    async signUp({ displayName, username, email, password }) {
      const { data, error } = await getClient(false).auth.signUp({
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
      const { error } = await getClient(false).auth.signInWithOAuth({
        provider,
        options: { redirectTo: new URL('/home', window.location.origin).href },
      });
      if (error) throw new Error(error.message);
    },
  };
}

export const authProvider = createAuthProvider();
