import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { BookId, PageCount } from '../../src/features/book/book.js';
import {
  PageProgress,
  InvalidReadingStatusError,
  InvalidReadingTransitionError,
  ReadingState,
} from '../../src/features/reading-status/reading-state.js';
import {
  ProgressNotAllowedError,
  ReadingStatus,
} from '../../src/features/reading-status/reading-status.js';
import { UserId } from '../../src/features/user/user.js';

const PAGES = PageCount.of(300);
const newEntry = () => ReadingStatus.create(UserId.generate(), BookId.generate());

describe('ReadingStatus', () => {
  test('a new entry is not started, at page 0', () => {
    const entry = newEntry();
    assert.strictEqual(entry.status, 'not-started');
    assert.strictEqual(entry.progress.page, 0);
  });

  test('progress can only be recorded while reading', () => {
    const entry = newEntry();
    assert.throws(() => entry.updateProgress(PageProgress.of(10)), ProgressNotAllowedError);

    entry.startReading();
    entry.updateProgress(PageProgress.of(10));
    assert.strictEqual(entry.progress.page, 10);
  });

  test('finishing jumps the progress to the last page', () => {
    const entry = newEntry();
    entry.startReading();
    entry.updateProgress(PageProgress.of(50));
    entry.finish(PAGES);
    assert.strictEqual(entry.status, 'finished');
    assert.strictEqual(entry.progress.page, 300);
    assert.throws(() => entry.updateProgress(PageProgress.of(10)), ProgressNotAllowedError);
  });

  test('re-reading a finished book starts from page 0', () => {
    const entry = newEntry();
    entry.finish(PAGES);
    entry.startReading();
    assert.strictEqual(entry.status, 'in-progress');
    assert.strictEqual(entry.progress.page, 0);
  });

  test('abandoning keeps the page where the reader stopped', () => {
    const entry = newEntry();
    entry.startReading();
    entry.updateProgress(PageProgress.of(77));
    entry.abandon();
    assert.strictEqual(entry.status, 'did-not-finish');
    assert.strictEqual(entry.progress.page, 77);
  });

  test('invalid transitions are rejected', () => {
    const entry = newEntry();
    assert.throws(() => entry.abandon(), InvalidReadingTransitionError);
    entry.finish(PAGES);
    assert.throws(() => entry.abandon(), InvalidReadingTransitionError);
    assert.throws(() => entry.moveBackToShelf(), InvalidReadingTransitionError);
  });

  test('changeStatus goes through the matching intention and ignores no-op changes', () => {
    const entry = newEntry();
    entry.changeStatus('not-started', PAGES);
    assert.strictEqual(entry.status, 'not-started');
    entry.changeStatus('in-progress', PAGES);
    assert.strictEqual(entry.status, 'in-progress');
    entry.changeStatus('finished', PAGES);
    assert.strictEqual(entry.progress.page, 300);
  });

  test('ReadingState.of rejects unknown statuses', () => {
    assert.throws(() => ReadingState.of('reading'), InvalidReadingStatusError);
  });
});
