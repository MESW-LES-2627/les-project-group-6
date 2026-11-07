import { Router } from 'express';
import { currentUser } from '../../middleware/auth.js';
import type { IFriendRepository } from './friend-repository.js';

export function friendRoutes(friends: IFriendRepository): Router {
  const router = Router();

  router.get('/me/friends', async (_req, res) => {
    res.status(200).json(await friends.friendsOf(currentUser(res).id));
  });

  return router;
}
