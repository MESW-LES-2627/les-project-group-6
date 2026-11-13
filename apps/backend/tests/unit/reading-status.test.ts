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

  describe('reading dates', () => {
    test('a new entry starts with null dates', () => {
      const entry = newEntry();
      assert.strictEqual(entry.startedOn, null);
      assert.strictEqual(entry.finishedOn, null);
    });

    test('starting to read sets startedOn to given or current day', () => {
      const entry = newEntry();
      entry.startReading('2026-10-15');
      assert.strictEqual(entry.startedOn, '2026-10-15');
      assert.strictEqual(entry.finishedOn, null);
    });

    test('finishing sets finishedOn and startedOn if startedOn was missing', () => {
      const entry = newEntry();
      entry.finish(PAGES, '2026-10-20');
      assert.strictEqual(entry.startedOn, '2026-10-20');
      assert.strictEqual(entry.finishedOn, '2026-10-20');
    });

    test('finishing keeps earlier startedOn if already set', () => {
      const entry = newEntry();
      entry.startReading('2026-10-10');
      entry.finish(PAGES, '2026-10-20');
      assert.strictEqual(entry.startedOn, '2026-10-10');
      assert.strictEqual(entry.finishedOn, '2026-10-20');
    });

    test('re-reading resets finishedOn to null', () => {
      const entry = newEntry();
      entry.startReading('2026-10-10');
      entry.finish(PAGES, '2026-10-20');
      assert.strictEqual(entry.finishedOn, '2026-10-20');

      entry.startReading('2026-11-01');
      assert.strictEqual(entry.status, 'in-progress');
      assert.strictEqual(entry.finishedOn, null);
    });

    test('setDates updates startedOn and finishedOn when valid', () => {
      const entry = newEntry();
      entry.setDates('2026-09-01', '2026-09-15');
      assert.strictEqual(entry.startedOn, '2026-09-01');
      assert.strictEqual(entry.finishedOn, '2026-09-15');
    });

    test('setDates rejects invalid date formats', () => {
      const entry = newEntry();
      assert.throws(() => entry.setDates('not-a-date', null));
      assert.throws(() => entry.setDates(null, '2026-02-30'));
    });

    test('setDates rejects finishedOn earlier than startedOn', () => {
      const entry = newEntry();
      assert.throws(() => entry.setDates('2026-10-20', '2026-10-10'));
    });
  });
});

describe('ReadingState.allowsReview (F-LIB-02)', () => {
  const cases = [
    ['not-started', false],
    ['in-progress', true],
    ['finished', true],
    ['did-not-finish', true],
  ] as const;
  for (const [type, expected] of cases) {
    test(`${type} ${expected ? 'allows' : 'does not allow'} a review`, () => {
      assert.equal(ReadingState.of(type).allowsReview, expected);
    });
  }
});
