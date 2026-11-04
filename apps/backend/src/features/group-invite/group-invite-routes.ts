import { Router } from 'express';
import { toGroupInviteDto, toPendingInviteDto } from './group-invite-dto.js';
import type { GroupInviteService } from './group-invite-service.js';

// userId comes from the body/path until Supabase Auth lands; then it comes from the token.
export function groupInviteRoutes(invites: GroupInviteService): Router {
  const router = Router();

  router.post('/groups/:id/invites', async (req, res) => {
    const { userId, inviteeId } = req.body;
    res.status(201).json(toGroupInviteDto(await invites.invite(req.params.id, userId, inviteeId)));
  });

  router.get('/user/:userId/group-invites', async (req, res) => {
    const pending = await invites.pendingFor(req.params.userId);
    res.status(200).json(pending.map(toPendingInviteDto));
  });

  router.post('/group-invites/:id/accept', async (req, res) => {
    res.status(200).json(toGroupInviteDto(await invites.accept(req.params.id, req.body.userId)));
  });

  router.post('/group-invites/:id/decline', async (req, res) => {
    res.status(200).json(toGroupInviteDto(await invites.decline(req.params.id, req.body.userId)));
  });

  return router;
}
