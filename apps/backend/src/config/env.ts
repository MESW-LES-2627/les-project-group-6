import process from 'node:process';

// Every setting read from the environment, with the defaults used for local
// development (see .env.example).
export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgresql://postgres:password123@localhost:5432/bookmarked_dev',
  // Supabase project URL; the backend verifies session tokens against its JWKS.
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  // Only for projects still on the legacy shared HS256 JWT secret; leave empty otherwise.
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET ?? '',
  // Proxies in front of the API (Render has one); 0 when it is reached directly.
  trustProxy: Number(process.env.TRUST_PROXY ?? 0),
  // Comma-separated frontend origins allowed by CORS; empty allows any origin.
  corsOrigins: (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  // Open Library, the fallback book catalogue (F-EXP-01). Only search text is sent.
  openLibraryUrl: process.env.OPEN_LIBRARY_URL ?? 'https://openlibrary.org',
};
