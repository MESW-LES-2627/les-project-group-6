import { Router } from 'express';
import type { ReadingSessionService } from './reading-session-service.js';
import { toReadingSessionDto } from './reading-session-dto.js';

// userId comes from the body/path until Supabase Auth lands; then it comes from the token.
export function readingSessionRoutes(sessions: ReadingSessionService): Router {
  const router = Router();

  router.post('/reading-sessions', async (req, res) => {
    const { userId, bookId } = req.body;
    const session = await sessions.start({ userId, bookId });
    res.status(201).json(toReadingSessionDto(session, sessions.elapsedSeconds(session)));
  });

  router.patch('/reading-sessions/:id/finish', async (req, res) => {
    const session = await sessions.finish({ id: req.params.id, userId: req.body.userId });
    res.status(200).json(toReadingSessionDto(session, session.durationSeconds));
  });

  router.delete('/reading-sessions/:id', async (req, res) => {
    await sessions.cancel({ id: req.params.id, userId: req.body?.userId });
    res.status(204).end();
  });

  router.get('/user/:userId/reading-sessions/active', async (req, res) => {
    const session = await sessions.active(req.params.userId);
    if (!session) {
      res.status(204).end();
      return;
    }
    res.status(200).json(toReadingSessionDto(session, sessions.elapsedSeconds(session)));
  });

  router.get('/user/:userId/reading-stats', async (req, res) => {
    res.status(200).json(await sessions.stats(req.params.userId));
  });

  return router;
}
