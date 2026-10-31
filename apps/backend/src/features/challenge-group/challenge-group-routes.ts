import { Router } from 'express';
import type { ChallengeGroupService } from './challenge-group-service.js';
import { toChallengeGroupDto } from './challenge-group-dto.js';
import type { StandingsQuery } from './standings-query.js';

// userId comes from the body/path until Supabase Auth lands; then it comes from the token.
export function challengeGroupRoutes(
  groups: ChallengeGroupService,
  standings: StandingsQuery,
): Router {
  const router = Router();

  router.post('/groups/challenges', async (req, res) => {
    const { userId, name, description, startDate, durationDays, winMetric, metricGoal } = req.body;
    const group = await groups.create({
      userId,
      name,
      description,
      startDate,
      durationDays,
      winMetric,
      metricGoal,
    });
    res.status(201).json(toChallengeGroupDto(group, groups.now()));
  });

  router.get('/groups/challenges/:id', async (req, res) => {
    const group = await groups.get(req.params.id);
    res.status(200).json({
      ...toChallengeGroupDto(group, groups.now()),
      standings: await standings.forGroup(group),
    });
  });

  router.get('/user/:userId/groups', async (req, res) => {
    const list = await groups.forMember(req.params.userId);
    res.status(200).json(list.map((g) => toChallengeGroupDto(g, groups.now())));
  });

  return router;
}
