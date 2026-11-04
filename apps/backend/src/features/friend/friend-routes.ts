import { Router } from 'express';
import { UserId } from '../user/user.js';
import type { IFriendRepository } from './friend-repository.js';

export function friendRoutes(friends: IFriendRepository): Router {
  const router = Router();

  router.get('/user/:userId/friends', async (req, res) => {
    res.status(200).json(await friends.friendsOf(UserId.of(req.params.userId)));
  });

  return router;
}
