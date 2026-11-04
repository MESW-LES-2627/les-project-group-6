import { Router } from 'express';
import { GroupId } from '../group/group.js';
import { UserId } from '../user/user.js';
import { toBookClubDetailDto, toBookClubDto, toPollDto, type PollDto } from './book-club-dto.js';
import type { BookClubService, BookClubView } from './book-club-service.js';
import type { BookPoll } from './book-poll.js';
import type { BookPollService } from './book-poll-service.js';
import type { ClubProgressQuery } from './club-progress-query.js';

// userId comes from the body/query until Supabase Auth lands; then it comes from the token.
export function bookClubRoutes(
  clubs: BookClubService,
  polls: BookPollService,
  progress: ClubProgressQuery,
): Router {
  const router = Router();

  const summary = async (view: BookClubView) =>
    toBookClubDto(view, await progress.books([view.club.currentRound.bookId.value]));

  const pollDto = async (poll: BookPoll, view: BookClubView, reader: unknown): Promise<PollDto> => {
    const [books, names] = await Promise.all([
      progress.books(poll.proposals.map((p) => p.bookId.value)),
      progress.names(poll.proposals.map((p) => p.proposedBy.value)),
    ]);
    const readerId = typeof reader === 'string' ? UserId.of(reader) : null;
    return toPollDto(poll, new Date(), readerId, view.club.members.length, books, names);
  };

  router.post('/groups/book-clubs', async (req, res) => {
    const { userId, name, description, bookId, deadline } = req.body;
    const view = await clubs.create({ userId, name, description, bookId, deadline });
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
          poll ? await pollDto(poll, view, req.query.userId) : null,
        ),
      );
  });

  router.get('/user/:userId/book-clubs', async (req, res) => {
    const views = await clubs.forMember(req.params.userId);
    res.status(200).json(await Promise.all(views.map(summary)));
  });

  router.post('/groups/book-clubs/:id/rounds', async (req, res) => {
    const { userId, bookId, deadline } = req.body;
    const view = await clubs.startNextRound(req.params.id, { userId, bookId, deadline });
    res.status(201).json(await summary(view));
  });

  router.post('/groups/book-clubs/:id/poll', async (req, res) => {
    const { userId, closesAt, anonymous } = req.body;
    const poll = await polls.open(req.params.id, { userId, closesAt, anonymous });
    res.status(201).json(await pollDto(poll, await clubs.get(req.params.id), userId));
  });

  router.post('/groups/book-clubs/:id/poll/proposals', async (req, res) => {
    const { userId, bookId } = req.body;
    const poll = await polls.propose(req.params.id, userId, bookId);
    res.status(201).json(await pollDto(poll, await clubs.get(req.params.id), userId));
  });

  router.put('/groups/book-clubs/:id/poll/vote', async (req, res) => {
    const { userId, proposalId } = req.body;
    const poll = await polls.vote(req.params.id, userId, proposalId);
    res.status(200).json(await pollDto(poll, await clubs.get(req.params.id), userId));
  });

  return router;
}
