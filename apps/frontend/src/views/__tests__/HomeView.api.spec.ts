import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import router from '@/router';
import type {
  ApiBookClub,
  ApiChallengeGroup,
  ApiChallengeGroupDetail,
  ApiCircleComment,
  ApiFriendReading,
  ApiFriendRequest,
  ApiGroupInvite,
  ApiLibraryItem,
  ApiPendingInvite,
  ApiReadingSession,
} from '@/services/api';

const getUserLibrary = vi.hoisted(() => vi.fn<() => Promise<ApiLibraryItem[]>>());
const getActiveReadingSession = vi.hoisted(() => vi.fn<() => Promise<ApiReadingSession | null>>());
const getUserGroups = vi.hoisted(() => vi.fn<() => Promise<ApiChallengeGroup[]>>());
const getChallengeGroup = vi.hoisted(() =>
  vi.fn<(id: string) => Promise<ApiChallengeGroupDetail>>(),
);
const getUserBookClubs = vi.hoisted(() => vi.fn<() => Promise<ApiBookClub[]>>());
const getFriendRequests = vi.hoisted(() => vi.fn<() => Promise<ApiFriendRequest[]>>());
const getPendingInvites = vi.hoisted(() => vi.fn<() => Promise<ApiPendingInvite[]>>());
const getFriendsReading = vi.hoisted(() => vi.fn<() => Promise<ApiFriendReading[]>>());
const getCircleComments = vi.hoisted(() => vi.fn<() => Promise<ApiCircleComment[]>>());
const answerFriendRequest = vi.hoisted(() =>
  vi.fn<(id: string, answer: 'accept' | 'decline') => Promise<void>>(),
);
const answerInvite = vi.hoisted(() =>
  vi.fn<(id: string, answer: 'accept' | 'decline') => Promise<ApiGroupInvite>>(),
);

vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  getUserLibrary,
  getActiveReadingSession,
  getUserGroups,
  getChallengeGroup,
  getUserBookClubs,
  getFriendRequests,
  getPendingInvites,
  getFriendsReading,
  getCircleComments,
  answerFriendRequest,
  answerInvite,
}));

vi.mock('@/stores/session', () => ({
  isSignedIn: { value: true },
  session: { state: { me: { id: 'me', displayName: 'Eleanor Reader' } } },
  currentUserId: () => 'me',
}));

import HomeView from '../HomeView.vue';

const dune: ApiLibraryItem = {
  id: 'li-dune',
  book: {
    id: 'dune',
    title: 'Dune',
    description: null,
    isbn13: null,
    pageCount: 500,
    coverUrl: null,
  },
  status: 'in-progress',
  currentPage: 120,
  updatedAt: '2026-11-12T10:00:00Z',
};

const emma: ApiLibraryItem = {
  id: 'li-emma',
  book: {
    id: 'emma',
    title: 'Emma',
    description: null,
    isbn13: null,
    pageCount: 474,
    coverUrl: null,
  },
  status: 'in-progress',
  currentPage: 200,
  updatedAt: '2026-11-10T10:00:00Z',
};

const runningSession: ApiReadingSession = {
  id: 's1',
  userId: 'me',
  bookId: 'dune',
  startedAt: '2026-11-13T09:00:00Z',
  endedAt: null,
  elapsedSeconds: 600,
  countedMinutes: 10,
};

const group: ApiChallengeGroup = {
  id: 'g1',
  name: 'October Sprint',
  description: '',
  adminId: 'maya',
  status: 'active',
  challenge: {
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    winMetric: 'minutes',
    metricGoal: 0,
  },
  members: [
    { userId: 'maya', role: 'admin', joinedAt: '2026-11-01T10:00:00Z' },
    { userId: 'me', role: 'member', joinedAt: '2026-11-01T10:00:00Z' },
  ],
  createdAt: '2026-11-01T10:00:00Z',
};

const groupDetail: ApiChallengeGroupDetail = {
  ...group,
  standings: [
    {
      userId: 'maya',
      displayName: 'Maya Laurent',
      username: 'maya',
      role: 'admin',
      score: 480,
      books: [],
    },
    {
      userId: 'me',
      displayName: 'Eleanor Reader',
      username: 'eleanor',
      role: 'member',
      score: 420,
      books: [],
    },
  ],
};

