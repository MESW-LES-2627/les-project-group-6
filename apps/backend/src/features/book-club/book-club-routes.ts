import { Router } from 'express';
import { currentUser, currentUserId } from '../../middleware/auth.js';
import { GroupId } from '../group/group.js';
import type { UserId } from '../user/user.js';
import { toBookClubDetailDto, toBookClubDto, toPollDto, type PollDto } from './book-club-dto.js';
import type { BookClubService, BookClubView } from './book-club-service.js';
import type { BookPoll } from './book-poll.js';
import type { BookPollService } from './book-poll-service.js';
import type { ClubProgressQuery } from './club-progress-query.js';

// The acting reader is always the signed-in user (from the token).
export function bookClubRoutes(
  clubs: BookClubService,
  polls: BookPollService,
  progress: ClubProgressQuery,
): Router {
  const router = Router();

  const summary = async (view: BookClubView) =>
    toBookClubDto(view, await progress.books([view.club.currentRound.bookId.value]));

  const pollDto = async (
    poll: BookPoll,
    view: BookClubView,
    readerId: UserId,
  ): Promise<PollDto> => {
    const [books, names] = await Promise.all([
      progress.books(poll.proposals.map((p) => p.bookId.value)),
      progress.names(poll.proposals.map((p) => p.proposedBy.value)),
    ]);
    return toPollDto(poll, new Date(), readerId, view.club.members.length, books, names);
  };

  router.post('/groups/book-clubs', async (req, res) => {
    const { name, description, bookId, deadline } = req.body ?? {};
    const view = await clubs.create({
      userId: currentUserId(res),
      name,
      description,
      bookId,
      deadline,
    });
    res.status(201).json(await summary(view));
  });

  router.get('/groups/book-clubs/:id', async (req, res) => {
    const view = await clubs.get(req.params.id);
    const { club } = view;
    const [books, standings, poll] = await Promise.all([
      progress.books(club.rounds.map((r) => r.bookId.value)),
      progress.standings(club, club.currentRound),
      polls.find(GroupId.of(req.params.id)),
    ]);
    res
      .status(200)
      .json(
        toBookClubDetailDto(
          view,
          books,
          standings,
          poll ? await pollDto(poll, view, currentUser(res).id) : null,
        ),
      );
  });

  router.get('/me/book-clubs', async (_req, res) => {
    const views = await clubs.forMember(currentUserId(res));
    res.status(200).json(await Promise.all(views.map(summary)));
  });

  router.post('/groups/book-clubs/:id/rounds', async (req, res) => {
    const { bookId, deadline } = req.body ?? {};
    const view = await clubs.startNextRound(req.params.id, {
      userId: currentUserId(res),
      bookId,
      deadline,
    });
    res.status(201).json(await summary(view));
  });

  router.post('/groups/book-clubs/:id/poll', async (req, res) => {
    const { closesAt, anonymous } = req.body ?? {};
    const user = currentUser(res);
    const poll = await polls.open(req.params.id, { userId: user.id.value, closesAt, anonymous });
    res.status(201).json(await pollDto(poll, await clubs.get(req.params.id), user.id));
  });

  router.post('/groups/book-clubs/:id/poll/proposals', async (req, res) => {
    const user = currentUser(res);
    const poll = await polls.propose(req.params.id, user.id.value, req.body?.bookId);
    res.status(201).json(await pollDto(poll, await clubs.get(req.params.id), user.id));
  });

  router.put('/groups/book-clubs/:id/poll/vote', async (req, res) => {
    const user = currentUser(res);
    const poll = await polls.vote(req.params.id, user.id.value, req.body?.proposalId);
    res.status(200).json(await pollDto(poll, await clubs.get(req.params.id), user.id));
  });

  return router;
}
