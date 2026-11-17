// Creates seed logins in Supabase Auth through its Admin REST API (the same endpoints
// the dashboard uses), so they show up in Authentication > Users. Accounts are created
// already confirmed: Supabase sends no email and nobody has to click a link.
// Needs the project's service role (or secret) key, which must never reach the frontend.

export interface AuthAccount {
  id: string;
  email: string;
}

export interface NewAccount {
  email: string;
  password: string;
  /** Saved as user_metadata, like the sign-up form does. */
  metadata: Record<string, string>;
}

interface AdminUser {
  id: string;
  email?: string;
}

export class SupabaseAdmin {
  private readonly base: string;

  constructor(
    url: string,
    private readonly serviceKey: string,
  ) {
    this.base = `${url.replace(/\/+$/, '')}/auth/v1/admin`;
  }

  /** Every account in the project, keyed by lower-case email. */
  async accountsByEmail(): Promise<Map<string, AuthAccount>> {
    const found = new Map<string, AuthAccount>();
    const perPage = 1000;
    for (let page = 1; ; page += 1) {
      const body = await this.call<{ users: AdminUser[] }>(
        'GET',
        `/users?page=${page}&per_page=${perPage}`,
      );
      for (const user of body.users) {
        if (user.email) found.set(user.email.toLowerCase(), { id: user.id, email: user.email });
      }
      if (body.users.length < perPage) return found;
    }
  }

  async create(account: NewAccount): Promise<AuthAccount> {
    const user = await this.call<AdminUser>('POST', '/users', {
      email: account.email,
      password: account.password,
      email_confirm: true,
      user_metadata: account.metadata,
    });
    return { id: user.id, email: account.email };
  }

  /** Sets the password again (and confirms the email), so the credentials file stays right. */
  async update(id: string, account: NewAccount): Promise<void> {
    await this.call('PUT', `/users/${encodeURIComponent(id)}`, {
      password: account.password,
      email_confirm: true,
      user_metadata: account.metadata,
    });
  }

  private async call<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      apikey: this.serviceKey,
      'Content-Type': 'application/json',
    };
    // Legacy service_role keys are JWTs and go in Authorization too; the newer
    // `sb_secret_...` keys are only accepted in the apikey header.
    if (this.serviceKey.startsWith('eyJ')) headers.Authorization = `Bearer ${this.serviceKey}`;

    const response = await fetch(`${this.base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Supabase Auth ${method} ${path} failed: HTTP ${response.status} ${text}`);
    }
    return (await response.json()) as T;
  }
}
