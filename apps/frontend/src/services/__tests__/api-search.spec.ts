// @req F-EXP-01
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/auth', () => ({
  authProvider: { accessToken: vi.fn<() => Promise<string | null>>() },
  isAuthConfigured: () => false,
}));

import { searchBooks } from '../api';

describe('searchBooks', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the text as ?q= and can be cancelled by the caller', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('[]', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();

    await expect(searchBooks('hary poter', controller.signal)).resolves.toEqual([]);

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/book?q=hary%20poter');
    expect(init!.signal!.aborted).toBe(false);
    controller.abort();
    expect(init!.signal!.aborted).toBe(true);
  });
});
