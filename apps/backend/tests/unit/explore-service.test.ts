// @req F-EXP-04
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Book } from '../../src/features/book/book.js';
import { ExploreService } from '../../src/features/explore/explore-service.js';
import type {
  BookMinutes,
  RankingWindow,
  ReadingActivityQuery,
} from '../../src/features/reading-session/reading-activity-query.js';
import type {
  BookReaders,
  ReadingProgressQuery,
} from '../../src/features/reading-status/reading-progress-query.js';
import { InMemoryBookRepository } from '../helpers/in-memory-repositories.js';

const NOW = new Date('2026-11-11T12:00:00Z');

function setup(minutes: BookMinutes[], readers: BookReaders[]) {
  const windows: RankingWindow[] = [];
  const activity: ReadingActivityQuery = {
    countedMinutes: async () => [],
    topBooks: async (window) => {
      windows.push(window);
      return minutes;
    },
  };
  const progress: ReadingProgressQuery = {
    progressOf: async () => [],
    mostAdded: async (window) => {
      windows.push(window);
      return readers;
    },
  };
  const books = new InMemoryBookRepository();
  const service = new ExploreService(activity, progress, books, () => NOW);
  return { service, books, windows };
}

describe('ExploreService', () => {
  test('asks both rankings for the last 7 days, 10 books each', async () => {
    const { service, windows } = setup([], []);

    await service.overview();

    assert.equal(windows.length, 2);
    for (const window of windows) {
      assert.deepEqual(window, { from: new Date('2026-11-04T12:00:00Z'), to: NOW, limit: 10 });
    }
  });

  test('keeps the ranking, orders ties by title and drops missing books', async () => {
    const dune = Book.create({ title: 'Dune' });
    const emma = Book.create({ title: 'Emma' });
    const circe = Book.create({ title: 'Circe' });
    const { service, books } = setup(
      [
        { bookId: emma.id.value, minutes: 30 },
        { bookId: dune.id.value, minutes: 30 },
        { bookId: circe.id.value, minutes: 10 },
        { bookId: 'f0000000-0000-4000-8000-000000000000', minutes: 5 },
      ],
      [{ bookId: circe.id.value, readers: 3 }],
    );
    await books.save(dune);
    await books.save(emma);
    await books.save(circe);

    const { mostReadThisWeek, trending } = await service.overview();

    assert.deepEqual(
      mostReadThisWeek.map((r) => [r.book.title.value, r.score]),
      [
        ['Dune', 30],
        ['Emma', 30],
        ['Circe', 10],
      ],
    );
    assert.deepEqual(
      trending.map((r) => [r.book.title.value, r.score]),
      [['Circe', 3]],
    );
  });

  test('gives empty lists when nobody read or added a book and there are no books', async () => {
    const { service } = setup([], []);
    assert.deepEqual(await service.overview(), {
      mostReadThisWeek: [],
      trending: [],
      suggestions: [],
    });
  });

  test('suggests up to 10 random books while nothing is trending', async () => {
    const { service, books } = setup([], []);
    for (let i = 0; i < 12; i++) await books.save(Book.create({ title: `Book ${i}` }));

    const { trending, suggestions } = await service.overview();

    assert.deepEqual(trending, []);
    assert.equal(suggestions.length, 10);
    assert.equal(new Set(suggestions.map((b) => b.id.value)).size, 10);
  });

  test('suggests nothing once a book is trending', async () => {
    const dune = Book.create({ title: 'Dune' });
    const { service, books } = setup([], [{ bookId: dune.id.value, readers: 1 }]);
    await books.save(dune);
    await books.save(Book.create({ title: 'Emma' }));

    assert.deepEqual((await service.overview()).suggestions, []);
  });
});
