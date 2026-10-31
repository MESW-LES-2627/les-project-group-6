import type { ReadingSession } from './reading-session.js';

// Shape of a reading session on the wire. Keeps value objects out of the JSON contract.
export interface ReadingSessionDto {
  id: string;
  userId: string;
  bookId: string;
  startedAt: string;
  endedAt: string | null;
  /** Seconds measured by the server; while running, the time elapsed so far. */
  elapsedSeconds: number;
  countedMinutes: number;
}

export function toReadingSessionDto(
  session: ReadingSession,
  elapsedSeconds: number,
): ReadingSessionDto {
  return {
    id: session.id.value,
    userId: session.userId.value,
    bookId: session.bookId.value,
    startedAt: session.startedAt.toISOString(),
    endedAt: session.endedAt?.toISOString() ?? null,
    elapsedSeconds,
    countedMinutes: session.countedMinutes,
  };
}
