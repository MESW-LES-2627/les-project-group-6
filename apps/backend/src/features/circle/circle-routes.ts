import { Router } from 'express';
import { currentUser } from '../../middleware/auth.js';
import type { CircleService } from './circle-service.js';

// F-SOC-03/F-SOC-04: the Home circle sections. No friends or no activity is an
// empty list, not an error.
export function circleRoutes(circle: CircleService): Router {
  const router = Router();

  router.get('/me/friends/reading', async (_req, res) => {
    res.status(200).json(await circle.friendsReading(currentUser(res).id));
  });

  router.get('/me/circle/comments', async (req, res) => {
    const limit = req.query.limit === undefined ? undefined : Number(req.query.limit);
    res.status(200).json(await circle.comments(currentUser(res).id, limit));
  });

  return router;
}
