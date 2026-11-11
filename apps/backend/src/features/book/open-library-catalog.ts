import { LRUCache } from 'lru-cache';
import { Isbn13 } from './book.js';
import type { BookCatalog, CatalogBook } from './book-catalog.js';
import type { QueryCache } from './query-cache.js';

const FIELDS = 'title,author_name,isbn,number_of_pages_median,cover_i,first_sentence';
const ONE_HOUR_MS = 60 * 60 * 1000;

interface OpenLibraryDoc {
  title?: unknown;
  author_name?: unknown;
  isbn?: unknown;
  number_of_pages_median?: unknown;
  cover_i?: unknown;
  first_sentence?: unknown;
}

export interface OpenLibraryCatalogOptions {
  baseUrl?: string;
  timeoutMs?: number;
  cache?: QueryCache<CatalogBook[]>;
  fetchFn?: typeof fetch;
  logger?: Pick<Console, 'warn'>;
}

/** Adapter: book search through https://openlibrary.org/dev/docs/api/search. */
export class OpenLibraryCatalog implements BookCatalog {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly cache: QueryCache<CatalogBook[]>;
  private readonly fetchFn: typeof fetch;
  private readonly logger: Pick<Console, 'warn'>;

  constructor(options: OpenLibraryCatalogOptions = {}) {
    this.baseUrl = (options.baseUrl ?? 'https://openlibrary.org').replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs ?? 3000;
    this.cache =
      options.cache ?? new LRUCache<string, CatalogBook[]>({ max: 500, ttl: ONE_HOUR_MS });
    this.fetchFn = options.fetchFn ?? fetch;
    this.logger = options.logger ?? console;
  }

  async search(query: string, limit: number): Promise<CatalogBook[]> {
    const key = `${limit}:${query.trim().toLowerCase()}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    try {
      const params = new URLSearchParams({ q: query.trim(), limit: String(limit), fields: FIELDS });
      const response = await this.fetchFn(`${this.baseUrl}/search.json?${params}`, {
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = (await response.json()) as { docs?: OpenLibraryDoc[] };
      const found = (body.docs ?? []).flatMap((doc) => toCatalogBook(doc) ?? []);
      this.cache.set(key, found);
      return found;
    } catch (error) {
      // Failures are not cached, so the next search tries again.
      this.logger.warn(`Open Library search failed (${query.length} chars): ${String(error)}`);
      return [];
    }
  }
}

function toCatalogBook(doc: OpenLibraryDoc): CatalogBook | null {
  const title = typeof doc.title === 'string' ? doc.title.trim() : '';
  const isbn13 = firstIsbn13(doc.isbn);
  if (!title || !isbn13) return null;

  const pages = doc.number_of_pages_median;
  const sentence = Array.isArray(doc.first_sentence) ? doc.first_sentence[0] : null;
  return {
    title,
    isbn13,
    authors: Array.isArray(doc.author_name)
      ? doc.author_name.filter((a): a is string => typeof a === 'string')
      : [],
    description: typeof sentence === 'string' ? sentence : null,
    pageCount: typeof pages === 'number' && Number.isInteger(pages) && pages > 0 ? pages : null,
    // Cover-id URLs are not rate limited; ISBN and OLID cover URLs are.
    coverUrl:
      typeof doc.cover_i === 'number'
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
        : null,
  };
}

function firstIsbn13(isbns: unknown): string | null {
  if (!Array.isArray(isbns)) return null;
  for (const raw of isbns) {
    try {
      if (typeof raw === 'string' && raw.replace(/[-\s]/g, '').length === 13) {
        return Isbn13.of(raw).value;
      }
    } catch {
      // Bad check digit: try the next one.
    }
  }
  return null;
}
