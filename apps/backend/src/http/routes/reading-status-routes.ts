import { Router, type RequestHandler } from 'express';
import type { SetReadingStatusUseCase } from '../../application/reading/set-reading-status.js';
import type { UpdateReadingStatusUseCase } from '../../application/reading/update-reading-status.js';
import { toReadingStatusDto } from '../reading-status-dto.js';

export interface ReadingStatusUseCases {
  set: SetReadingStatusUseCase;
  update: UpdateReadingStatusUseCase;
}

export function readingStatusRoutes(useCases: ReadingStatusUseCases): Router {
  const router = Router();

  router.put('/reading-status', async (req, res) => {
    const { userId, bookId, status, currentPage } = req.body;
    const entry = await useCases.set.execute({ userId, bookId, status, currentPage });
    res.status(200).json(toReadingStatusDto(entry));
  });

  const update: RequestHandler = async (req, res) => {
    const { userId, bookId, status, currentPage } = req.body;
    const entry = await useCases.update.execute({
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
