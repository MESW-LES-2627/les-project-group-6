import { Router } from 'express';
import { toBookDto } from '../book/book-dto.js';
import type { ExploreService } from './explore-service.js';

// F-EXP-04: the two weekly lists of the Explore page. No activity is an empty list, not an error.
export function exploreRoutes(explore: ExploreService): Router {
  const router = Router();

  router.get('/explore', async (_req, res) => {
    const { mostReadThisWeek, trending } = await explore.overview();
    res.status(200).json({
      mostReadThisWeek: mostReadThisWeek.map((r) => ({
        book: toBookDto(r.book),
        minutes: r.score,
      })),
      trending: trending.map((r) => ({ book: toBookDto(r.book), readers: r.score })),
    });
  });

  return router;
}
