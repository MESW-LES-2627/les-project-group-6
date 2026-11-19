// @req F-PROF-01
import { describe, expect, it } from 'vitest';

import type { ApiLibraryItem, ApiMe } from '@/services/api';
import {
  foldersFrom,
  generatedCover,
  recentlyAddedFrom,
  shelfFrom,
  toProfileUser,
} from '../profile';

const item = (
  id: string,
  status: ApiLibraryItem['status'],
  pageCount: number | null,
  updatedAt: string,
  folderIds?: string[],
): ApiLibraryItem => ({
  id: `li-${id}`,
  book: {
    id,
    title: id,
    authors: ['A. Writer'],
    description: null,
    isbn13: null,
    pageCount: pageCount as number,
    coverUrl: null,
  },
  status,
  currentPage: 0,
  updatedAt,
  folderIds,
});

describe('profile helpers', () => {
  it('gives the same book the same generated cover', () => {
    expect(generatedCover('emma')).toEqual(generatedCover('emma'));
    expect(['frame', 'band', 'disc', 'block']).toContain(generatedCover('emma').motif);
  });

  it('maps the reader, with no genres and their visibility', () => {
    const me = {
      displayName: 'Eleanor Whitmore',
      username: 'eleanorreads',
      createdAt: '2026-03-01T10:00:00Z',
      profileVisibility: 'private',
    } as ApiMe;
    expect(toProfileUser(me)).toEqual({
      name: 'Eleanor Whitmore',
      initials: 'EW',
      handle: 'eleanorreads',
      memberSince: '2026-03-01',
      bio: undefined,
      genres: [],
      privacy: 'private',
    });
    expect(toProfileUser({ ...me, profileVisibility: 'public' }, 'Hi').bio).toBe('Hi');
  });

  it('sizes spines by page count within bounds', () => {
    const [thin, thick, unknown] = shelfFrom([
      item('thin', 'finished', 50, '2026-11-03T00:00:00Z'),
      item('thick', 'finished', 2000, '2026-11-02T00:00:00Z'),
      item('unknown', 'finished', null, '2026-11-01T00:00:00Z'),
    ]);
    expect(thin!.width).toBe(22);
    expect(thick!.width).toBe(48);
    expect(unknown!.width).toBeGreaterThan(22);
    expect(thin!.height).toBeGreaterThanOrEqual(156);
    expect(thin!.height).toBeLessThanOrEqual(198);
  });

  it('lists the most recently touched books and folder previews', () => {
    const library = [
      item('a', 'not-started', 100, '2026-11-01T00:00:00Z', ['f1']),
      item('b', 'in-progress', 100, '2026-11-05T00:00:00Z', ['f1']),
      item('c', 'finished', 100, '2026-11-03T00:00:00Z'),
    ];
    expect(recentlyAddedFrom(library, 2).map((b) => b.id)).toEqual(['b', 'c']);
    expect(foldersFrom([{ id: 'f1', name: 'Mine', count: 9 }], library)).toEqual([
      expect.objectContaining({
        bookCount: 2,
        previewBooks: [expect.objectContaining({ id: 'b' }), expect.objectContaining({ id: 'a' })],
      }),
    ]);
  });
});
