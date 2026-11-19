// @req F-HOME-01 F-READ-04
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import router from '@/router';
import type {
  ApiBookClub,
  ApiChallengeGroup,
  ApiChallengeGroupDetail,
  ApiExplore,
  ApiStreak,
  ApiIncomingRequest,
  ApiLibraryItem,
  ApiPendingInvite,
  ApiReadingSession,
} from '@/services/api';
import { TEST_ME } from '@/stores/__tests__/fake-session';
import HomeView from '../HomeView.vue';

vi.mock('@/stores/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/stores/session')>();
  const { readySession } = await import('@/stores/__tests__/fake-session');
  const session = readySession(actual.createSession);
  await session.ensure();
  return { ...actual, session };
});

const api = vi.hoisted(() => ({
  getUserLibrary: vi.fn<() => Promise<ApiLibraryItem[]>>(),
  getActiveReadingSession: vi.fn<() => Promise<ApiReadingSession | null>>(),
  getUserBookClubs: vi.fn<() => Promise<ApiBookClub[]>>(),
  getUserGroups: vi.fn<() => Promise<ApiChallengeGroup[]>>(),
  getChallengeGroup: vi.fn<(id: string) => Promise<ApiChallengeGroupDetail>>(),
  getFriendRequests: vi.fn<() => Promise<ApiIncomingRequest[]>>(),
  getPendingInvites: vi.fn<() => Promise<ApiPendingInvite[]>>(),
  acceptFriendRequest: vi.fn<(id: string) => Promise<unknown>>(),
  declineFriendRequest: vi.fn<(id: string) => Promise<void>>(),
  answerInvite: vi.fn<(id: string, answer: 'accept' | 'decline') => Promise<unknown>>(),
  getExplore: vi.fn<() => Promise<ApiExplore>>(),
  getStreak: vi.fn<() => Promise<ApiStreak>>(),
}));
vi.mock('@/services/api', async (original) => ({
  ...(await original<typeof import('@/services/api')>()),
  ...api,
}));

const libraryItem = (
  id: string,
  title: string,
  updatedAt: string,
  status: ApiLibraryItem['status'] = 'in-progress',
): ApiLibraryItem => ({
  id: `li-${id}`,
  book: {
    id,
    title,
    authors: ['Jane Austen'],
    description: null,
    isbn13: null,
    pageCount: 474,
    coverUrl: null,
  },
  status,
  currentPage: 294,
  updatedAt,
});

const EMMA = libraryItem('emma', 'Emma', '2026-11-16T10:00:00Z');
const PERSUASION = libraryItem('persuasion', 'Persuasion', '2026-11-10T10:00:00Z');

const SPRINT: ApiChallengeGroupDetail = {
  id: 'sprint',
  name: 'November Sprint',
  description: '',
  adminId: TEST_ME.id,
  status: 'active',
  challenge: {
    startDate: '2026-11-01',
    endDate: '2099-11-30',
    winMetric: 'minutes',
    metricGoal: 0,
  },
  members: [
    { userId: TEST_ME.id, role: 'admin', joinedAt: '2026-11-01T00:00:00Z' },
    { userId: 'maya', role: 'member', joinedAt: '2026-11-01T00:00:00Z' },
  ],
  createdAt: '2026-11-01T00:00:00Z',
  standings: [
    { userId: 'maya', displayName: 'Maya', username: 'maya', role: 'member', score: 90, books: [] },
    {
      userId: TEST_ME.id,
      displayName: TEST_ME.displayName,
      username: TEST_ME.username,
      role: 'admin',
      score: 60,
      books: [],
    },
  ],
};

const CLASSICS: ApiBookClub = {
  id: 'classics',
  name: 'Classics',
  description: '',
  adminId: 'maya',
  members: [],
  round: {
    id: 'r1',
    number: 1,
    startDate: '2026-11-01',
    deadline: '2026-11-30',
    outcome: 'active',
    finished: 1,
    expected: 4,
    daysLeft: 13,
    book: { id: 'emma', title: 'Emma', authors: ['Jane Austen'], pageCount: 474, coverUrl: null },
  },
  createdAt: '2026-11-01T00:00:00Z',
};

const REQUEST: ApiIncomingRequest = {
  id: 'fr1',
  requesterId: 'sofia',
  addresseeId: TEST_ME.id,
  status: 'pending',
  createdAt: '2026-11-16T00:00:00Z',
  respondedAt: null,
  requester: { displayName: 'Sofia Chen', username: 'sofiachen' },
};

