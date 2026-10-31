import process from 'node:process';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { createPool } from './pool.js';

const pool = createPool();
const db = drizzle(pool);

async function runMigrations(): Promise<void> {
  console.log('🔄 Running pending database migrations...');

  // 3. Apply all SQL files in the migrations folder
  await migrate(db, { migrationsFolder: './src/database/migrations' });

  console.log('✅ Migrations applied successfully!');

  // 4. Always close the pool when finished so the process can exit
  await pool.end();
}

runMigrations().catch(async (error) => {
  console.error('❌ Migration failed:', error);
  await pool.end();
  process.exit(1);
});
