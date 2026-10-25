import { createApp } from './app.js';
import { createPool, createDb } from './infrastructure/database/pool.js';
import { DatabaseHealthCheck } from './infrastructure/database/health-check.js';
import { DrizzleBookRepository } from './infrastructure/repositories/drizzle-book-repository.js';
import { DrizzleReadingStatusRepository } from './infrastructure/repositories/drizzle-reading-status-repository.js';
import { DrizzleLibraryQuery } from './infrastructure/queries/drizzle-library-query.js';

const pool = createPool();
const db = createDb(pool);
const port = Number(process.env.PORT ?? 3000);
const healthCheck = new DatabaseHealthCheck(pool);
const bookRepository = new DrizzleBookRepository(db);
const readingStatusRepository = new DrizzleReadingStatusRepository(db);
const libraryQuery = new DrizzleLibraryQuery(db);

const server = createApp({
  healthCheck,
  bookRepository,
  readingStatusRepository,
  libraryQuery,
}).listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});

const shutdown = async () => {
  console.log('Shutting down server and closing database pool...');
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
