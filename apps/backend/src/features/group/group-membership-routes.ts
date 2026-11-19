import { Router } from 'express';
import { currentUserId } from '../../middleware/auth.js';
import type { GroupMembershipService } from './group-membership-service.js';

// The acting reader is always the signed-in user (from the token).
export function groupMembershipRoutes(memberships: GroupMembershipService): Router {
  const router = Router();

  router.delete('/groups/:id/members/me', async (req, res) => {
    await memberships.leave(req.params.id, currentUserId(res));
    res.status(204).end();
  });

  return router;
}
