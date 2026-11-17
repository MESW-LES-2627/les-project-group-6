// @req F-EXP-01
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { OpenLibraryCatalog } from '../../src/features/book/open-library-catalog.js';

const DUNE_DOC = {
  title: 'Dune',
  author_name: ['Frank Herbert'],
  isbn: ['0441172717', '9780441172719'],
  number_of_pages_median: 412,
  cover_i: 11481354,
  first_sentence: ['In the week before their departure to Arrakis...'],
};

function fakeFetch(body: unknown, status = 200) {
  const calls: string[] = [];
  const fn = async (url: string | URL | Request) => {
    calls.push(String(url));
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
  };
  return { fn: fn as typeof fetch, calls };
}

const quiet = { warn: () => {} };

describe('OpenLibraryCatalog', () => {
  test('maps a search result to a catalogue book', async () => {
    const { fn, calls } = fakeFetch({ docs: [DUNE_DOC] });
    const catalog = new OpenLibraryCatalog({
      baseUrl: 'https://ol.test',
      fetchFn: fn,
      logger: quiet,
    });

    const found = await catalog.search('dune', 20);

    assert.deepEqual(found, [
      {
        title: 'Dune',
        isbn13: '9780441172719',
        authors: ['Frank Herbert'],
        description: 'In the week before their departure to Arrakis...',
        pageCount: 412,
        coverUrl: 'https://covers.openlibrary.org/b/id/11481354-L.jpg',
      },
    ]);
    assert.match(calls[0]!, /^https:\/\/ol\.test\/search\.json\?q=dune&limit=20&fields=/);
  });

  test('skips results without a valid ISBN-13 and fills missing fields with null', async () => {
    const { fn } = fakeFetch({
      docs: [
        { title: 'No ISBN' },
        { title: 'Bad check digit', isbn: ['9780441172710'] },
        { title: 'Bare', isbn: ['9780441172719'] },
      ],
    });
    const catalog = new OpenLibraryCatalog({ fetchFn: fn, logger: quiet });

    assert.deepEqual(await catalog.search('x', 20), [
      {
        title: 'Bare',
        isbn13: '9780441172719',
        authors: [],
        description: null,
        pageCount: null,
        coverUrl: null,
      },
    ]);
  });

  test('answers with no books when Open Library fails', async () => {
    const failing = [
      fakeFetch({}, 500).fn,
      fakeFetch('not json').fn,
      (async () => {
        throw new DOMException('timed out', 'TimeoutError');
      }) as typeof fetch,
    ];
    for (const fetchFn of failing) {
      const catalog = new OpenLibraryCatalog({ fetchFn, logger: quiet });
      assert.deepEqual(await catalog.search('dune', 20), []);
    }
  });

  test('serves the same query from the cache, ignoring case and spaces', async () => {
    const { fn, calls } = fakeFetch({ docs: [DUNE_DOC] });
    const catalog = new OpenLibraryCatalog({ fetchFn: fn, logger: quiet });

    await catalog.search('Dune', 20);
    const again = await catalog.search('  dune ', 20);

    assert.equal(calls.length, 1);
    assert.equal(again[0]!.title, 'Dune');
  });

  test('does not cache a failure', async () => {
    const { fn, calls } = fakeFetch({}, 500);
    const catalog = new OpenLibraryCatalog({ fetchFn: fn, logger: quiet });

    await catalog.search('dune', 20);
    await catalog.search('dune', 20);

    assert.equal(calls.length, 2);
  });

  test('does not log the search text when Open Library fails', async () => {
    const { fn } = fakeFetch({}, 500);
    const messages: string[] = [];
    const catalog = new OpenLibraryCatalog({
      baseUrl: 'https://ol.test',
      fetchFn: fn,
      logger: { warn: (message: string) => void messages.push(message) },
    });

    assert.deepEqual(await catalog.search('secret words', 20), []);

    assert.equal(messages.length, 1);
    assert.ok(!messages[0]!.includes('secret'));
  });
});
