import { Router } from 'express';
import { currentUserId } from '../../middleware/auth.js';
import { toReviewDto } from './review-dto.js';
import type { ReviewService } from './review-service.js';

// Mounted behind `authenticate` + `requireUser`: the reader always comes from the token.
export function reviewRoutes(reviews: ReviewService): Router {
  const router = Router();

  router.put('/book/:bookId/review', async (req, res) => {
    const { rating, comment } = req.body ?? {};
    const review = await reviews.write({
      userId: currentUserId(res),
      bookId: req.params.bookId,
      rating,
      comment,
    });
    res.status(200).json(toReviewDto(review));
  });

  router.delete('/book/:bookId/review', async (req, res) => {
    await reviews.remove(currentUserId(res), req.params.bookId);
    res.status(204).end();
  });

  router.get('/book/:bookId/reviews', async (req, res) => {
    res.status(200).json(await reviews.forBook(req.params.bookId, currentUserId(res)));
  });

  router.get('/users/:userId/reviews', async (req, res) => {
    res.status(200).json(await reviews.forProfile(req.params.userId, currentUserId(res)));
  });

  return router;
}
