import { Router } from 'express';
import { currentUser } from '../../middleware/auth.js';
import { READING_STATUS_TYPES, type ReadingStatusType } from '../reading-status/reading-state.js';
import type { LibraryQuery } from './library-query.js';

const isReadingStatusType = (value: unknown): value is ReadingStatusType =>
  (READING_STATUS_TYPES as readonly unknown[]).includes(value);

export function libraryRoutes(libraryQuery: LibraryQuery): Router {
  const router = Router();

  router.get('/me/library', async (req, res) => {
    const status = isReadingStatusType(req.query.status) ? req.query.status : undefined;
    const library = await libraryQuery.forUser(currentUser(res).id, status);
    res.status(200).json(library);
  });

  return router;
}
