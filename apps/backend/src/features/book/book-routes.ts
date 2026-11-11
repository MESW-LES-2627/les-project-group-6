import { Router } from 'express';
import type { BookService } from './book-service.js';
import { toBookDto } from './book-dto.js';

// Controllers only translate HTTP to service calls; domain errors propagate to
// the error handler.
export function bookRoutes(books: BookService): Router {
  const router = Router();

  router.post('/book', async (req, res) => {
    const { title, description, isbn13, pageCount, coverUrl, authors } = req.body ?? {};
    const book = await books.register(
      {
        title,
        description,
        isbn13,
        pageCount: pageCount !== undefined && pageCount !== null ? Number(pageCount) : null,
        coverUrl,
        // A book added through the API always comes from a reader, never from the catalogue.
        isCommunityAdded: true,
      },
      toAuthorNames(authors),
    );
    res.status(201).json(toBookDto(book));
  });

  // F-EXP-01: ?q= is a title, author or ISBN; results come best match first.
  router.get('/book', async (req, res) => {
    const query = typeof req.query.q === 'string' ? req.query.q : '';
    const found = await books.search(query);
    res.status(200).json(found.map(toBookDto));
  });

  router.get('/book/:id', async (req, res) => {
    const book = await books.get(req.params.id);
    res.status(200).json(toBookDto(book));
  });

  // There is no DELETE /book/:id: other readers' statuses, reviews and sessions
  // cascade from the book, and no reader owns the shared catalogue.

  return router;
}

// `authors` may be one name or a list; anything else is ignored.
function toAuthorNames(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : [raw];
  return list.filter((n): n is string => typeof n === 'string');
}
