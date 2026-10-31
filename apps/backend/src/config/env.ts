import process from 'node:process';

// Every setting read from the environment, with the defaults used for local
// development (see .env.example).
export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgresql://postgres:password123@localhost:5432/bookmarked_dev',
};
