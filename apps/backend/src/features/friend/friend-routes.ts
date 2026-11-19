import { Router } from 'express';
import { currentUserId } from '../../middleware/auth.js';
import { toFriendshipDto, toIncomingRequestDto } from './friend-dto.js';
import type { FriendService } from './friend-service.js';

// Mounted behind `authenticate` + `requireUser`: the acting reader always comes from the token.
export function friendRoutes(friends: FriendService): Router {
  const router = Router();

  router.post('/friend-requests', async (req, res) => {
    const result = await friends.request(currentUserId(res), req.body?.targetUserId);
    const status = result.outcome === 'ok' ? 201 : 200;
    res.status(status).json(toFriendshipDto(result.friendship));
  });

  router.get('/me/friend-requests', async (_req, res) => {
    const pending = await friends.incomingRequestsFor(currentUserId(res));
    res.status(200).json(pending.map(toIncomingRequestDto));
  });

  router.post('/friend-requests/:id/accept', async (req, res) => {
    const accepted = await friends.accept(currentUserId(res), req.params.id);
    res.status(200).json(toFriendshipDto(accepted));
  });

  router.post('/friend-requests/:id/decline', async (req, res) => {
    await friends.decline(currentUserId(res), req.params.id);
    res.status(204).end();
  });

  router.delete('/friends/:userId', async (req, res) => {
    await friends.removeFriend(currentUserId(res), req.params.userId);
    res.status(204).end();
  });

  router.get('/me/friends', async (_req, res) => {
    res.status(200).json(await friends.friendsOf(currentUserId(res)));
  });

  return router;
}
