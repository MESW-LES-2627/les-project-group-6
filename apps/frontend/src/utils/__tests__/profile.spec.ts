// @req F-PROF-01 F-GRP-04
import { describe, expect, it } from 'vitest';

import type { ApiChallengeGroupDetail, ApiLibraryItem, ApiMe } from '@/services/api';
import {
  foldersFrom,
  generatedCover,
  recentlyAddedFrom,
  shelfFrom,
  toProfileUser,
  wonChallenge,
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

describe('wonChallenge', () => {
  const group = (
    status: ApiChallengeGroupDetail['status'],
    scores: Record<string, number | null>,
  ): ApiChallengeGroupDetail =>
    ({
      id: 'g1',
      status,
      standings: Object.entries(scores).map(([userId, score]) => ({
        userId,
        displayName: userId,
        username: userId,
        role: 'member',
        score,
        books: [],
      })),
    }) as unknown as ApiChallengeGroupDetail;

  it('is true for the top scorer of a finished challenge', () => {
    expect(wonChallenge(group('completed', { me: 40, ana: 30 }), 'me')).toBe(true);
    expect(wonChallenge(group('completed', { me: 20, ana: 30 }), 'me')).toBe(false);
  });

  it('counts a tie on the top score as a win for both', () => {
    const tied = group('completed', { me: 40, ana: 40, bo: 10 });
    expect(wonChallenge(tied, 'me')).toBe(true);
    expect(wonChallenge(tied, 'ana')).toBe(true);
    expect(wonChallenge(tied, 'bo')).toBe(false);
  });

  it('is false while the challenge runs or when nobody read', () => {
    expect(wonChallenge(group('active', { me: 40 }), 'me')).toBe(false);
    expect(wonChallenge(group('completed', { me: 0, ana: null }), 'me')).toBe(false);
  });
});
