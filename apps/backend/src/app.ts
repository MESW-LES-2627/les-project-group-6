import express, { type Express } from 'express';
import { apiRouter, type ApiDependencies } from './api/router.js';
import { corsFor } from './middleware/cors.js';
import { errorHandler } from './middleware/error-handler.js';

export interface AppDependencies extends ApiDependencies {
  /**
   * Express `trust proxy`: how many proxies sit in front of the API (1 on Render),
   * so rate limits count the client's IP instead of the proxy's.
   */
  trustProxy?: number;
  /** Browser origins allowed by CORS; empty allows any origin (local development). */
  corsOrigins?: readonly string[];
}

export function createApp(deps: AppDependencies = {}): Express {
  const app = express();
  if (deps.trustProxy) app.set('trust proxy', deps.trustProxy);

  app.use(corsFor(deps.corsOrigins));
  app.use(express.json());
  app.use(apiRouter(deps));
  app.use(errorHandler);

  return app;
}
