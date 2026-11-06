import { Router, type RequestHandler } from 'express';
import type { ReadingStatusService } from './reading-status-service.js';
import { toReadingStatusDto } from './reading-status-dto.js';

export function readingStatusRoutes(readingStatuses: ReadingStatusService): Router {
  const router = Router();

  router.put('/reading-status', async (req, res) => {
    const { userId, bookId, status, currentPage } = req.body ?? {};
    const entry = await readingStatuses.set({ userId, bookId, status, currentPage });
    res.status(200).json(toReadingStatusDto(entry));
  });

  const update: RequestHandler = async (req, res) => {
    const { userId, bookId, status, currentPage } = req.body ?? {};
    const entry = await readingStatuses.update({
      id: req.params.id ?? req.body?.id,
      userId,
      bookId,
      status,
      currentPage,
    });
    res.status(200).json(toReadingStatusDto(entry));
  };

  router.patch('/reading-status/:id', update);
  router.put('/reading-status/:id', update);
  router.patch('/reading-status', update);

  return router;
}
