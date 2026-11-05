import { Router, type RequestHandler } from 'express';
import type { ReadingStatusService } from './reading-status-service.js';
import { toReadingStatusDto } from './reading-status-dto.js';

export function readingStatusRoutes(readingStatuses: ReadingStatusService): Router {
  const router = Router();

  router.put('/reading-status', async (req, res) => {
    const entry = await readingStatuses.set(req.body);
    res.status(200).json(toReadingStatusDto(entry));
  });

  const update: RequestHandler = async (req, res) => {
    const entry = await readingStatuses.update({
      ...req.body,
      id: req.params.id ?? req.body?.id,
    });
    res.status(200).json(toReadingStatusDto(entry));
  };

  router.patch('/reading-status/:id', update);
  router.put('/reading-status/:id', update);
  router.patch('/reading-status', update);

  router.delete('/reading-status/:id', async (req, res) => {
    await readingStatuses.removeById(req.params.id);
    res.status(204).end();
  });

  router.delete('/reading-status', async (req, res) => {
    const userId = (req.query.userId as string) ?? req.body?.userId;
    const bookId = (req.query.bookId as string) ?? req.body?.bookId;
    await readingStatuses.remove(userId, bookId);
    res.status(204).end();
  });

  router.delete('/user/:userId/library/:bookId', async (req, res) => {
    await readingStatuses.remove(req.params.userId, req.params.bookId);
    res.status(204).end();
  });

  return router;
}