const INVITE: ApiPendingInvite = {
  id: 'inv1',
  groupId: 'shelf',
  inviteeId: TEST_ME.id,
  inviterId: 'maya',
  status: 'pending',
  createdAt: '2026-11-16T00:00:00Z',
  groupName: 'The Sunday Shelf',
  groupKind: 'book-club',
  inviterName: 'Maya Laurent',
};

async function mountView() {
  const wrapper = mount(HomeView, { global: { plugins: [router] } });
  await flushPromises();
  return wrapper;
}

const STREAK: ApiStreak = {
  current: 3,
  longest: 9,
  readToday: true,
  lastReadDate: '2026-11-19',
  streakType: 'daily',
  freezesLeft: 1,
  days: [
    '2026-11-11',
    '2026-11-12',
    '2026-11-13',
    '2026-11-14',
    '2026-11-15',
    '2026-11-16',
    '2026-11-17',
    '2026-11-18',
    '2026-11-19',
  ].map((date) => ({ date, read: date >= '2026-11-17' })),
};

beforeEach(() => {
  api.getStreak.mockResolvedValue(STREAK);
  api.getUserLibrary.mockResolvedValue([PERSUASION, EMMA]);
  api.getActiveReadingSession.mockResolvedValue(null);
  api.getUserBookClubs.mockResolvedValue([CLASSICS]);
  api.getUserGroups.mockResolvedValue([SPRINT, { ...SPRINT, id: 'old', status: 'completed' }]);
  api.getChallengeGroup.mockResolvedValue(SPRINT);
  api.getFriendRequests.mockResolvedValue([REQUEST]);
  api.getPendingInvites.mockResolvedValue([INVITE]);
  api.acceptFriendRequest.mockResolvedValue({});
  api.declineFriendRequest.mockResolvedValue(undefined);
  api.answerInvite.mockResolvedValue({});
  api.getExplore.mockResolvedValue({
    mostReadThisWeek: [],
    trending: [
      { book: { ...EMMA.book, id: 'circe', title: 'Circe' }, readers: 4 },
      { book: { ...EMMA.book, id: 'piranesi', title: 'Piranesi' }, readers: 1 },
    ],
    suggestions: [],
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('HomeView', () => {
  it('greets the signed-in reader by first name', async () => {
    const wrapper = await mountView();

    expect(wrapper.get('h1').text()).toMatch(/^Good (morning|afternoon|evening), Eleanor\.$/);
  });

  it('puts the latest book in progress on the bedside, with its club', async () => {
    const wrapper = await mountView();

    expect(wrapper.get('#bedside-title').text()).toBe('Emma');
    expect(wrapper.get('.bedside-author').text()).toBe('Jane Austen · reading with Classics');
    expect(wrapper.text()).toContain('Page 294 of 474 · 62%');
    expect(wrapper.get('.bedside-actions .button').text()).toContain('Start session');
  });

  it('puts the running session book on the bedside and offers to resume it', async () => {
    api.getActiveReadingSession.mockResolvedValue({
      id: 's1',
      userId: TEST_ME.id,
      bookId: 'persuasion',
      startedAt: '2026-11-17T09:00:00Z',
      endedAt: null,
      elapsedSeconds: 60,
      countedMinutes: 0,
    });
    const wrapper = await mountView();

    expect(wrapper.get('#bedside-title').text()).toBe('Persuasion');
    expect(wrapper.get('.bedside-actions .button').text()).toContain('Resume session');
    expect(wrapper.get('.bedside-actions .button').attributes('href')).toBe('/session/persuasion');
  });

  it('invites a new reader with an empty library to explore books', async () => {
    api.getUserLibrary.mockResolvedValue([]);
    const wrapper = await mountView();

    expect(wrapper.get('#bedside-title').text()).toBe('Nothing on your bedside yet');
    expect(wrapper.text()).toContain('Your library is empty.');
    expect(wrapper.get('.bedside-actions .button').attributes('href')).toBe('/explore');
  });

  it('shows an error on the bedside when the library cannot be loaded', async () => {
    api.getUserLibrary.mockRejectedValue(new Error('offline'));
    const wrapper = await mountView();

    expect(wrapper.get('.bedside [role="alert"]').text()).toContain(
      'We could not load your reading',
    );
  });

  it('lists the active challenges with the reader rank and the active book clubs', async () => {
    const wrapper = await mountView();

    expect(api.getChallengeGroup).toHaveBeenCalledTimes(1);
    expect(api.getChallengeGroup).toHaveBeenCalledWith('sprint');
    const groups = wrapper.get('.group-list').text();
    expect(groups).toContain('November Sprint');
    expect(wrapper.get('.rank-tile').text()).toBe('#2of 2');
    expect(groups).toContain('Challenge · 60 min');
    expect(groups).toContain('Classics · Emma');
    expect(groups).toContain('Book club · 1 of 4 finished');
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'));
    expect(hrefs).toContain('/groups/sprint');
    expect(hrefs).toContain('/groups/classics');
  });

  it('says when the reader has no active group', async () => {
    api.getUserGroups.mockResolvedValue([]);
    api.getUserBookClubs.mockResolvedValue([]);
    const wrapper = await mountView();

    expect(wrapper.text()).toContain('No active challenges or book clubs.');
  });

  it('accepts a friend request through the API and removes it', async () => {
    const wrapper = await mountView();
    const button = (label: string) => wrapper.findAll('button').find((b) => b.text() === label)!;

    expect(wrapper.text()).toContain('Sofia Chen wants to be friends');
    await button('Accept').trigger('click');
    await flushPromises();

    expect(api.acceptFriendRequest).toHaveBeenCalledWith('fr1');
    expect(wrapper.get('[role="status"]').text()).toBe('You and Sofia Chen are now friends.');
    expect(wrapper.text()).not.toContain('wants to be friends');
  });

  it('declines a friend request and keeps the group invitation', async () => {
    const wrapper = await mountView();
    const declines = () => wrapper.findAll('button').filter((b) => b.text() === 'Decline');
    expect(declines()).toHaveLength(2);

    await declines()[0]!.trigger('click');
    await flushPromises();

    expect(api.declineFriendRequest).toHaveBeenCalledWith('fr1');
    expect(wrapper.get('[role="status"]').text()).toBe("You declined Sofia Chen's request.");
    expect(declines()).toHaveLength(1);
    expect(wrapper.text()).toContain('The Sunday Shelf · Book club · invited by Maya Laurent');
  });

  it('accepts a group invite, reloads the groups and hides the section when all are answered', async () => {
    const wrapper = await mountView();
    const button = (label: string) => wrapper.findAll('button').filter((b) => b.text() === label);

    await button('Accept')[1]!.trigger('click');
    await flushPromises();
    expect(api.answerInvite).toHaveBeenCalledWith('inv1', 'accept');
    expect(api.getUserGroups).toHaveBeenCalledTimes(2);
    expect(wrapper.get('[role="status"]').text()).toBe('You joined The Sunday Shelf.');

    await button('Decline')[0]!.trigger('click');
    await flushPromises();
    expect(wrapper.text()).not.toContain('Waiting for you');
  });

  it('shows the error when answering fails and keeps the request', async () => {
    api.acceptFriendRequest.mockRejectedValue(new Error('Request no longer pending'));
    const wrapper = await mountView();

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Accept')!
      .trigger('click');
    await flushPromises();

    expect(wrapper.get('[role="status"]').text()).toBe('Request no longer pending');
    expect(wrapper.text()).toContain('Sofia Chen wants to be friends');
  });

  it('shows what is trending this week from the explore API', async () => {
    const wrapper = await mountView();

    const trending = wrapper.get('.trending').text();
    expect(trending).toContain('Circe');
    expect(trending).toContain('4 readers this week');
    expect(trending).toContain('1 reader this week');
  });

  it('keeps the goals from the mock until their feature exists', async () => {
    const wrapper = await mountView();

    expect(wrapper.text()).toContain('18 of 24 books');
  });
});

describe('HomeView streak', () => {
  it('shows the streak and the last seven days from the API', async () => {
    const wrapper = await mountView();

    expect(wrapper.get('.streak-line').text()).toBe('3 days in a row');
    expect(wrapper.text()).toContain('1 freeze left');
    const days = wrapper.findAll('.week-day');
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.classes('read'))).toEqual([
      false,
      false,
      false,
      false,
      true,
      true,
      true,
    ]);
  });

  it('shows an error only in the streak section when it cannot be loaded', async () => {
    api.getStreak.mockRejectedValue(new Error('offline'));
    const wrapper = await mountView();

    expect(wrapper.text()).toContain('We could not load your streak.');
    expect(wrapper.find('.streak-line').exists()).toBe(false);
    expect(wrapper.text()).toContain('Circe');
  });
});
