import { createApp } from './app.js';
import { env } from './config/env.js';
import { DatabaseHealthCheck } from './database/health-check.js';
import { createPool, createDb } from './database/pool.js';
import { DrizzleBookRepository } from './features/book/book-repository.js';
import { DrizzleLibraryQuery } from './features/library/library-query.js';
import { DrizzleReadingStatusRepository } from './features/reading-status/reading-status-repository.js';

const pool = createPool();
const db = createDb(pool);

const server = createApp({
  healthCheck: new DatabaseHealthCheck(pool),
  bookRepository: new DrizzleBookRepository(db),
  readingStatusRepository: new DrizzleReadingStatusRepository(db),
  libraryQuery: new DrizzleLibraryQuery(db),
}).listen(env.port, () => {
  console.log(`Backend listening on http://localhost:${env.port}`);
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
