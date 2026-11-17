// @req F-GRP-01
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import router from '@/router';
import type {
  ApiBookClub,
  ApiChallengeGroup,
  ApiGroupInvite,
  ApiPendingInvite,
} from '@/services/api';

const getPendingInvites = vi.hoisted(() => vi.fn<() => Promise<ApiPendingInvite[]>>());
const answerInvite = vi.hoisted(() =>
  vi.fn<(inviteId: string, answer: 'accept' | 'decline') => Promise<ApiGroupInvite>>(),
);
const getUserBookClubs = vi.hoisted(() => vi.fn<() => Promise<ApiBookClub[]>>());
const getUserGroups = vi.hoisted(() => vi.fn<() => Promise<ApiChallengeGroup[]>>());

vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  getPendingInvites,
  answerInvite,
  getUserBookClubs,
  getUserGroups,
}));

const club: ApiBookClub = {
  id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01',
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
    finished: 0,
    expected: 3,
    daysLeft: 30,
    book: { id: 'emma', title: 'Emma', authors: [], pageCount: 474, coverUrl: null },
  },
  createdAt: '2026-11-04T10:00:00Z',
};

const invite: ApiPendingInvite = {
  id: 'i1',
  groupId: club.id,
  inviteeId: 'me',
  inviterId: 'maya',
  status: 'pending',
  createdAt: '2026-11-04T10:00:00Z',
  groupName: 'Sunday Classics',
  groupKind: 'book-club',
  inviterName: 'Maya Laurent',
};
const challenge: ApiChallengeGroup = {
  id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a07',
  name: 'Winter Minutes',
  description: '',
  adminId: 'me',
  status: 'active',
  challenge: {
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    winMetric: 'minutes',
    metricGoal: 0,
  },
  members: [
    { userId: 'me', role: 'admin', joinedAt: '2026-11-01T10:00:00Z' },
    { userId: 'maya', role: 'member', joinedAt: '2026-11-01T10:00:00Z' },
  ],
  createdAt: '2026-11-01T10:00:00Z',
};
import GroupsView from '../GroupsView.vue';

function mountView() {
  return mount(GroupsView, { global: { plugins: [router] } });
}

async function mountLoaded() {
  const wrapper = mountView();
  await flushPromises();
  return wrapper;
}

/** Challenges and clubs in every status: 2 active, 1 coming up, 2 completed. */
function useGroups() {
  getUserGroups.mockResolvedValue([
    challenge,
    { ...challenge, id: 'scheduled-1', name: 'Spring Pages', status: 'scheduled' },
    { ...challenge, id: 'completed-1', name: 'October Sprint', status: 'completed' },
  ]);
  getUserBookClubs.mockResolvedValue([
    club,
    {
      ...club,
      id: 'completed-club',
      name: 'Classics',
      round: { ...club.round, outcome: 'completed' },
    },
  ]);
  getPendingInvites.mockResolvedValue([]);
}

