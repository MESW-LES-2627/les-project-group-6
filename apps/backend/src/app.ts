import express, { type Express } from 'express';
import type { DatabaseHealthCheck } from './infrastructure/database/health-check.js';
import type { IBookRepository } from './domain/book/book-repository.js';
import type { IReadingStatusRepository } from './domain/reading/reading-status-repository.js';
import type { LibraryQuery } from './application/library/library-query.js';
import { GetBookUseCase } from './application/book/get-book.js';
import { RegisterBookUseCase } from './application/book/register-book.js';
import { RemoveBookUseCase } from './application/book/remove-book.js';
import { SearchBooksUseCase } from './application/book/search-books.js';
import { SetReadingStatusUseCase } from './application/reading/set-reading-status.js';
import { UpdateReadingStatusUseCase } from './application/reading/update-reading-status.js';
import { cors } from './http/cors.js';
import { errorHandler } from './http/error-handler.js';
import { bookRoutes } from './http/routes/book-routes.js';
import { healthRoutes } from './http/routes/health-routes.js';
import { libraryRoutes } from './http/routes/library-routes.js';
import { readingStatusRoutes } from './http/routes/reading-status-routes.js';

export interface AppDependencies {
  healthCheck?: DatabaseHealthCheck;
  bookRepository?: IBookRepository;
  readingStatusRepository?: IReadingStatusRepository;
  libraryQuery?: LibraryQuery;
}

// Wires use cases to their dependencies by hand (no DI container) and mounts the
// routes whose dependencies were provided.
export function createApp(deps: AppDependencies = {}): Express {
  const app = express();

  app.use(cors);
  app.use(express.json());
  app.use(healthRoutes(deps.healthCheck));

  const { bookRepository, readingStatusRepository, libraryQuery } = deps;

  if (bookRepository) {
    app.use(
      bookRoutes({
        register: new RegisterBookUseCase(bookRepository),
        get: new GetBookUseCase(bookRepository),
        search: new SearchBooksUseCase(bookRepository),
        remove: new RemoveBookUseCase(bookRepository),
      }),
    );
  }

  if (bookRepository && readingStatusRepository) {
    app.use(
      readingStatusRoutes({
        set: new SetReadingStatusUseCase(readingStatusRepository, bookRepository),
        update: new UpdateReadingStatusUseCase(readingStatusRepository, bookRepository),
      }),
    );
  }

  if (libraryQuery) {
    app.use(libraryRoutes(libraryQuery));
  }

  app.use(errorHandler);

  return app;
}
