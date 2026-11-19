import type { Clock } from '../../utils/clock.js';
import { BusinessRuleViolationError, NotFoundError } from '../../utils/errors.js';
import { BookId } from '../book/book.js';
import type { IBookRepository } from '../book/book-repository.js';
import type { ReadingStatusService } from '../reading-status/reading-status-service.js';
import { UserId } from '../user/user.js';
import type { StreakService } from '../user/streak-service.js';
import { sessionCountsForStreak } from '../user/streak-rules.js';
import { ReadingSession, ReadingSessionId } from './reading-session.js';
import type { IReadingSessionRepository, ReadingStats } from './reading-session-repository.js';

export class AnotherSessionActiveError extends BusinessRuleViolationError {
  constructor() {
    super('Only one reading session can run at a time; finish the active one first');
  }
}

export interface StartReadingSessionCommand {
  userId: unknown;
  bookId: unknown;
}

export interface CancelReadingSessionCommand {
  id: unknown;
  userId: unknown;
}

export interface FinishReadingSessionCommand {
  id: unknown;
  userId: unknown;
}

/** Domain event: a reader stopped a session and its minutes were saved. */
export interface SessionCompleted {
  sessionId: string;
  userId: string;
  bookId: string;
  startedAt: Date;
  endedAt: Date;
  countedMinutes: number;
}

// Observer: features that react to a finished session (badges, feed) subscribe here
// instead of being called by this service.
export interface SessionCompletedListener {
  sessionCompleted(event: SessionCompleted): Promise<void>;
}

// Application service: one method per use case on the reader's timed sessions.
export class ReadingSessionService {
  constructor(
    private readonly sessions: IReadingSessionRepository,
    private readonly books: IBookRepository,
    private readonly now: Clock = () => new Date(),
    private readonly readingStatuses?: ReadingStatusService,
    private readonly streakService?: StreakService,
    private readonly listeners: SessionCompletedListener[] = [],
  ) {}

  /**
   * Starts the timer on a book. Starting again on the same book resumes the
   * running session, so a reload does not reset the clock.
   */
  async start(command: StartReadingSessionCommand): Promise<ReadingSession> {
    const userId = UserId.of(command.userId);
    const bookId = BookId.of(command.bookId);

    const book = await this.books.findById(bookId);
    if (!book) throw new NotFoundError('Book');

    // Check-then-insert must not interleave for one reader (double click, two tabs).
    const session = await this.sessions.withReaderLock(userId, async (sessions) => {
      const active = await sessions.findActiveByUser(userId);
      if (active) {
        if (active.bookId.equals(bookId)) return active;
        throw new AnotherSessionActiveError();
      }

      const session = ReadingSession.start(userId, bookId, this.now());
      await sessions.save(session);
      return session;
    });

    await this.readingStatuses?.ensureInProgress(userId, bookId);
    return session;
  }

  /** Stops the timer and records the minutes measured by the server. */
  async finish(command: FinishReadingSessionCommand): Promise<ReadingSession> {
    const session = await this.sessions.findById(ReadingSessionId.of(command.id));
    if (!session) throw new NotFoundError('Reading session');

    session.finish(UserId.of(command.userId), this.now());
    await this.sessions.save(session);
    // F-READ-04: only sessions of 5+ minutes count for the streak.
    if (sessionCountsForStreak(session.countedMinutes)) {
      await this.streakService?.recordReadToday(session.userId, session.endedAt ?? undefined);
    }
    // Published once, after the session is saved.
    const event: SessionCompleted = {
      sessionId: session.id.value,
      userId: session.userId.value,
      bookId: session.bookId.value,
      startedAt: session.startedAt,
      endedAt: session.endedAt ?? this.now(),
      countedMinutes: session.countedMinutes,
    };
    for (const listener of this.listeners) await listener.sessionCompleted(event);
    return session;
  }

  /** Discards a running session started by mistake, so it never counts. */
  async cancel(command: CancelReadingSessionCommand): Promise<void> {
    const session = await this.sessions.findById(ReadingSessionId.of(command.id));
    if (!session) throw new NotFoundError('Reading session');

    session.cancel(UserId.of(command.userId));
    await this.sessions.delete(session.id);
  }

  active(userId: unknown): Promise<ReadingSession | null> {
    return this.sessions.findActiveByUser(UserId.of(userId));
  }

  stats(userId: unknown): Promise<ReadingStats> {
    return this.sessions.statsForUser(UserId.of(userId));
  }

  elapsedSeconds(session: ReadingSession): number {
    return session.elapsedSecondsAt(this.now());
  }
}
