// @req F-AUTH-01
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  accessToken: vi.fn<() => Promise<string | null>>(),
  configured: vi.fn<() => boolean>(),
}));

vi.mock('@/services/auth', () => ({
  authProvider: { accessToken: auth.accessToken },
  isAuthConfigured: auth.configured,
}));

import * as api from '../api';
import type {
  ApiBook,
  ApiBookClub,
  ApiBookClubDetail,
  ApiChallengeGroup,
  ApiChallengeGroupDetail,
  ApiLibraryItem,
  ApiRound,
} from '../api';

type FetchMock = ReturnType<typeof vi.fn<typeof fetch>>;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

let fetchMock: FetchMock;

function respondWith(response: Response) {
  fetchMock.mockResolvedValue(response);
}

function lastCall(): { url: string; init: RequestInit; headers: Headers } {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]!;
  return { url: url as string, init: init!, headers: new Headers(init!.headers) };
}

beforeEach(() => {
  fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);
  auth.configured.mockReturnValue(false);
  auth.accessToken.mockResolvedValue(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  api.setUnauthorizedHandler(() => {});
});

describe('apiFetch (via getMe)', () => {
  it('sends Accept JSON and the bearer token when auth is configured', async () => {
    auth.configured.mockReturnValue(true);
    auth.accessToken.mockResolvedValue('tok-123');
    respondWith(jsonResponse({ id: 'u1' }));

    await expect(api.getMe()).resolves.toEqual({ id: 'u1' });

    const { url, headers, init } = lastCall();
    expect(url).toBe('/api/me');
    expect(headers.get('Accept')).toBe('application/json');
    expect(headers.get('Authorization')).toBe('Bearer tok-123');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('omits Authorization when auth is configured but there is no session', async () => {
    auth.configured.mockReturnValue(true);
    respondWith(jsonResponse({}));
    await api.getMe();
    expect(lastCall().headers.has('Authorization')).toBe(false);
  });

  it('does not ask for a token when auth is not configured', async () => {
    respondWith(jsonResponse({}));
    await api.getMe();
    expect(auth.accessToken).not.toHaveBeenCalled();
    expect(lastCall().headers.has('Authorization')).toBe(false);
  });

  it('calls the unauthorized handler on 401 and throws an ApiError with the server code', async () => {
    const handler = vi.fn<() => void>();
    api.setUnauthorizedHandler(handler);
    respondWith(jsonResponse({ error: 'Profile needed', code: 'PROFILE_REQUIRED' }, 401));

    const error = await api.getMe().catch((e: unknown) => e);
    expect(handler).toHaveBeenCalledOnce();
    expect(error).toBeInstanceOf(api.ApiError);
    expect(error).toMatchObject({
      name: 'ApiError',
      message: 'Profile needed',
      status: 401,
      code: 'PROFILE_REQUIRED',
    });
  });

  it('keeps the fallback message when the error body is not JSON', async () => {
    respondWith(new Response('boom', { status: 500 }));
    await expect(api.getMe()).rejects.toMatchObject({
      message: 'Failed to load your profile: HTTP 500',
      status: 500,
      code: undefined,
    });
  });

  it('keeps the fallback message when the JSON error body has no error field', async () => {
    respondWith(jsonResponse({}, 404));
    await expect(api.getMe()).rejects.toThrow('Failed to load your profile: HTTP 404');
  });

  it('propagates network errors', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(api.getMe()).rejects.toThrow('Failed to fetch');
  });
});

describe('profile endpoints', () => {
  it('createMe posts the payload as JSON', async () => {
    respondWith(jsonResponse({ id: 'u1' }, 201));
    const payload = { username: 'ana', displayName: 'Ana', timezone: 'Europe/Lisbon' };
    await expect(api.createMe(payload)).resolves.toEqual({ id: 'u1' });
    const { url, init, headers } = lastCall();
    expect(url).toBe('/api/me');
    expect(init.method).toBe('POST');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual(payload);
  });

  it('isUsernameAvailable encodes the name and is true only for available: true', async () => {
    respondWith(jsonResponse({ available: true }));
    await expect(api.isUsernameAvailable('a b')).resolves.toBe(true);
    expect(lastCall().url).toBe('/api/usernames/a%20b/availability');

    respondWith(jsonResponse({ available: 'yes' }));
    await expect(api.isUsernameAvailable('x')).resolves.toBe(false);
  });
});

describe('getHealth', () => {
  it('returns the status string', async () => {
    respondWith(jsonResponse({ status: 'ok' }));
    await expect(api.getHealth()).resolves.toBe('ok');
    expect(lastCall().url).toBe('/api/health');
  });

  it('throws on non-2xx', async () => {
    respondWith(jsonResponse({}, 503));
    await expect(api.getHealth()).rejects.toThrow('HTTP 503');
  });

  it.each([[null], [{}], [{ status: 1 }], ['ok']])('rejects an invalid body %j', async (body) => {
    respondWith(jsonResponse(body));
    await expect(api.getHealth()).rejects.toThrow('Invalid health response');
  });
});

interface Endpoint {
  name: string;
  call: () => Promise<unknown>;
  method: string;
  url: string;
  body?: unknown;
  /** How a 500 with `{ error: 'nope' }` is reported. */
  error: string;
}

const endpoints: Endpoint[] = [
  {
    name: 'getUserLibrary',
    call: () => api.getUserLibrary(),
    method: 'GET',
    url: '/api/me/library',
    error: 'Failed to load user library: HTTP 500',
  },
  {
    name: 'getUserLibrary filtered',
    call: () => api.getUserLibrary('in-progress'),
    method: 'GET',
    url: '/api/me/library?status=in-progress',
    error: 'Failed to load user library: HTTP 500',
  },
  {
    name: 'getLibraryFolders',
    call: () => api.getLibraryFolders(),
    method: 'GET',
    url: '/api/me/library/folders',
    error: 'nope',
  },
  {
    name: 'createLibraryFolder',
    call: () => api.createLibraryFolder('Faves'),
    method: 'POST',
    url: '/api/me/library/folders',
    body: { name: 'Faves' },
    error: 'nope',
  },
  {
    name: 'renameLibraryFolder',
    call: () => api.renameLibraryFolder('f/1', 'New'),
    method: 'PATCH',
    url: '/api/me/library/folders/f%2F1',
    body: { name: 'New' },
    error: 'nope',
  },
  {
    name: 'deleteLibraryFolder',
    call: () => api.deleteLibraryFolder('f1'),
    method: 'DELETE',
    url: '/api/me/library/folders/f1',
    error: 'nope',
  },
  {
    name: 'addBookToFolder',
    call: () => api.addBookToFolder('f1', 'b1'),
    method: 'PUT',
    url: '/api/me/library/folders/f1/books/b1',
    error: 'nope',
  },
  {
    name: 'removeBookFromFolder',
    call: () => api.removeBookFromFolder('f1', 'b1'),
    method: 'DELETE',
    url: '/api/me/library/folders/f1/books/b1',
    error: 'nope',
  },
  {
    name: 'getLibraryTags',
    call: () => api.getLibraryTags(),
    method: 'GET',
    url: '/api/me/library/tags',
    error: 'nope',
  },
  {
    name: 'tagBook',
    call: () => api.tagBook('b1', 'cozy'),
    method: 'POST',
    url: '/api/me/library/books/b1/tags',
    body: { name: 'cozy' },
    error: 'nope',
  },
  {
    name: 'untagBook',
    call: () => api.untagBook('b1', 't1'),
    method: 'DELETE',
    url: '/api/me/library/books/b1/tags/t1',
    error: 'nope',
  },
  {
    name: 'getBook',
    call: () => api.getBook('b 1'),
    method: 'GET',
    url: '/api/book/b%201',
    error: 'Failed to load book: HTTP 500',
  },
  {
    name: 'updateReadingStatus',
    call: () => api.updateReadingStatus({ bookId: 'b1', status: 'finished' }),
    method: 'PUT',
    url: '/api/reading-status',
    body: { bookId: 'b1', status: 'finished', currentPage: 0 },
    error: 'nope',
  },
  {
    name: 'updateReadingStatus with dates',
    call: () =>
      api.updateReadingStatus({
        bookId: 'b1',
        status: 'finished',
        startedOn: '2026-11-01',
        finishedOn: null,
      }),
    method: 'PUT',
    url: '/api/reading-status',
    body: {
      bookId: 'b1',
      status: 'finished',
      currentPage: 0,
      startedOn: '2026-11-01',
      finishedOn: null,
    },
    error: 'nope',
  },
  {
    name: 'removeFromLibrary',
    call: () => api.removeFromLibrary('b 1'),
    method: 'DELETE',
    url: '/api/me/library/b%201',
    error: 'nope',
  },
  {
    name: 'updateReadingStatus with page',
    call: () => api.updateReadingStatus({ bookId: 'b1', status: 'in-progress', currentPage: 12 }),
    method: 'PUT',
    url: '/api/reading-status',
    body: { bookId: 'b1', status: 'in-progress', currentPage: 12 },
    error: 'nope',
  },
  {
    name: 'startReadingSession',
    call: () => api.startReadingSession('b1'),
    method: 'POST',
    url: '/api/reading-sessions',
    body: { bookId: 'b1' },
    error: 'nope',
  },
  {
    name: 'finishReadingSession',
    call: () => api.finishReadingSession('s1'),
    method: 'PATCH',
    url: '/api/reading-sessions/s1/finish',
    error: 'nope',
  },
  {
    name: 'getReadingStats',
    call: () => api.getReadingStats(),
    method: 'GET',
    url: '/api/me/reading-stats',
    error: 'Failed to load reading stats: HTTP 500',
  },
  {
    name: 'cancelReadingSession',
    call: () => api.cancelReadingSession('s1'),
    method: 'DELETE',
    url: '/api/reading-sessions/s1',
    error: 'nope',
  },
  {
    name: 'createChallengeGroup',
    call: () =>
      api.createChallengeGroup({
        name: 'G',
        startDate: '2026-11-01',
        durationDays: 30,
        winMetric: 'minutes',
      }),
    method: 'POST',
    url: '/api/groups/challenges',
    body: { name: 'G', startDate: '2026-11-01', durationDays: 30, winMetric: 'minutes' },
    error: 'nope',
  },
  {
    name: 'getChallengeGroup',
    call: () => api.getChallengeGroup('g1'),
    method: 'GET',
    url: '/api/groups/challenges/g1',
    error: 'Failed to load group: HTTP 500',
  },
  {
    name: 'getUserGroups',
    call: () => api.getUserGroups(),
    method: 'GET',
    url: '/api/me/groups',
    error: 'Failed to load groups: HTTP 500',
  },
  {
    name: 'getGroupMessages',
    call: () => api.getGroupMessages('g1'),
    method: 'GET',
    url: '/api/groups/g1/messages',
    error: 'nope',
  },
  {
    name: 'getGroupMessages with cursor',
    call: () => api.getGroupMessages('g1', { after: 3, before: 9 }),
    method: 'GET',
    url: '/api/groups/g1/messages?after=3&before=9',
    error: 'nope',
  },
  {
    name: 'sendGroupMessage',
    call: () => api.sendGroupMessage('g1', { clientId: 'c1', body: 'hi' }),
    method: 'POST',
    url: '/api/groups/g1/messages',
    body: { clientId: 'c1', body: 'hi' },
    error: 'nope',
  },
  {
    name: 'deleteGroupMessage',
    call: () => api.deleteGroupMessage('g1', 'm1'),
    method: 'DELETE',
    url: '/api/groups/g1/messages/m1',
    error: 'nope',
  },
  {
    name: 'getExplore',
    call: () => api.getExplore(),
    method: 'GET',
    url: '/api/explore',
    error: 'nope',
  },
  {
    name: 'addBook',
    call: () => api.addBook({ title: 'T' }),
    method: 'POST',
    url: '/api/book',
    body: { title: 'T' },
    error: 'nope',
  },
  {
    name: 'addToLibrary',
    call: () => api.addToLibrary('b1'),
    method: 'PUT',
    url: '/api/library/b1',
    body: { status: 'not-started' },
    error: 'nope',
  },
  {
    name: 'saveReview',
    call: () => api.saveReview('b1', { rating: 4, comment: 'ok' }),
    method: 'PUT',
    url: '/api/book/b1/review',
    body: { rating: 4, comment: 'ok' },
    error: 'nope',
  },
  {
    name: 'deleteReview',
    call: () => api.deleteReview('b1'),
    method: 'DELETE',
    url: '/api/book/b1/review',
    error: 'nope',
  },
  {
    name: 'getBookReviews',
    call: () => api.getBookReviews('b1'),
    method: 'GET',
    url: '/api/book/b1/reviews',
    error: 'nope',
  },
  {
    name: 'getUserReviews',
    call: () => api.getUserReviews('u1'),
    method: 'GET',
    url: '/api/users/u1/reviews',
    error: 'nope',
  },
  {
    name: 'getUserProfile',
    call: () => api.getUserProfile('  @ana '),
    method: 'GET',
    url: '/api/users/ana',
    error: 'nope',
  },
  {
    name: 'searchUsers',
    call: () => api.searchUsers('@ana b'),
    method: 'GET',
    url: '/api/users?q=ana%20b',
    error: 'nope',
  },
  {
    name: 'sendFriendRequest',
    call: () => api.sendFriendRequest('u2'),
    method: 'POST',
    url: '/api/friend-requests',
    body: { targetUserId: 'u2' },
    error: 'nope',
  },
  {
    name: 'getFriendRequests',
    call: () => api.getFriendRequests(),
    method: 'GET',
    url: '/api/me/friend-requests',
    error: 'nope',
  },
  {
    name: 'acceptFriendRequest',
    call: () => api.acceptFriendRequest('r1'),
    method: 'POST',
    url: '/api/friend-requests/r1/accept',
    body: {},
    error: 'nope',
  },
  {
    name: 'declineFriendRequest',
    call: () => api.declineFriendRequest('r1'),
    method: 'POST',
    url: '/api/friend-requests/r1/decline',
    body: {},
    error: 'nope',
  },
  {
    name: 'removeFriend',
    call: () => api.removeFriend('u2'),
    method: 'DELETE',
    url: '/api/friends/u2',
    error: 'nope',
  },
  {
    name: 'inviteToGroup',
    call: () => api.inviteToGroup('g1', 'u2'),
    method: 'POST',
    url: '/api/groups/g1/invites',
    body: { inviteeId: 'u2' },
    error: 'nope',
  },
  {
    name: 'getPendingInvites',
    call: () => api.getPendingInvites(),
    method: 'GET',
    url: '/api/me/group-invites',
    error: 'nope',
  },
  {
    name: 'answerInvite',
    call: () => api.answerInvite('i1', 'decline'),
    method: 'POST',
    url: '/api/group-invites/i1/decline',
    body: {},
    error: 'nope',
  },
  {
    name: 'createBookClub',
    call: () => api.createBookClub({ name: 'C', bookId: 'b1', deadline: '2026-12-01' }),
    method: 'POST',
    url: '/api/groups/book-clubs',
    body: { name: 'C', bookId: 'b1', deadline: '2026-12-01' },
    error: 'nope',
  },
  {
    name: 'getBookClub',
    call: () => api.getBookClub('g1'),
    method: 'GET',
    url: '/api/groups/book-clubs/g1',
    error: 'nope',
  },
  {
    name: 'getUserBookClubs',
    call: () => api.getUserBookClubs(),
    method: 'GET',
    url: '/api/me/book-clubs',
    error: 'nope',
  },
  {
    name: 'startNextRound',
    call: () => api.startNextRound('g1', { bookId: 'b2', deadline: '2026-12-31' }),
    method: 'POST',
    url: '/api/groups/book-clubs/g1/rounds',
    body: { bookId: 'b2', deadline: '2026-12-31' },
    error: 'nope',
  },
  {
    name: 'openPoll',
    call: () => api.openPoll('g1', { closesAt: '2026-12-01T10:00:00Z', anonymous: true }),
    method: 'POST',
    url: '/api/groups/book-clubs/g1/poll',
    body: { closesAt: '2026-12-01T10:00:00Z', anonymous: true },
    error: 'nope',
  },
  {
    name: 'proposeBook',
    call: () => api.proposeBook('g1', 'b3'),
    method: 'POST',
    url: '/api/groups/book-clubs/g1/poll/proposals',
    body: { bookId: 'b3' },
    error: 'nope',
  },
  {
    name: 'voteForProposal',
    call: () => api.voteForProposal('g1', 'p1'),
    method: 'PUT',
    url: '/api/groups/book-clubs/g1/poll/vote',
    body: { proposalId: 'p1' },
    error: 'nope',
  },
];

describe.each(endpoints)('$name', ({ call, method, url, body, error }) => {
  it(`sends ${method} ${url}`, async () => {
    respondWith(jsonResponse({ ok: 1 }));
    await call();
    const { url: sentUrl, init, headers } = lastCall();
    expect(sentUrl).toBe(url);
    expect(init.method ?? 'GET').toBe(method);
    const sentBody = init.body === undefined ? undefined : JSON.parse(init.body as string);
    expect(sentBody).toEqual(body);
    expect(headers.get('Content-Type')).toBe(body === undefined ? null : 'application/json');
  });

  it('reports a failed response', async () => {
    respondWith(jsonResponse({ error: 'nope' }, 500));
    await expect(call()).rejects.toThrow(error);
  });
});

describe('response bodies', () => {
  it('returns the parsed JSON of read endpoints', async () => {
    respondWith(jsonResponse([{ id: 'f1', name: 'Faves' }]));
    await expect(api.getLibraryFolders()).resolves.toEqual([{ id: 'f1', name: 'Faves' }]);
  });

  it('resolves void for DELETE endpoints with an empty 204 body', async () => {
    respondWith(new Response(null, { status: 204 }));
    await expect(api.deleteLibraryFolder('f1')).resolves.toBeUndefined();
    respondWith(new Response(null, { status: 204 }));
    await expect(api.cancelReadingSession('s1')).resolves.toBeUndefined();
    respondWith(new Response(null, { status: 204 }));
    await expect(api.deleteGroupMessage('g1', 'm1')).resolves.toBeUndefined();
  });

  it('uses the HTTP fallback for reading-session errors without a JSON body', async () => {
    respondWith(new Response('oops', { status: 409 }));
    await expect(api.startReadingSession('b1')).rejects.toThrow(
      'Failed to start session: HTTP 409',
    );
    respondWith(jsonResponse({}, 409));
    await expect(api.finishReadingSession('s1')).rejects.toThrow(
      'Failed to finish session: HTTP 409',
    );
  });

  it('ensureOk-based endpoints throw ApiError with the status', async () => {
    respondWith(jsonResponse({ error: 'Private profile' }, 403));
    await expect(api.getUserReviews('u1')).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
      message: 'Private profile',
    });
  });

  it('searchUsers returns [] without calling the API for a blank query', async () => {
    await expect(api.searchUsers('  @ ')).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('getFriends maps friends to group members', async () => {
    respondWith(jsonResponse([{ userId: 'u2', displayName: 'Ana Lima', username: 'ana' }]));
    await expect(api.getFriends()).resolves.toEqual([
      { id: 'u2', name: 'Ana Lima', initials: 'AL', handle: 'ana' },
    ]);
    expect(lastCall().url).toBe('/api/me/friends');
  });
});

describe('apiEndpoint', () => {
  it('resolves the API base against the page origin', () => {
    expect(api.apiEndpoint()).toEqual({ origin: window.location.origin, path: '/api' });
  });
});

describe('library mappers', () => {
  const austen = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01';
  const item = (overrides: Partial<ApiLibraryItem> = {}): ApiLibraryItem => ({
    id: 'li1',
    book: {
      id: austen,
      title: 'Emma',
      authors: ['Jane Austen'],
      description: null,
      isbn13: null,
      pageCount: 200,
      coverUrl: 'c.png',
    },
    status: 'in-progress',
    currentPage: 50,
    updatedAt: '2026-11-01T00:00:00Z',
    ...overrides,
  });

  it('maps an in-progress book with its authors and progress', () => {
    expect(api.mapApiLibraryItemToBook(item({ folderIds: ['f1'], tagIds: ['t1'] }))).toEqual({
      id: austen,
      title: 'Emma',
      author: 'Jane Austen',
      cover: 'c.png',
      detailCover: 'c.png',
      status: 'in-progress',
      pages: 200,
      currentPage: 50,
      summary: '50 / 200 pages • 25% complete',
      folderIds: ['f1'],
      tagIds: ['t1'],
      chip: 'Reading',
      updatedAt: '2026-11-01T00:00:00Z',
      inLibrary: true,
      startedOn: null,
      finishedOn: null,
    });
  });

  it.each([
    ['not-started', 'Ready when you are', 'To read'],
    ['finished', 'Finished • 1 pages', 'Finished'],
    ['dnf', 'Stopped at page 0', 'DNF'],
  ] as const)('maps status %s', (status, summary, chip) => {
    const book = api.mapApiLibraryItemToBook(
      item({
        status: status as ApiLibraryItem['status'],
        currentPage: 0,
        book: {
          id: 'x',
          title: 'X',
          authors: [],
          description: null,
          isbn13: null,
          pageCount: 0,
          coverUrl: null,
        },
      }),
    );
    expect(book).toMatchObject({
      summary,
      chip,
      author: '',
      pages: 1,
      cover: '',
      detailCover: undefined,
      folderIds: [],
      tagIds: [],
    });
  });

  it('mapApiBookToLibraryBook defaults to not started and uses createdAt', () => {
    const book = api.mapApiBookToLibraryBook({
      id: 'x',
      title: 'X',
      authors: [],
      description: null,
      isbn13: null,
      pageCount: 10,
      coverUrl: null,
      createdAt: '2026-01-01T00:00:00Z',
    });
    expect(book).toMatchObject({
      status: 'not-started',
      currentPage: 0,
      updatedAt: '2026-01-01T00:00:00Z',
    });
    const noDate = api.mapApiBookToLibraryBook(
      {
        id: 'x',
        title: 'X',
        authors: [],
        description: null,
        isbn13: null,
        pageCount: 10,
        coverUrl: null,
      },
      'in-progress',
      5,
    );
    expect(noDate.currentPage).toBe(5);
    expect(Date.parse(noDate.updatedAt!)).not.toBeNaN();
  });

  it('maps no invented genre, rating or placeholder image', () => {
    const book = api.mapApiLibraryItemToBook(item({ status: 'finished' }));
    expect(book.genre).toBeUndefined();
    expect(book.summary).not.toContain('★');
  });

  it('authorLine joins the authors and is empty without any', () => {
    expect(api.authorLine(['Terry Pratchett', 'Neil Gaiman'])).toBe('Terry Pratchett, Neil Gaiman');
    expect(api.authorLine([])).toBe('');
    expect(api.authorLine(undefined)).toBe('');
  });
});

describe('challenge mappers', () => {
  const group = (overrides: Partial<ApiChallengeGroup> = {}): ApiChallengeGroup => ({
    id: 'g1',
    name: 'November sprint',
    description: '',
    adminId: 'u1',
    status: 'active',
    challenge: {
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      winMetric: 'minutes',
      metricGoal: 0,
    },
    members: [{ userId: 'u1', role: 'admin', joinedAt: '' }],
    createdAt: '',
    ...overrides,
  });
  const now = new Date('2026-11-20T12:00:00Z');

  it('summarises an active challenge', () => {
    expect(api.mapApiGroupToSummary(group(), now)).toMatchObject({
      id: 'g1',
      kind: 'challenge',
      status: 'active',
      headline: 'minutes challenge',
      progress: 63,
      detail: '11 days left',
      memberCount: 1,
    });
    expect(api.mapApiGroupToSummary(group(), now).meta).toContain('counted minutes · 1 member');
  });

  it('summarises scheduled and completed challenges', () => {
    const scheduled = api.mapApiGroupToSummary(group({ status: 'scheduled' }), now);
    expect(scheduled).toMatchObject({
      headline: 'Starts soon',
      progress: 0,
      detail: 'Starts 2026-11-01',
    });
    const done = api.mapApiGroupToSummary(
      group({
        status: 'completed',
        members: [
          { userId: 'u1', role: 'admin', joinedAt: '' },
          { userId: 'u2', role: 'member', joinedAt: '' },
        ],
      }),
      now,
    );
    expect(done).toMatchObject({ progress: 100, detail: 'Results are frozen' });
    expect(done.meta).toContain('2 members');
    const lastDay = api.mapApiGroupToSummary(group(), new Date('2026-11-30T00:00:00Z'));
    expect(lastDay.detail).toBe('1 day left');
  });

  const detail = (overrides: Partial<ApiChallengeGroupDetail> = {}): ApiChallengeGroupDetail => ({
    ...group(),
    standings: [
      {
        userId: 'u1',
        displayName: 'Ana Lima',
        username: 'ana',
        role: 'admin',
        score: 90,
        books: [{ bookId: 'b1', title: 'Emma', minutes: 90 }],
      },
      { userId: 'u2', displayName: 'Bo', username: 'bo', role: 'member', score: 90, books: [] },
      { userId: 'u3', displayName: 'Cy', username: 'cy', role: 'member', score: 10, books: [] },
    ],
    ...overrides,
  });

  it('ranks ties together and shows my standing', () => {
    const page = api.mapApiGroupToChallengeDetail(detail(), 'u3', now);
    expect(page.leaderboard.map((e) => [e.rank, e.score, e.note])).toEqual([
      [1, '90 min', 'Admin'],
      [1, '90 min', 'Member'],
      [2, '10 min', 'Member'],
    ]);
    expect(page.leaderboard[0]!.books).toEqual([{ title: 'Emma', score: '90 min' }]);
    expect(page.members[0]).toEqual({ id: 'u1', name: 'Ana Lima', initials: 'AL', handle: 'ana' });
    expect(page).toMatchObject({
      tagline: 'Any book counts. Make time for the page.',
      metric: { label: 'Minutes', note: 'Completed session time only' },
      standing: { label: '#2 · 10 min', note: 'Counted from finished reading sessions' },
      remaining: { label: '11 days', note: 'Active' },
      period: { note: '30 days · ends 2026-11-30' },
    });
  });

  it('shows placeholders for untracked metrics and non-members', () => {
    const page = api.mapApiGroupToChallengeDetail(
      detail({
        description: 'Read pages',
        status: 'scheduled',
        challenge: {
          startDate: '2026-11-01',
          endDate: '2026-11-30',
          winMetric: 'pages',
          metricGoal: 0,
        },
        standings: [
          {
            userId: 'u1',
            displayName: 'Ana',
            username: 'ana',
            role: 'admin',
            score: null,
            books: [],
          },
        ],
      }),
      'stranger',
      now,
    );
    expect(page).toMatchObject({
      tagline: 'Read pages',
      metric: { label: 'Pages', note: 'Scores for this metric are coming soon' },
      standing: { label: '—', note: 'Not tracked yet' },
      remaining: { label: 'Not started', note: 'Scheduled' },
    });
    expect(page.leaderboard[0]!.score).toBe('—');

    const done = api.mapApiGroupToChallengeDetail(detail({ status: 'completed' }), 'u1', now);
    expect(done.remaining.note).toBe('Completed · results frozen');
  });
});

describe('book club mappers', () => {
  const austen = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01';
  const round = (overrides: Partial<ApiRound> = {}): ApiRound => ({
    id: 'r2',
    number: 2,
    startDate: '2026-11-01',
    deadline: '2026-11-30',
    outcome: 'active',
    finished: 1,
    expected: 2,
    daysLeft: 5,
    book: {
      id: austen,
      title: 'Emma',
      authors: ['Jane Austen'],
      pageCount: 300,
      coverUrl: 'e.png',
    },
    ...overrides,
  });
  const club = (overrides: Partial<ApiBookClub> = {}): ApiBookClub => ({
    id: 'c1',
    name: 'Austen club',
    description: '',
    adminId: 'u1',
    members: [
      { userId: 'u1', role: 'admin', joinedAt: '' },
      { userId: 'u2', role: 'member', joinedAt: '' },
    ],
    round: round(),
    createdAt: '',
    ...overrides,
  });

  it('summarises an active round', () => {
    expect(api.mapApiClubToSummary(club())).toEqual({
      id: 'c1',
      name: 'Austen club',
      kind: 'book-club',
      status: 'active',
      headline: '1 of 2 finished',
      progress: 50,
      detail: 'Reading Emma · 5 days left',
      meta: 'Deadline 30 November 2026 · Every member must finish',
      memberInitials: [],
      memberCount: 2,
      book: { title: 'Emma', author: 'Jane Austen', cover: 'e.png' },
    });
  });

  it('summarises finished rounds, a missing book and a single day', () => {
    const done = api.mapApiClubToSummary(
      club({ round: round({ outcome: 'not-completed', book: null, expected: 0, finished: 0 }) }),
    );
    expect(done).toMatchObject({
      status: 'completed',
      headline: '0 of 2 finished',
      progress: 0,
      detail: 'Round 2 not completed · the club book',
      book: undefined,
    });
    const noMembers = api.mapApiClubToSummary(
      club({ members: [], round: round({ expected: 0, finished: 0 }) }),
    );
    expect(noMembers.progress).toBe(0);
    const oneDay = api.mapApiClubToSummary(
      club({
        round: round({
          daysLeft: 1,
          book: { id: 'x', title: 'X', authors: [], pageCount: null, coverUrl: null },
        }),
      }),
    );
    expect(oneDay.detail).toBe('Reading X · 1 day left');
    expect(oneDay.book).toEqual({ title: 'X', author: '', cover: '' });
  });

  const detail = (overrides: Partial<ApiBookClubDetail> = {}): ApiBookClubDetail => ({
    ...club(),
    standings: [
      {
        userId: 'u1',
        displayName: 'Ana Lima',
        username: 'ana',
        role: 'admin',
        minutes: 120,
        currentPage: 300,
        percent: 100,
        finished: true,
      },
      {
        userId: 'u2',
        displayName: 'Bo',
        username: 'bo',
        role: 'member',
        minutes: 30,
        currentPage: 75,
        percent: 25,
        finished: false,
      },
    ],
    history: [
      round({
        id: 'r1',
        number: 1,
        outcome: 'completed',
        startDate: '2026-10-01',
        deadline: '2026-10-31',
        finished: 2,
      }),
      round({ id: 'r0', number: 0, outcome: 'not-completed', book: null }),
      round(),
    ],
    poll: {
      id: 'p',
      status: 'open',
      closesAt: new Date(2026, 11, 3, 9, 5).toISOString(),
      anonymous: false,
      proposals: [
        {
          id: 'pp1',
          bookId: 'b9',
          title: 'Persuasion',
          authors: ['Jane Austen'],
          proposedBy: { userId: 'u2', displayName: 'Bo' },
          votes: 1,
        },
        {
          id: 'pp2',
          bookId: austen,
          title: 'Emma',
          authors: ['Jane Austen'],
          proposedBy: null,
          votes: 0,
        },
      ],
      yourVote: 'pp1',
      voted: 1,
      total: 2,
    },
    ...overrides,
  });

  it('builds the club page for the admin', () => {
    const page = api.mapApiClubToDetail(detail(), 'u1');
    expect(page).toMatchObject({
      id: 'c1',
      title: 'Austen club',
      subtitle: 'Round 2: Emma by Jane Austen.',
      round: {
        label: 'Round 2 · Active',
        book: { id: austen, title: 'Emma', author: 'Jane Austen', pages: 300, cover: 'e.png' },
      },
      finished: { count: 1, total: 2 },
      deadline: '30 November 2026',
      daysLeft: '5 days to turn the last page',
      yourProgress: { page: 300, pages: 300 },
      adminName: 'Ana Lima',
      isAdmin: true,
      roundOver: false,
      voting: {
        status: 'open',
        closes: '3 December at 09:05',
        options: [
          { id: 'pp1', title: 'Persuasion', author: 'Proposed by Bo', votes: 1 },
          { id: 'pp2', title: 'Emma', author: 'Jane Austen', votes: 0 },
        ],
        yourVote: 'pp1',
        voted: 1,
        total: 2,
        anonymous: false,
      },
    });
    expect(page.leaderboard.map((e) => [e.rank, e.score, e.note, e.progress, e.finished])).toEqual([
      [1, '120 min', 'Finished', 100, true],
      [2, '30 min', '25% · In progress', 25, false],
    ]);
    expect(page.history).toEqual([
      {
        label: 'Round 0 · Not completed',
        summary: 'Unknown book · 1 of 2 finished',
        note: '1 November 2026 to 30 November 2026',
      },
      {
        label: 'Round 1 · Completed',
        summary: 'Emma · 2 of 2 finished',
        note: '1 October 2026 to 31 October 2026',
      },
    ]);
  });

  it('builds the page for a member, without a book, poll or admin standing', () => {
    const page = api.mapApiClubToDetail(
      detail({
        adminId: 'gone',
        round: round({ outcome: 'completed', book: null, daysLeft: 1 }),
        poll: null,
        history: [],
      }),
      'u2',
    );
    expect(page).toMatchObject({
      subtitle: '',
      round: {
        label: 'Round 2 · Completed',
        book: { id: '', title: 'Unknown book', author: '', pages: 0, cover: '' },
      },
      daysLeft: 'Round completed',
      yourProgress: { page: 75, pages: 0 },
      voting: null,
      adminName: 'The admin',
      isAdmin: false,
      roundOver: true,
      history: [],
    });
  });

  it('uses the description, a book without known author and a one-day countdown', () => {
    expect(api.mapApiClubToDetail(detail({ description: 'Our club' }), 'nobody')).toMatchObject({
      subtitle: 'Our club',
      yourProgress: { page: 0, pages: 300 },
    });
    const page = api.mapApiClubToDetail(
      detail({
        round: round({
          daysLeft: 1,
          book: { id: 'x', title: 'X', authors: [], pageCount: null, coverUrl: null },
        }),
      }),
      'u2',
    );
    expect(page.subtitle).toBe('Round 2: X.');
    expect(page.daysLeft).toBe('1 day to turn the last page');
  });
});

describe('mock-to-real helpers', () => {
  const book = (overrides: Partial<ApiBook> = {}): ApiBook => ({
    id: 'emma',
    title: 'Emma',
    authors: ['Jane Austen'],
    description: 'A comedy of manners.',
    isbn13: '9780141439587',
    pageCount: 474,
    coverUrl: null,
    ...overrides,
  });
  const club = (overrides: Partial<ApiBookClub['round']> = {}): ApiBookClub => ({
    id: 'classics',
    name: 'Classics',
    description: '',
    adminId: 'u1',
    members: [
      { userId: 'u1', role: 'admin', joinedAt: '2026-11-01T00:00:00Z' },
      { userId: 'u2', role: 'member', joinedAt: '2026-11-01T00:00:00Z' },
    ],
    round: {
      id: 'r1',
      number: 2,
      startDate: '2026-11-01',
      deadline: '2026-11-30',
      outcome: 'active',
      finished: 0,
      expected: 2,
      daysLeft: 13,
      book: { id: 'emma', title: 'Emma', authors: [], pageCount: 474, coverUrl: null },
      ...overrides,
    },
    createdAt: '2026-11-01T00:00:00Z',
  });
  const challenge = (status: ApiChallengeGroup['status']): ApiChallengeGroup => ({
    id: `c-${status}`,
    name: `Challenge ${status}`,
    description: '',
    adminId: 'u1',
    status,
    challenge: {
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      winMetric: 'minutes',
      metricGoal: 0,
    },
    members: [],
    createdAt: '2026-11-01T00:00:00Z',
  });

  it('getActiveReadingSession returns null when no session runs (204)', async () => {
    respondWith(new Response(null, { status: 204 }));
    await expect(api.getActiveReadingSession()).resolves.toBeNull();
    expect(lastCall().url).toBe('/api/me/reading-sessions/active');
  });

  it('getActiveReadingSession returns the running session', async () => {
    respondWith(jsonResponse({ id: 's1', bookId: 'emma', elapsedSeconds: 60 }));
    await expect(api.getActiveReadingSession()).resolves.toMatchObject({ id: 's1' });
  });

  it('getActiveReadingSession rejects with the server error', async () => {
    respondWith(jsonResponse({ error: 'boom' }, 500));
    await expect(api.getActiveReadingSession()).rejects.toThrow('boom');
  });

  it('getFriendRequests returns each request with its requester', async () => {
    respondWith(
      jsonResponse([{ id: 'fr1', requester: { displayName: 'Sofia Chen', username: 'sofia' } }]),
    );
    const [request] = await api.getFriendRequests();
    expect(request?.requester?.displayName).toBe('Sofia Chen');
    expect(lastCall().url).toBe('/api/me/friend-requests');
  });

  it('mapApiBookToDetail uses the catalogue fields and the club reading the book', () => {
    expect(api.mapApiBookToDetail(book(), [club()])).toEqual({
      tagline: 'Jane Austen',
      synopsis: 'A comedy of manners.',
      edition: { isbn: '9780141439587' },
      club: {
        groupId: 'classics',
        name: 'Classics',
        roundLabel: 'Round 2',
        memberCount: 2,
        deadlineLabel: expect.stringContaining('November'),
      },
    });
  });

  it('mapApiBookToDetail leaves out what the catalogue does not have', () => {
    const detail = api.mapApiBookToDetail(book({ authors: [], description: null, isbn13: null }), [
      club({ outcome: 'completed' }),
      club({ book: null }),
    ]);
    expect(detail).toEqual({ tagline: '', synopsis: '', edition: { isbn: null }, club: undefined });
  });

  it('sessionGroupsFor keeps active challenges and the clubs reading this book', () => {
    const groups = api.sessionGroupsFor(
      'emma',
      [challenge('active'), challenge('scheduled'), challenge('completed')],
      [
        club(),
        {
          ...club({
            book: { id: 'dune', title: 'Dune', authors: [], pageCount: 1, coverUrl: null },
          }),
          id: 'scifi',
        },
      ],
    );
    expect(groups.map((g) => g.id)).toEqual(['c-active', 'classics']);
    expect(groups[0]!.note).toContain('minutes');
    expect(groups[1]!.note).toContain('round book');
  });
});