describe('GroupsView', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('shows the plate and the reader groups from the API by status', async () => {
    useGroups();
    const wrapper = await mountLoaded();

    expect(wrapper.get('h1').text()).toBe('Groups');
    expect(wrapper.findAll('article')).toHaveLength(5);
    const sections = wrapper.findAll('.group-section h2').map((h) => h.text());
    expect(sections).toEqual(['Active', 'Coming up', 'Completed']);
    expect(wrapper.text()).toContain('2 active');
  });

  it('shows no mock groups or invitation', async () => {
    getUserGroups.mockResolvedValue([]);
    getUserBookClubs.mockResolvedValue([]);
    getPendingInvites.mockResolvedValue([]);
    const wrapper = await mountLoaded();

    expect(wrapper.findAll('article')).toHaveLength(0);
    expect(wrapper.find('.invites').exists()).toBe(false);
    expect(wrapper.text()).toContain('No groups here yet.');
  });

  it('shows an error instead of groups when the API cannot be reached', async () => {
    getUserGroups.mockRejectedValue(new Error('offline'));
    getUserBookClubs.mockResolvedValue([]);
    getPendingInvites.mockResolvedValue([]);
    const wrapper = await mountLoaded();

    expect(wrapper.findAll('article')).toHaveLength(0);
    expect(wrapper.get('[role="alert"]').text()).toBe(
      'We could not load your groups. Please refresh the page.',
    );
  });

  it('filters by kind', async () => {
    useGroups();
    const wrapper = await mountLoaded();
    const tab = (label: string) =>
      wrapper.findAll('.page-tab').find((b) => b.text().startsWith(label))!;

    await tab('Challenges').trigger('click');
    expect(wrapper.findAll('article')).toHaveLength(3);
    expect(tab('Challenges').attributes('aria-pressed')).toBe('true');

    await tab('Book clubs').trigger('click');
    expect(wrapper.findAll('article')).toHaveLength(2);
    expect(wrapper.text()).not.toContain('Winter Minutes');
  });

  it('links to the create page and to each group', async () => {
    useGroups();
    const wrapper = await mountLoaded();
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'));

    expect(hrefs).toContain('/groups/new');
    expect(hrefs).toContain(`/groups/${challenge.id}`);
    expect(hrefs).toContain(`/groups/${club.id}`);
  });

  it('accepts a real invite and lists the joined book club', async () => {
    getUserGroups.mockResolvedValue([]);
    getUserBookClubs.mockResolvedValueOnce([]).mockResolvedValueOnce([club]);
    getPendingInvites.mockResolvedValue([invite]);
    answerInvite.mockResolvedValue({} as ApiGroupInvite);
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.text()).toContain('Maya Laurent invited you to a book club');
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Accept')!
      .trigger('click');
    await flushPromises();

    expect(answerInvite).toHaveBeenCalledWith('i1', 'accept');
    expect(wrapper.text()).not.toContain('Maya Laurent invited you to a book club');
    expect(wrapper.get('[role="status"]').text()).toBe('You joined Sunday Classics.');
    expect(wrapper.findAll('article')).toHaveLength(1);
    expect(wrapper.text()).toContain('0 of 3 finished');
  });

  it('lists the reader challenges from the API', async () => {
    getUserGroups.mockResolvedValue([challenge]);
    getUserBookClubs.mockResolvedValue([]);
    getPendingInvites.mockResolvedValue([]);
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.findAll('article')).toHaveLength(1);
    expect(wrapper.findAll('article')[0]!.text()).toContain('Winter Minutes');
    expect(wrapper.text()).toContain('1 active');
  });

  it('declines a real invite without loading the groups again', async () => {
    getUserGroups.mockResolvedValue([]);
    getUserBookClubs.mockResolvedValue([]);
    getPendingInvites.mockResolvedValue([invite]);
    answerInvite.mockResolvedValue({} as ApiGroupInvite);
    const wrapper = mountView();
    await flushPromises();

    await wrapper
      .findAll('.invite')[0]!
      .findAll('button')
      .find((b) => b.text() === 'Decline')!
      .trigger('click');
    await flushPromises();

    expect(answerInvite).toHaveBeenCalledWith('i1', 'decline');
    expect(getUserBookClubs).toHaveBeenCalledOnce();
    expect(wrapper.text()).not.toContain('Maya Laurent invited you to a book club');
    expect(wrapper.get('[role="status"]').text()).toBe('You declined Sunday Classics.');
  });

  it('keeps the invite and shows the error when answering fails', async () => {
    getUserGroups.mockResolvedValue([]);
    getUserBookClubs.mockResolvedValue([]);
    getPendingInvites.mockResolvedValue([invite]);
    answerInvite.mockRejectedValue(new Error('Invite expired'));
    const wrapper = mountView();
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Accept')!
      .trigger('click');
    await flushPromises();

    expect(wrapper.get('[role="status"]').text()).toBe('Invite expired');
    expect(wrapper.text()).toContain('Maya Laurent invited you to a book club');
  });
});
