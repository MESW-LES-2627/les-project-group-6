import process from 'node:process';
import pg from 'pg';

export function createTestPool(): pg.Pool {
  const connectionString =
    process.env.DATABASE_URL_TEST ??
    process.env.DATABASE_URL ??
    'postgresql://postgres:password123@localhost:5432/bookmarked_dev';

  return new pg.Pool({ connectionString });
}

export async function truncateTables(
  pool: pg.Pool,
  tables: string[] = ['users', 'books', 'friendships'],
): Promise<void> {
  if (tables.length === 0) return;
  const tableList = tables.map((t) => `"${t}"`).join(', ');
  await pool.query(`TRUNCATE TABLE ${tableList} CASCADE;`);
}
