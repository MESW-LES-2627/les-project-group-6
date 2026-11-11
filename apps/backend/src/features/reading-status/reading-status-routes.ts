import { Router, type RequestHandler } from 'express';
import { currentUserId } from '../../middleware/auth.js';
import type { ReadingStatusService } from './reading-status-service.js';
import { toReadingStatusDto } from './reading-status-dto.js';

// Mounted behind `authenticate` + `requireUser`: the reader always comes from the token,
// never from a `userId` in the body, query or path.
export function readingStatusRoutes(readingStatuses: ReadingStatusService): Router {
  const router = Router();

  router.put('/reading-status', async (req, res) => {
    const { bookId, status, currentPage, startedOn, finishedOn } = req.body ?? {};
    const entry = await readingStatuses.set({
      userId: currentUserId(res),
      bookId,
      status,
      currentPage,
      startedOn,
      finishedOn,
    });
    res.status(200).json(toReadingStatusDto(entry));
  });

  const update: RequestHandler = async (req, res) => {
    const { bookId, status, currentPage, startedOn, finishedOn } = req.body ?? {};
    const entry = await readingStatuses.update({
      id: req.params.id ?? req.body?.id,
      userId: currentUserId(res),
      bookId,
      status,
      currentPage,
      startedOn,
      finishedOn,
    });
    res.status(200).json(toReadingStatusDto(entry));
  };

  router.patch('/reading-status/:id', update);
  router.put('/reading-status/:id', update);
  router.patch('/reading-status', update);

  router.delete('/reading-status/:id', async (req, res) => {
    await readingStatuses.removeById(currentUserId(res), req.params.id);
    res.status(204).end();
  });

  router.delete('/reading-status', async (req, res) => {
    const bookId = req.query.bookId ?? req.body?.bookId;
    await readingStatuses.remove(currentUserId(res), bookId);
    res.status(204).end();
  });

  router.put('/library/:bookId', async (req, res) => {
    const { status, currentPage, startedOn, finishedOn } = req.body ?? {};
    const entry = await readingStatuses.set({
      userId: currentUserId(res),
      bookId: req.params.bookId,
      status,
      currentPage,
      startedOn,
      finishedOn,
    });
    res.status(200).json(toReadingStatusDto(entry));
  });

  const removeFromLibrary: RequestHandler = async (req, res) => {
    await readingStatuses.remove(currentUserId(res), req.params.bookId);
    res.status(204).end();
  };

  router.delete('/library/:bookId', removeFromLibrary);
  router.delete('/me/library/:bookId', removeFromLibrary);

  return router;
}
