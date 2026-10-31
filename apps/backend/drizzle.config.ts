import process from 'node:process';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema.ts',
  out: './src/database/migrations',
  dbCredentials: {
    url:
      process.env.DATABASE_URL ?? 'postgresql://postgres:password123@localhost:5432/bookmarked_dev',
  },
});
