import { Router } from 'express';
import { currentUserId } from '../../middleware/auth.js';
import type { ChallengeGroupService } from './challenge-group-service.js';
import { toChallengeGroupDto } from './challenge-group-dto.js';
import type { StandingsQuery } from './standings-query.js';

// The acting reader is always the signed-in user (from the token).
export function challengeGroupRoutes(
  groups: ChallengeGroupService,
  standings: StandingsQuery,
): Router {
  const router = Router();

  router.post('/groups/challenges', async (req, res) => {
    const { name, description, startDate, durationDays, winMetric, metricGoal } = req.body ?? {};
    const { group, status } = await groups.create({
      userId: currentUserId(res),
      name,
      description,
      startDate,
      durationDays,
      winMetric,
      metricGoal,
    });
    res.status(201).json(toChallengeGroupDto(group, status));
  });

  router.get('/groups/challenges/:id', async (req, res) => {
    const { group, status } = await groups.get(req.params.id, currentUserId(res));
    res.status(200).json({
      ...toChallengeGroupDto(group, status),
      standings: await standings.forGroup(group),
    });
  });

  router.get('/me/groups', async (_req, res) => {
    const list = await groups.forMember(currentUserId(res));
    res.status(200).json(list.map((v) => toChallengeGroupDto(v.group, v.status)));
  });

  return router;
}
