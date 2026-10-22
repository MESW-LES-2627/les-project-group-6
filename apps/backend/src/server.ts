import { createApp } from './app.js';
import { createPool } from './infrastructure/database/pool.js';

const pool = createPool();
const port = Number(process.env.PORT ?? 3000);

const server = createApp().listen(port, () => {
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
