import { Router } from 'express';
import type { DatabaseHealthCheck } from '../database/health-check.js';
import type { IBookRepository } from '../features/book/book-repository.js';
import { bookRoutes } from '../features/book/book-routes.js';
import { BookService } from '../features/book/book-service.js';
import type { LibraryQuery } from '../features/library/library-query.js';
import { libraryRoutes } from '../features/library/library-routes.js';
import type { IReadingStatusRepository } from '../features/reading-status/reading-status-repository.js';
import type { IReadingSessionRepository } from '../features/reading-session/reading-session-repository.js';
import { readingSessionRoutes } from '../features/reading-session/reading-session-routes.js';
import { ReadingSessionService } from '../features/reading-session/reading-session-service.js';
import { readingStatusRoutes } from '../features/reading-status/reading-status-routes.js';
import { ReadingStatusService } from '../features/reading-status/reading-status-service.js';
import type { IChallengeGroupRepository } from '../features/challenge-group/challenge-group-repository.js';
import { challengeGroupRoutes } from '../features/challenge-group/challenge-group-routes.js';
import { ChallengeGroupService } from '../features/challenge-group/challenge-group-service.js';
import type { StandingsQuery } from '../features/challenge-group/standings-query.js';
import type { IUserRepository } from '../features/user/user-repository.js';
import { healthRoutes } from './health-routes.js';

export interface ApiDependencies {
  healthCheck?: DatabaseHealthCheck;
  bookRepository?: IBookRepository;
  readingStatusRepository?: IReadingStatusRepository;
  libraryQuery?: LibraryQuery;
  readingSessionRepository?: IReadingSessionRepository;
  userRepository?: IUserRepository;
  challengeGroupRepository?: IChallengeGroupRepository;
  standingsQuery?: StandingsQuery;
}

// Wires each feature's service to its dependencies by hand (no DI container) and
// mounts the routes whose dependencies were provided.
export function apiRouter(deps: ApiDependencies = {}): Router {
  const router = Router();
  const {
    healthCheck,
    bookRepository,
    readingStatusRepository,
    libraryQuery,
    readingSessionRepository,
    userRepository,
    challengeGroupRepository,
    standingsQuery,
  } = deps;

  router.use(healthRoutes(healthCheck));

  if (bookRepository) {
    router.use(bookRoutes(new BookService(bookRepository)));
  }

  if (bookRepository && readingStatusRepository) {
    router.use(
      readingStatusRoutes(new ReadingStatusService(readingStatusRepository, bookRepository)),
    );
  }

  if (bookRepository && readingSessionRepository) {
    router.use(
      readingSessionRoutes(new ReadingSessionService(readingSessionRepository, bookRepository)),
    );
  }

  if (userRepository && challengeGroupRepository && standingsQuery) {
    router.use(
      challengeGroupRoutes(
        new ChallengeGroupService(challengeGroupRepository, userRepository),
        standingsQuery,
      ),
    );
  }

  if (libraryQuery) {
    router.use(libraryRoutes(libraryQuery));
  }

  return router;
}
