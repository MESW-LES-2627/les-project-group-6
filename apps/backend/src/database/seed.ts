import { randomBytes } from 'node:crypto';
import { chmod, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { env } from '../config/env.js';
import { createDb, createPool } from './pool.js';
import { populate, type SeedAccounts } from './seed/populate.js';
import { READERS, type ReaderKey } from './seed/seed-data.js';
import { SupabaseAdmin } from './seed/supabase-admin.js';

// `pnpm db:seed`: creates (or reuses) one Supabase Auth login per seed reader, already
// confirmed so no email is sent, then fills DATABASE_URL with their profiles, books,
// sessions, friends, groups and the rest. The emails and passwords are written to
// seed-accounts.local.json (git-ignored). Safe to run again: accounts are reused with the
// same passwords, and their data is rebuilt so dates stay relative to today.

/** Next to package.json; the name is in the root .gitignore. */
const CREDENTIALS_FILE = fileURLToPath(new URL('../../seed-accounts.local.json', import.meta.url));
const EMAIL_DOMAIN = 'example.com';

interface Credential {
  username: string;
  displayName: string;
  email: string;
  password: string;
  role: string;
}

function emailOf(username: string): string {
  return `${username}@${EMAIL_DOMAIN}`;
}

function newPassword(): string {
  // 16 random characters; letters, digits, - and _ only, so it is easy to paste.
  return randomBytes(12).toString('base64url');
}

/** Passwords from an earlier run, by email, so re-seeding keeps them. */
async function previousPasswords(): Promise<Map<string, string>> {
  try {
    const saved = JSON.parse(await readFile(CREDENTIALS_FILE, 'utf8')) as {
      accounts?: Credential[];
    };
    return new Map((saved.accounts ?? []).map((a) => [a.email.toLowerCase(), a.password]));
  } catch {
    return new Map();
  }
}

function isLocalDatabase(url: string): boolean {
  try {
    return ['localhost', '127.0.0.1', '::1', 'db', 'postgres'].includes(new URL(url).hostname);
  } catch {
    return false;
  }
}

function requireSettings(): { url: string; key: string } {
  const url = env.supabaseUrl;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!url || !key) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in apps/backend/.env to create the ' +
        'seed accounts. The key is in Supabase > Project Settings > API Keys (service_role or a secret key).',
    );
  }
  // The seed deletes and rebuilds its own accounts' data; never do that to a shared
  // database by accident.
  if (!isLocalDatabase(env.databaseUrl) && process.env.SEED_ALLOW_REMOTE_DATABASE !== 'true') {
    throw new Error(
      'DATABASE_URL is not a local database. Set SEED_ALLOW_REMOTE_DATABASE=true to seed it anyway.',
    );
  }
  return { url, key };
}

async function createAccounts(admin: SupabaseAdmin): Promise<{
  accounts: SeedAccounts;
  credentials: Credential[];
}> {
  const existing = await admin.accountsByEmail();
  const saved = await previousPasswords();
  const accounts = {} as SeedAccounts;
  const credentials: Credential[] = [];

  for (const reader of READERS) {
    const email = emailOf(reader.username);
    const password = saved.get(email) ?? newPassword();
    const account = {
      email,
      password,
      // The same metadata the sign-up form stores.
      metadata: { username: reader.username, display_name: reader.displayName },
    };
    const found = existing.get(email);
    if (found) {
      await admin.update(found.id, account);
      accounts[reader.key as ReaderKey] = { id: found.id, email };
      console.log(`  ↻ ${email} (existing login, password set again)`);
    } else {
      const created = await admin.create(account);
      accounts[reader.key as ReaderKey] = created;
      console.log(`  + ${email}`);
    }
    credentials.push({
      username: reader.username,
      displayName: reader.displayName,
      email,
      password,
      role: reader.role,
    });
  }
  return { accounts, credentials };
}

async function writeCredentials(credentials: Credential[]): Promise<void> {
  const file = {
    note: 'Seed accounts created by `pnpm db:seed`. Test passwords only; never commit this file.',
    supabaseProject: env.supabaseUrl,
    accounts: credentials,
  };
  await writeFile(CREDENTIALS_FILE, `${JSON.stringify(file, null, 2)}\n`, { mode: 0o600 });
  await chmod(CREDENTIALS_FILE, 0o600);
}

async function seed(): Promise<void> {
  const { url, key } = requireSettings();
  console.log(`🌱 Creating seed logins in ${url} ...`);
  const { accounts, credentials } = await createAccounts(new SupabaseAdmin(url, key));
  // Written before the database step, so the passwords are kept even if it fails.
  await writeCredentials(credentials);

  console.log('🌱 Filling the database ...');
  const pool = createPool();
  try {
    await populate(createDb(pool), accounts);
  } finally {
    await pool.end();
  }

  console.log(`✅ Seeded ${credentials.length} readers. Logins are in ${CREDENTIALS_FILE}`);
}

seed().catch((error: unknown) => {
  console.error('❌ Seeding failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
