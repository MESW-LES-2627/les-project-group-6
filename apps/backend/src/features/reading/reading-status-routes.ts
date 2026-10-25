import { Router, type RequestHandler } from 'express';
import type { ReadingStatusType } from './reading-state.js';
import type { ReadingStatus } from './reading-status.js';
import type { ReadingStatusService } from './reading-status-service.js';

export interface ReadingStatusDto {
  id: string;
  userId: string;
  bookId: string;
  status: ReadingStatusType;
  currentPage: number;
  updatedAt: string;
}

export function toReadingStatusDto(status: ReadingStatus): ReadingStatusDto {
  return {
    id: status.id.value,
    userId: status.userId.value,
    bookId: status.bookId.value,
    status: status.status,
    currentPage: status.progress.page,
    updatedAt: status.updatedAt.toISOString(),
  };
}

export function readingStatusRoutes(readingStatuses: ReadingStatusService): Router {
  const router = Router();

  router.put('/reading-status', async (req, res) => {
    const { userId, bookId, status, currentPage } = req.body;
    const entry = await readingStatuses.set({ userId, bookId, status, currentPage });
    res.status(200).json(toReadingStatusDto(entry));
  });

  const update: RequestHandler = async (req, res) => {
    const { userId, bookId, status, currentPage } = req.body;
    const entry = await readingStatuses.update({
      id: req.params.id ?? req.body.id,
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
