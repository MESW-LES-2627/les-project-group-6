import { Router } from 'express';
import { toFriendshipDto } from './friend-dto.js';
import type { FriendService } from './friend-service.js';

// userId comes from the body/path until Supabase Auth lands; then it comes from the token.
export function friendRoutes(friends: FriendService): Router {
  const router = Router();

  router.post('/friend-requests', async (req, res) => {
    const requesterId = req.body.requesterId ?? req.body.userId;
    const targetUserId = req.body.targetUserId;
    const result = await friends.request(requesterId, targetUserId);
    const status = result.outcome === 'ok' ? 201 : 200;
    res.status(status).json(toFriendshipDto(result.friendship));
  });

  router.get('/user/:userId/friend-requests', async (req, res) => {
    const pending = await friends.pendingRequestsFor(req.params.userId);
    res.status(200).json(pending.map(toFriendshipDto));
  });

  router.post('/friend-requests/:id/accept', async (req, res) => {
    const accepted = await friends.accept(req.body.userId, req.params.id);
    res.status(200).json(toFriendshipDto(accepted));
  });

  router.post('/friend-requests/:id/decline', async (req, res) => {
    await friends.decline(req.body.userId, req.params.id);
    res.status(204).end();
  });

  router.delete('/friends/:userId', async (req, res) => {
    const currentUserId = req.body?.userId ?? req.query?.userId;
    await friends.removeFriend(currentUserId, req.params.userId);
    res.status(204).end();
  });

  router.get('/user/:userId/friends', async (req, res) => {
    res.status(200).json(await friends.friendsOf(req.params.userId));
  });

  return router;
}
