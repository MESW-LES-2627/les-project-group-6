import { Router } from 'express';
import { currentUserId } from '../../middleware/auth.js';
import type { LibraryFolderService } from './library-folder-service.js';

export function libraryFolderRoutes(folders: LibraryFolderService): Router {
  const router = Router();

  router.get('/me/library/folders', async (_req, res) => {
    const list = await folders.list(currentUserId(res));
    res.status(200).json(list);
  });

  router.post('/me/library/folders', async (req, res) => {
    const folder = await folders.create({
      userId: currentUserId(res),
      name: req.body?.name,
    });
    res.status(201).json(folder);
  });

  router.patch('/me/library/folders/:folderId', async (req, res) => {
    const folder = await folders.rename({
      userId: currentUserId(res),
      folderId: req.params.folderId,
      name: req.body?.name,
    });
    res.status(200).json(folder);
  });

  router.delete('/me/library/folders/:folderId', async (req, res) => {
    await folders.remove({
      userId: currentUserId(res),
      folderId: req.params.folderId,
    });
    res.status(204).end();
  });

  router.put('/me/library/folders/:folderId/books/:bookId', async (req, res) => {
    await folders.addBook({
      userId: currentUserId(res),
      folderId: req.params.folderId,
      bookId: req.params.bookId,
    });
    res.status(204).end();
  });

  router.delete('/me/library/folders/:folderId/books/:bookId', async (req, res) => {
    await folders.removeBook({
      userId: currentUserId(res),
      folderId: req.params.folderId,
      bookId: req.params.bookId,
    });
    res.status(204).end();
  });

  return router;
}
