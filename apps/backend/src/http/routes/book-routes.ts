import { Router } from 'express';
import type { GetBookUseCase } from '../../application/book/get-book.js';
import type { RegisterBookUseCase } from '../../application/book/register-book.js';
import type { RemoveBookUseCase } from '../../application/book/remove-book.js';
import type { SearchBooksUseCase } from '../../application/book/search-books.js';
import { toBookDto } from '../book-dto.js';

export interface BookUseCases {
  register: RegisterBookUseCase;
  get: GetBookUseCase;
  search: SearchBooksUseCase;
  remove: RemoveBookUseCase;
}

// Controllers only translate HTTP to use case calls; domain errors propagate to
// the error handler.
export function bookRoutes(useCases: BookUseCases): Router {
  const router = Router();

  router.post('/book', async (req, res) => {
    const { title, description, isbn13, pageCount, coverUrl, isCommunityAdded } = req.body;
    const book = await useCases.register.execute({
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
    const books = await useCases.search.execute(title);
    res.status(200).json(books.map(toBookDto));
  });

  router.get('/book/:id', async (req, res) => {
    const book = await useCases.get.execute(req.params.id);
    res.status(200).json(toBookDto(book));
  });

  router.delete('/book/:id', async (req, res) => {
    await useCases.remove.execute(req.params.id);
    res.status(204).send();
  });

  return router;
}