const club: ApiBookClub = {
  id: 'c1',
  name: 'Sunday Classics',
  description: '',
  adminId: 'maya',
  members: [],
  round: {
    id: 'r1',
    number: 1,
    startDate: '2026-11-04',
    deadline: '2026-12-04',
    outcome: 'active',
    finished: 1,
    expected: 3,
    daysLeft: 21,
    book: { id: 'emma', title: 'Emma', pageCount: 474, coverUrl: null },
  },
  createdAt: '2026-11-04T10:00:00Z',
};

const friendRequest: ApiFriendRequest = {
  id: 'f1',
  requesterId: 'sofia',
  addresseeId: 'me',
  createdAt: '2026-11-12T10:00:00Z',
};

const invite: ApiPendingInvite = {
  id: 'i1',
  groupId: club.id,
  inviteeId: 'me',
  inviterId: 'maya',
  status: 'pending',
  createdAt: '2026-11-12T10:00:00Z',
  groupName: 'Sunday Classics',
  groupKind: 'book-club',
  inviterName: 'Maya Laurent',
};

const friendReading: ApiFriendReading = {
  userId: 'maya',
  displayName: 'Maya Laurent',
  username: 'maya',
  book: { id: 'emma', title: 'Emma', coverUrl: null, pageCount: 474 },
  currentPage: 40,
  readingNow: true,
};

const circleComment: ApiCircleComment = {
  id: 'msg1',
  groupId: 'g1',
  groupName: 'October Sprint',
  authorId: 'maya',
  authorName: 'Maya Laurent',
  body: 'Chapter 4 is wild',
  createdAt: new Date().toISOString(),
};

function mountView() {
  return mount(HomeView, { global: { plugins: [router] } });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => (resolve = res));
  return { promise, resolve };
}

