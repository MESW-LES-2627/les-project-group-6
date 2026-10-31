import { Router } from 'express';
import type { DatabaseHealthCheck } from '../database/health-check.js';

export function healthRoutes(healthCheck?: DatabaseHealthCheck): Router {
  const router = Router();

  router.get('/health', async (_req, res) => {
    const isDbHealthy = healthCheck ? await healthCheck.isHealthy() : true;
    if (isDbHealthy) {
      res.status(200).json({ status: 'ok', db: 'ok' });
    } else {
      res.status(503).json({ status: 'error', db: 'down' });
    }
  });

  return router;
}
