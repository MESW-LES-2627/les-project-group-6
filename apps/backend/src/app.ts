import express, { type Express } from 'express';
import { apiRouter, type ApiDependencies } from './api/router.js';
import { cors } from './middleware/cors.js';
import { errorHandler } from './middleware/error-handler.js';

export type AppDependencies = ApiDependencies;

export function createApp(deps: AppDependencies = {}): Express {
  const app = express();

  app.use(cors);
  app.use(express.json());
  app.use(apiRouter(deps));
  app.use(errorHandler);

  return app;
}
