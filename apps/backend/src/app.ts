import express, { type Express } from 'express';
import type { DatabaseHealthCheck } from './infrastructure/database/health-check.js';
import { Book } from './domain/book/book.js';
import { BookId } from './domain/book/book-id.js';
import type { IBookRepository } from './domain/book/book-repository.js';
import { InvalidValueError } from './domain/shared/domain-error.js';
import { toBookDto } from './http/book-dto.js';
import { READING_STATUS_TYPES, type ReadingStatusType } from './domain/reading/reading-state.js';
import type { IReadingStatusRepository } from './domain/reading/reading-status-repository.js';
import { UserId } from './domain/user/user-id.js';
import { SetReadingStatusUseCase } from './application/reading/set-reading-status.js';
import { UpdateReadingStatusUseCase } from './application/reading/update-reading-status.js';
import { domainErrorHandler } from './http/error-handler.js';
import { toReadingStatusDto } from './http/reading-status-dto.js';

export interface AppDependencies {
  healthCheck?: DatabaseHealthCheck;
  bookRepository?: IBookRepository;
  readingStatusRepository?: IReadingStatusRepository;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_STATUSES: readonly string[] = READING_STATUS_TYPES;

export function createApp(deps: AppDependencies = {}): Express {
  const app = express();

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.use(express.json());

  app.get('/health', async (_req, res) => {
    const isDbHealthy = deps.healthCheck ? await deps.healthCheck.isHealthy() : true;
    if (isDbHealthy) {
      res.status(200).json({ status: 'ok', db: 'ok' });
    } else {
      res.status(503).json({ status: 'error', db: 'down' });
    }
  });

  app.post('/book', async (req, res) => {
    if (!deps.bookRepository) {
      res.status(500).json({ error: 'Book repository not configured' });
      return;
    }

    const { title, description, isbn13, pageCount, coverUrl, isCommunityAdded } = req.body;

    let book: Book;
    try {
      book = Book.create({
        title,
        description,
        isbn13,
        pageCount: pageCount !== undefined && pageCount !== null ? Number(pageCount) : null,
        coverUrl,
        isCommunityAdded,
      });
    } catch (error) {
      if (!(error instanceof InvalidValueError)) throw error;
      res.status(400).json({ error: error.message });
      return;
    }

    try {
      await deps.bookRepository.save(book);
      res.status(201).json(toBookDto(book));
    } catch {
      res.status(500).json({ error: 'Failed to save book' });
    }
  });

  app.get('/book', async (req, res) => {
    if (!deps.bookRepository) {
      res.status(500).json({ error: 'Book repository not configured' });
      return;
    }

    const title = typeof req.query.title === 'string' ? req.query.title.trim() : '';
    const books = await deps.bookRepository.findByTitle(title);
    res.status(200).json(books.map(toBookDto));
  });

  app.get('/book/:id', async (req, res) => {
    if (!deps.bookRepository) {
      res.status(500).json({ error: 'Book repository not configured' });
      return;
    }

    const id = req.params.id;
    if (!UUID_REGEX.test(id)) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }

    const book = await deps.bookRepository.findById(BookId.of(id));
    if (!book) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }

    res.status(200).json(toBookDto(book));
  });

  app.delete('/book/:id', async (req, res) => {
    if (!deps.bookRepository) {
      res.status(500).json({ error: 'Book repository not configured' });
      return;
    }

    const id = req.params.id;
    if (!UUID_REGEX.test(id)) {
      res.status(400).json({ error: 'Invalid UUID format' });
      return;
    }

    const deleted = await deps.bookRepository.delete(BookId.of(id));
    if (!deleted) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }

    res.status(204).send();
  });

  const readingStatusUseCases = () => {
    if (!deps.readingStatusRepository || !deps.bookRepository) return null;
    return {
      set: new SetReadingStatusUseCase(deps.readingStatusRepository, deps.bookRepository),
      update: new UpdateReadingStatusUseCase(deps.readingStatusRepository, deps.bookRepository),
    };
  };

  app.put('/reading-status', async (req, res) => {
    const useCases = readingStatusUseCases();
    if (!useCases) {
      res.status(500).json({ error: 'Reading status repository not configured' });
      return;
    }

    const { userId, bookId, status, currentPage } = req.body;
    const entry = await useCases.set.execute({ userId, bookId, status, currentPage });
    res.status(200).json(toReadingStatusDto(entry));
  });

  const updateReadingStatusHandler = async (req: express.Request, res: express.Response) => {
    const useCases = readingStatusUseCases();
    if (!useCases) {
      res.status(500).json({ error: 'Reading status repository not configured' });
      return;
    }

    const { userId, bookId, status, currentPage } = req.body;
    const entry = await useCases.update.execute({
      id: req.params.id ?? req.body.id,
      userId,
      bookId,
      status,
      currentPage,
    });
    res.status(200).json(toReadingStatusDto(entry));
  };

  app.patch('/reading-status/:id', updateReadingStatusHandler);
  app.put('/reading-status/:id', updateReadingStatusHandler);
  app.patch('/reading-status', updateReadingStatusHandler);

  app.get('/user/:userId/library', async (req, res) => {
    if (!deps.readingStatusRepository) {
      res.status(500).json({ error: 'Reading status repository not configured' });
      return;
    }

    const userId = req.params.userId;
    if (!UUID_REGEX.test(userId)) {
      res.status(400).json({ error: 'Invalid user ID format' });
      return;
    }

    const statusQuery =
      typeof req.query.status === 'string' ? (req.query.status as ReadingStatusType) : undefined;
    const statusFilter =
      statusQuery && VALID_STATUSES.includes(statusQuery) ? statusQuery : undefined;

    const library = await deps.readingStatusRepository.findUserLibrary(
      UserId.of(userId),
      statusFilter,
    );
    res.status(200).json(library.map((item) => ({ ...item, book: toBookDto(item.book) })));
  });

  app.use(domainErrorHandler);

  return app;
}
