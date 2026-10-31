import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { BookId } from '../../src/features/book/book.js';
import {
  MAX_COUNTED_SECONDS,
  NotSessionOwnerError,
  ReadingSession,
  SessionAlreadyFinishedError,
} from '../../src/features/reading-session/reading-session.js';
import { UserId } from '../../src/features/user/user.js';

const START = new Date('2026-10-31T10:00:00Z');
const after = (seconds: number) => new Date(START.getTime() + seconds * 1000);

describe('ReadingSession', () => {
  test('a new session is active with no counted minutes', () => {
    const session = ReadingSession.start(UserId.generate(), BookId.generate(), START);
    assert.strictEqual(session.isActive, true);
    assert.strictEqual(session.countedMinutes, 0);
    assert.strictEqual(session.elapsedSecondsAt(after(90)), 90);
  });

  test('finishing measures the duration with the server clock', () => {
    const reader = UserId.generate();
    const session = ReadingSession.start(reader, BookId.generate(), START);
    session.finish(reader, after(25 * 60 + 59));
    assert.strictEqual(session.isActive, false);
    assert.strictEqual(session.durationSeconds, 25 * 60 + 59);
    assert.strictEqual(session.countedMinutes, 25);
  });

  test('counted minutes are capped for a forgotten timer', () => {
    const reader = UserId.generate();
    const session = ReadingSession.start(reader, BookId.generate(), START);
    session.finish(reader, after(MAX_COUNTED_SECONDS * 2));
    assert.strictEqual(session.countedMinutes, MAX_COUNTED_SECONDS / 60);
  });

  test('a session cannot be finished twice', () => {
    const reader = UserId.generate();
    const session = ReadingSession.start(reader, BookId.generate(), START);
    session.finish(reader, after(60));
    assert.throws(() => session.finish(reader, after(120)), SessionAlreadyFinishedError);
  });

  test('only the reader who started it can finish it', () => {
    const session = ReadingSession.start(UserId.generate(), BookId.generate(), START);
    assert.throws(() => session.finish(UserId.generate(), after(60)), NotSessionOwnerError);
  });
});
