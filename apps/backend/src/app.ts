import express, { type Express } from 'express';
import type { DatabaseHealthCheck } from './infrastructure/database/health-check.js';

export interface AppDependencies {
  healthCheck?: DatabaseHealthCheck;
}

export function createApp(deps: AppDependencies = {}): Express {
  const app = express();

  app.get('/health', async (_req, res) => {
    const isDbHealthy = deps.healthCheck ? await deps.healthCheck.isHealthy() : true;
    if (isDbHealthy) {
      res.status(200).json({ status: 'ok', db: 'ok' });
    } else {
      res.status(503).json({ status: 'error', db: 'down' });
    }
  });

  return app;
}
