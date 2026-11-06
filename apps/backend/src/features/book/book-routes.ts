import { Router } from 'express';
import type { BookService } from './book-service.js';
import { toBookDto } from './book-dto.js';

// Controllers only translate HTTP to service calls; domain errors propagate to
// the error handler.
export function bookRoutes(books: BookService): Router {
  const router = Router();

  router.post('/book', async (req, res) => {
    const { title, description, isbn13, pageCount, coverUrl, isCommunityAdded } = req.body;
    const book = await books.register({
      title,
      description,
      isbn13,
      pageCount: pageCount !== undefined && pageCount !== null ? Number(pageCount) : null,
      coverUrl,
      isCommunityAdded,
    });
    res.status(201).json(toBookDto(book));
  });

  router.get('/book', async (req, res) => {
    const title = typeof req.query.title === 'string' ? req.query.title : '';
    const found = await books.search(title);
    res.status(200).json(found.map(toBookDto));
  });

  router.get('/book/:id', async (req, res) => {
    const book = await books.get(req.params.id);
    res.status(200).json(toBookDto(book));
  });

  router.post('/book/open-library', async (req, res) => {
    const query =
      typeof req.body?.query === 'string'
        ? req.body.query
        : typeof req.query?.query === 'string'
          ? req.query.query
          : undefined;
    const imported = await books.importFromOpenLibrary(query);
    res.status(200).json(imported.map(toBookDto));
  });

  router.delete('/book/:id', async (req, res) => {
    await books.remove(req.params.id);
    res.status(204).send();
  });

  return router;
}