describe('HomeView with the API', () => {
  beforeEach(() => {
    getUserLibrary.mockResolvedValue([]);
    getActiveReadingSession.mockResolvedValue(null);
    getUserGroups.mockResolvedValue([]);
    getChallengeGroup.mockResolvedValue(groupDetail);
    getUserBookClubs.mockResolvedValue([]);
    getFriendRequests.mockResolvedValue([]);
    getPendingInvites.mockResolvedValue([]);
    getFriendsReading.mockResolvedValue([]);
    getCircleComments.mockResolvedValue([]);
    answerFriendRequest.mockResolvedValue();
    answerInvite.mockResolvedValue({} as ApiGroupInvite);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows the book in progress and resumes the running session', async () => {
    getUserLibrary.mockResolvedValue([dune]);
    getActiveReadingSession.mockResolvedValue(runningSession);
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.get('#bedside-title').text()).toBe('Dune');
    expect(wrapper.text()).toContain('Page 120 of 500 · 24%');
    expect(wrapper.get('.bedside-actions .button').text()).toContain('Resume session');
    expect(wrapper.get('.bedside-actions .button').attributes('href')).toBe('/session/dune');
    expect(wrapper.text()).toContain('Session in progress · 10 min counted');
  });

  it('offers to start a session when no timer is running', async () => {
    getUserLibrary.mockResolvedValue([dune]);
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.get('.bedside-actions .button').text()).toContain('Start session');
  });

  it('lists the most recently updated book first and the rest under also in progress', async () => {
    getUserLibrary.mockResolvedValue([emma, dune]);
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.get('#bedside-title').text()).toBe('Dune');
    expect(wrapper.text()).toContain('Also in progress');
    expect(wrapper.get('.reading-title').text()).toBe('Emma');
    expect(wrapper.get('.reading-list .button').attributes('href')).toBe('/session/emma');
  });

  it('shows the active challenge with my rank and the days left', async () => {
    getUserGroups.mockResolvedValue([group]);
    getChallengeGroup.mockResolvedValue(groupDetail);
    getUserBookClubs.mockResolvedValue([club]);
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.get('.rank-tile').text()).toContain('#2');
    expect(wrapper.get('.rank-tile').text()).toContain('of 2');
    expect(wrapper.text()).toContain('October Sprint');
    expect(wrapper.text()).toContain('days left');
    expect(wrapper.text()).toContain('420 min');
    expect(wrapper.text()).toContain('Sunday Classics');
  });

  it('answers both invites and removes the accepted group invite', async () => {
    getFriendRequests.mockResolvedValue([friendRequest]);
    getPendingInvites.mockResolvedValue([invite]);
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.text()).toContain('A reader');
    expect(wrapper.text()).toContain('Sunday Classics');
    expect(wrapper.text()).toContain('invited by Maya Laurent');

    const groupRow = wrapper
      .findAll('.requests > div')
      .find((row) => row.text().includes('Sunday Classics'))!;
    await groupRow
      .findAll('button')
      .find((button) => button.text() === 'Accept')!
      .trigger('click');
    await flushPromises();

    expect(answerInvite).toHaveBeenCalledWith('i1', 'accept');
    expect(wrapper.text()).not.toContain('invited by Maya Laurent');
    expect(wrapper.get('[role="status"]').text()).toBe('You joined Sunday Classics.');
    expect(getUserBookClubs).toHaveBeenCalledTimes(2);

    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Accept')!
      .trigger('click');
    await flushPromises();

    expect(answerFriendRequest).toHaveBeenCalledWith('f1', 'accept');
    expect(wrapper.text()).toContain('No pending invites.');
  });

  it('shows the books friends read and the group comments', async () => {
    getFriendsReading.mockResolvedValue([friendReading]);
    getCircleComments.mockResolvedValue([circleComment]);
    const wrapper = mountView();
    await flushPromises();

    const reading = wrapper.get('.reading-now li');
    expect(reading.text()).toContain('Maya Laurent');
    expect(reading.text()).toContain('Emma');
    expect(reading.get('.now-dot').attributes('aria-label')).toBe('Reading right now');

    const comment = wrapper.get('.activity li');
    expect(comment.text()).toContain('Maya Laurent · October Sprint');
    expect(comment.text()).toContain('“Chapter 4 is wild”');
    expect(comment.get('a').attributes('href')).toBe('/groups/g1');
  });

  it('invites a new reader to add a first book and keeps empty sections tidy', async () => {
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.text()).toContain('Your library is empty');
    expect(wrapper.text()).toContain('Add your first book or explore books');
    expect(wrapper.text()).toContain('No active challenges or book clubs yet.');
    expect(wrapper.text()).toContain('No pending invites.');
    expect(wrapper.text()).toContain('None of your friends are reading a book right now.');
    expect(wrapper.text()).toContain('No comments in your groups yet.');
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);

    const hrefs = wrapper.findAll('a').map((link) => link.attributes('href'));
    expect(hrefs).toContain('/explore');
    expect(hrefs).toContain('/library');
  });

  it('shows skeleton placeholders while each section loads', async () => {
    const library = deferred<ApiLibraryItem[]>();
    const groups = deferred<ApiChallengeGroup[]>();
    const invites = deferred<ApiPendingInvite[]>();
    const friends = deferred<ApiFriendReading[]>();
    const circle = deferred<ApiCircleComment[]>();
    getUserLibrary.mockReturnValueOnce(library.promise);
    getUserGroups.mockReturnValueOnce(groups.promise);
    getPendingInvites.mockReturnValueOnce(invites.promise);
    getFriendsReading.mockReturnValueOnce(friends.promise);
    getCircleComments.mockReturnValueOnce(circle.promise);

    const wrapper = mountView();

    expect(wrapper.findAll('.skeleton').length).toBeGreaterThan(0);
    expect(wrapper.text()).toContain('Loading your reading…');
    expect(wrapper.text()).toContain('Loading your groups…');
    expect(wrapper.text()).toContain('Loading your invites…');
    expect(wrapper.text()).toContain('Looking for your friends…');
    expect(wrapper.text()).toContain('Loading comments from your groups…');
    expect(wrapper.text()).not.toContain('Your library is empty');
    expect(wrapper.text()).not.toContain('No pending invites.');

    library.resolve([]);
    groups.resolve([]);
    invites.resolve([]);
    friends.resolve([]);
    circle.resolve([]);
    await flushPromises();

    expect(wrapper.findAll('.skeleton')).toHaveLength(0);
    expect(wrapper.text()).toContain('Your library is empty');
    expect(wrapper.text()).toContain('No pending invites.');
  });

  it('shows an error only in the failing section', async () => {
    getUserLibrary.mockResolvedValue([dune]);
    getUserGroups.mockRejectedValue(new Error('offline'));
    getPendingInvites.mockRejectedValue(new Error('offline'));
    getCircleComments.mockRejectedValue(new Error('offline'));
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.get('#bedside-title').text()).toBe('Dune');
    expect(wrapper.text()).toContain('We could not load your groups.');
    expect(wrapper.text()).toContain('We could not load your invites.');
    expect(wrapper.text()).toContain('We could not load your circle.');
    expect(wrapper.text()).not.toContain('We could not load your reading.');
    expect(wrapper.text()).not.toContain('what your friends are reading');
  });
});
