import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { OpenLibraryService } from '../../src/features/book/open-library-service.js';

describe('OpenLibraryService', () => {
  test('search with query requests Open Library search endpoint and parses books', async () => {
    let requestedUrl = '';
    const fakeFetch: typeof fetch = async (input) => {
      requestedUrl = String(input);
      return {
        ok: true,
        json: async () => ({
          docs: [
            {
              title: 'Dune',
              author_name: ['Frank Herbert'],
              cover_edition_key: 'OL32848840M',
              isbn: ['0441172717', '9780441172719'],
              number_of_pages_median: 608,
              first_sentence: ['A Beginning is the time for taking the most delicate care.'],
            },
          ],
        }),
      } as unknown as Response;
    };

    const service = new OpenLibraryService(fakeFetch);
    const results = await service.search('dune', 5);

    assert.ok(requestedUrl.includes('https://openlibrary.org/search.json?q=dune'));
    assert.strictEqual(results.length, 1);
    assert.deepStrictEqual(results[0], {
      title: 'Dune',
      authorName: 'Frank Herbert',
      isbn13: '9780441172719',
      pageCount: 608,
      coverUrl: 'https://covers.openlibrary.org/b/olid/OL32848840M-L.jpg',
      description: 'A Beginning is the time for taking the most delicate care.',
    });
  });

  test('search with empty query requests trending endpoint and parses edition_key', async () => {
    let requestedUrl = '';
    const fakeFetch: typeof fetch = async (input) => {
      requestedUrl = String(input);
      return {
        ok: true,
        json: async () => ({
          works: [
            {
              title: 'Atomic Habits',
              author_name: ['James Clear'],
              edition_key: ['OL36647151M'],
              isbn: ['9780735211292'],
              number_of_pages_median: 320,
            },
          ],
        }),
      } as unknown as Response;
    };

    const service = new OpenLibraryService(fakeFetch);
    const results = await service.search('   ', 5);

    assert.ok(requestedUrl.includes('https://openlibrary.org/trending/daily.json'));
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0]?.title, 'Atomic Habits');
    assert.strictEqual(results[0]?.authorName, 'James Clear');
    assert.strictEqual(
      results[0]?.coverUrl,
      'https://covers.openlibrary.org/b/olid/OL36647151M-L.jpg',
    );
    assert.strictEqual(results[0]?.isbn13, '9780735211292');
  });

  test('returns empty array when response is not ok or network error occurs', async () => {
    const errorFetch: typeof fetch = async () => {
      throw new Error('Network failure');
    };

    const service = new OpenLibraryService(errorFetch);
    const results = await service.search('error');
    assert.deepStrictEqual(results, []);

    const notOkFetch: typeof fetch = async () =>
      ({ ok: false, status: 500 }) as unknown as Response;
    const notOkService = new OpenLibraryService(notOkFetch);
    assert.deepStrictEqual(await notOkService.search('error'), []);
  });
});
