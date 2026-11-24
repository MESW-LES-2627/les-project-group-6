import { Router } from 'express';
import { currentUserId } from '../../middleware/auth.js';
import { toGroupInviteDto, toPendingInviteDto } from './group-invite-dto.js';
import type { GroupInviteService } from './group-invite-service.js';

// The acting reader is always the signed-in user (from the token).
export function groupInviteRoutes(invites: GroupInviteService): Router {
  const router = Router();

  router.post('/groups/:id/invites', async (req, res) => {
    const invite = await invites.invite(req.params.id, currentUserId(res), req.body?.inviteeId);
    res.status(201).json(toGroupInviteDto(invite));
  });

  router.get('/groups/:id/invites', async (req, res) => {
    const pending = await invites.pendingForGroup(req.params.id, currentUserId(res));
    res.status(200).json(pending.map(toGroupInviteDto));
  });

  router.get('/me/group-invites', async (_req, res) => {
    const pending = await invites.pendingFor(currentUserId(res));
    res.status(200).json(pending.map(toPendingInviteDto));
  });

  router.post('/group-invites/:id/accept', async (req, res) => {
    res.status(200).json(toGroupInviteDto(await invites.accept(req.params.id, currentUserId(res))));
  });

  router.post('/group-invites/:id/decline', async (req, res) => {
    res
      .status(200)
      .json(toGroupInviteDto(await invites.decline(req.params.id, currentUserId(res))));
  });

  return router;
}
