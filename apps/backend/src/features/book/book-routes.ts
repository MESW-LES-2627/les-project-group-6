import { Router } from 'express';
import type { Book } from './book.js';
import type { BookService } from './book-service.js';

// Shape of a book on the wire. Keeps value objects out of the JSON contract.
export interface BookDto {
  id: string;
  title: string;
  description: string | null;
  isbn13: string | null;
  pageCount: number | null;
  coverUrl: string | null;
  isCommunityAdded: boolean;
  createdAt: string;
}

export function toBookDto(book: Book): BookDto {
  return {
    id: book.id.value,
    title: book.title.value,
    description: book.description,
    isbn13: book.isbn13?.value ?? null,
    pageCount: book.pageCount?.value ?? null,
    coverUrl: book.coverUrl,
    isCommunityAdded: book.isCommunityAdded,
    createdAt: book.createdAt.toISOString(),
  };
}

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

  router.delete('/book/:id', async (req, res) => {
    await books.remove(req.params.id);
    res.status(204).send();
  });

  return router;
}
