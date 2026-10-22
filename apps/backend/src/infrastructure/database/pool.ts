import process from 'node:process';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema.js';

export function createPool(connectionString?: string): pg.Pool {
  return new pg.Pool({
    connectionString:
      connectionString ??
      process.env.DATABASE_URL ??
      'postgresql://postgres:password123@localhost:5432/bookmarked_dev',
  });
}

export function createDb(pool: pg.Pool) {
  return drizzle(pool, { schema });
}
