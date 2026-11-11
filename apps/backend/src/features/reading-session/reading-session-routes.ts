import { Router } from 'express';
import { currentUserId } from '../../middleware/auth.js';
import type { ReadingSessionService } from './reading-session-service.js';
import { toReadingSessionDto } from './reading-session-dto.js';

// The reader is always the signed-in user (from the token), never a body field.
export function readingSessionRoutes(sessions: ReadingSessionService): Router {
  const router = Router();

  router.post('/reading-sessions', async (req, res) => {
    const session = await sessions.start({ userId: currentUserId(res), bookId: req.body?.bookId });
    res.status(201).json(toReadingSessionDto(session, sessions.elapsedSeconds(session)));
  });

  router.patch('/reading-sessions/:id/finish', async (req, res) => {
    const session = await sessions.finish({ id: req.params.id, userId: currentUserId(res) });
    res.status(200).json(toReadingSessionDto(session, session.durationSeconds));
  });

  router.delete('/reading-sessions/:id', async (req, res) => {
    await sessions.cancel({ id: req.params.id, userId: currentUserId(res) });
    res.status(204).end();
  });

  router.get('/me/reading-sessions/active', async (_req, res) => {
    const session = await sessions.active(currentUserId(res));
    if (!session) {
      res.status(204).end();
      return;
    }
    res.status(200).json(toReadingSessionDto(session, sessions.elapsedSeconds(session)));
  });

  router.get('/me/reading-stats', async (_req, res) => {
    res.status(200).json(await sessions.stats(currentUserId(res)));
  });

  return router;
}
