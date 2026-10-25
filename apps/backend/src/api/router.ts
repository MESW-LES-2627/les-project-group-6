import { Router } from 'express';
import type { DatabaseHealthCheck } from '../database/health-check.js';
import type { IBookRepository } from '../features/book/book-repository.js';
import { bookRoutes } from '../features/book/book-routes.js';
import { BookService } from '../features/book/book-service.js';
import type { LibraryQuery } from '../features/library/library-query.js';
import { libraryRoutes } from '../features/library/library-routes.js';
import type { IReadingStatusRepository } from '../features/reading-status/reading-status-repository.js';
import { readingStatusRoutes } from '../features/reading-status/reading-status-routes.js';
import { ReadingStatusService } from '../features/reading-status/reading-status-service.js';
import { healthRoutes } from './health-routes.js';

export interface ApiDependencies {
  healthCheck?: DatabaseHealthCheck;
  bookRepository?: IBookRepository;
  readingStatusRepository?: IReadingStatusRepository;
  libraryQuery?: LibraryQuery;
}

// Wires each feature's service to its dependencies by hand (no DI container) and
// mounts the routes whose dependencies were provided.
export function apiRouter(deps: ApiDependencies = {}): Router {
  const router = Router();
  const { healthCheck, bookRepository, readingStatusRepository, libraryQuery } = deps;

  router.use(healthRoutes(healthCheck));

  if (bookRepository) {
    router.use(bookRoutes(new BookService(bookRepository)));
  }

  if (bookRepository && readingStatusRepository) {
    router.use(
      readingStatusRoutes(new ReadingStatusService(readingStatusRepository, bookRepository)),
    );
  }

  if (libraryQuery) {
    router.use(libraryRoutes(libraryQuery));
  }

  return router;
}
