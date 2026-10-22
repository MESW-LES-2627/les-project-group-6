import express, { type Express } from 'express';
import type { DatabaseHealthCheck } from './infrastructure/database/health-check.js';
import { Book, type IBookRepository } from './domain/book.js';
import {
  ReadingStatus,
  type IReadingStatusRepository,
  type ReadingStatusType,
} from './domain/reading-status.js';

export interface AppDependencies {
  healthCheck?: DatabaseHealthCheck;
  bookRepository?: IBookRepository;
  readingStatusRepository?: IReadingStatusRepository;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_STATUSES: ReadingStatusType[] = [
  'not-started',
  'in-progress',
  'finished',
  'did-not-finish',
];

export function createApp(deps: AppDependencies = {}): Express {
  const app = express();
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

    const { title, description, isbn13, pageCount, coverUrl, isCommunityAdded, id } = req.body;
    if (!title || typeof title !== 'string' || title.trim() === '') {
      res.status(400).json({ error: 'Title is required' });
      return;
    }

    const book = new Book({
      id,
      title: title.trim(),
      description,
      isbn13,
      pageCount: pageCount !== undefined && pageCount !== null ? Number(pageCount) : null,
      coverUrl,
      isCommunityAdded,
    });

    try {
      await deps.bookRepository.save(book);
      res.status(201).json(book);
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
    res.status(200).json(books);
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

    const book = await deps.bookRepository.findById(id);
    if (!book) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }

    res.status(200).json(book);
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

    const deleted = await deps.bookRepository.delete(id);
    if (!deleted) {
      res.status(404).json({ error: 'Book not found' });
      return;
    }

    res.status(204).send();
  });

  app.put('/reading-status', async (req, res) => {
    if (!deps.readingStatusRepository) {
      res.status(500).json({ error: 'Reading status repository not configured' });
      return;
    }

    const { userId, bookId, status, currentPage } = req.body;
    if (!userId || !UUID_REGEX.test(userId)) {
      res.status(400).json({ error: 'Valid userId is required' });
      return;
    }
    if (!bookId || !UUID_REGEX.test(bookId)) {
      res.status(400).json({ error: 'Valid bookId is required' });
      return;
    }

    if (!status || !VALID_STATUSES.includes(status)) {
      res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
      return;
    }

    const entry = new ReadingStatus({
      userId,
      bookId,
      status,
      currentPage: typeof currentPage === 'number' && currentPage >= 0 ? currentPage : 0,
    });

    try {
      await deps.readingStatusRepository.save(entry);
      res.status(200).json(entry);
    } catch {
      res.status(500).json({ error: 'Failed to update reading status' });
    }
  });

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

    const library = await deps.readingStatusRepository.findUserLibrary(userId, statusFilter);
    res.status(200).json(library);
  });

  return app;
}
