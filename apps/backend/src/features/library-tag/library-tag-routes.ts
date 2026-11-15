import { Router } from 'express';
import { currentUserId } from '../../middleware/auth.js';
import type { LibraryTagService } from './library-tag-service.js';

export function libraryTagRoutes(tags: LibraryTagService): Router {
  const router = Router();

  router.get('/me/library/tags', async (_req, res) => {
    res.status(200).json(await tags.list(currentUserId(res)));
  });

  router.post('/me/library/books/:bookId/tags', async (req, res) => {
    const tag = await tags.tagBook({
      userId: currentUserId(res),
      bookId: req.params.bookId,
      name: req.body?.name,
    });
    res.status(200).json(tag);
  });

  router.delete('/me/library/books/:bookId/tags/:tagId', async (req, res) => {
    await tags.untagBook({
      userId: currentUserId(res),
      bookId: req.params.bookId,
      tagId: req.params.tagId,
    });
    res.status(204).end();
  });

  return router;
}
