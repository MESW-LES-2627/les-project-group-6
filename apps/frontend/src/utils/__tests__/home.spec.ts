// @req F-HOME-01
import { describe, expect, it } from 'vitest';

import type { ApiBookClub, ApiLibraryItem } from '@/services/api';
import {
  firstNameOf,
  greetingFor,
  isLibraryEmpty,
  pickBedside,
  toClubSummary,
  toFriendRequest,
  toInvitation,
} from '../home';

const item = (id: string, status: ApiLibraryItem['status'], updatedAt: string): ApiLibraryItem => ({
  id: `li-${id}`,
  book: {
    id,
    title: id,
    authors: [],
    description: null,
    isbn13: null,
    pageCount: 0,
    coverUrl: null,
  },
  status,
  currentPage: 3,
  updatedAt,
});

const club = (bookId: string | null, outcome: ApiBookClub['round']['outcome'] = 'active') =>
  ({
    id: 'c1',
    name: 'Classics',
    description: '',
    adminId: 'u1',
    members: [{ userId: 'u1', role: 'admin', joinedAt: '' }],
    round: {
      id: 'r1',
      number: 1,
      startDate: '2026-11-01',
      deadline: '2026-11-30',
      outcome,
      finished: 0,
      expected: 0,
      daysLeft: 1,
      book: bookId
        ? { id: bookId, title: 'Emma', authors: [], pageCount: 1, coverUrl: 'e.png' }
        : null,
    },
    createdAt: '',
  }) satisfies ApiBookClub;

describe('home helpers', () => {
  it('greets by the time of day', () => {
    expect(greetingFor(new Date(2026, 10, 17, 8))).toBe('Good morning');
    expect(greetingFor(new Date(2026, 10, 17, 14))).toBe('Good afternoon');
    expect(greetingFor(new Date(2026, 10, 17, 21))).toBe('Good evening');
  });

  it('takes the first name, and nothing without a name', () => {
    expect(firstNameOf('  Eleanor Whitmore ')).toBe('Eleanor');
    expect(firstNameOf(undefined)).toBe('');
  });

  it('picks the latest in-progress book, ignoring other statuses', () => {
    const library = [
      item('old', 'in-progress', '2026-11-01T00:00:00Z'),
      item('new', 'in-progress', '2026-11-10T00:00:00Z'),
      item('done', 'finished', '2026-11-15T00:00:00Z'),
    ];
    const bedside = pickBedside(library, null, []);
    expect(bedside).toMatchObject({ id: 'new', club: null, sessionRunning: false, pages: 1 });
  });

  it('prefers the running session book, even when it is not in progress', () => {
    const library = [
      item('reading', 'in-progress', '2026-11-10T00:00:00Z'),
      item('session', 'not-started', '2026-11-01T00:00:00Z'),
    ];
    const active = { bookId: 'session' } as Parameters<typeof pickBedside>[1];
    expect(pickBedside(library, active, [club('session')])).toMatchObject({
      id: 'session',
      club: 'Classics',
      sessionRunning: true,
    });
  });

  it('has no bedside book without books in progress', () => {
    expect(pickBedside([item('done', 'finished', '')], null, [])).toBeNull();
    expect(isLibraryEmpty([])).toBe(true);
  });

  it('summarises a club, counting members when the round expects nobody yet', () => {
    expect(toClubSummary(club('emma'))).toMatchObject({
      bookTitle: 'Emma',
      cover: 'e.png',
      total: 1,
    });
    expect(toClubSummary(club(null))).toMatchObject({ bookTitle: 'the club book', cover: '' });
  });

  it('names who sent a request and what an invite is for', () => {
    expect(toFriendRequest({ id: 'f', requester: null } as never).name).toBe('A reader');
    expect(
      toInvitation({
        id: 'i',
        groupName: 'Sprint',
        groupKind: 'challenge',
        inviterName: 'Maya',
      } as never),
    ).toEqual({ id: 'i', title: 'Sprint', detail: 'Challenge · invited by Maya' });
  });
});
