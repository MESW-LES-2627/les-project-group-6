// @req F-GRP-03 F-GRP-07 F-GRP-08 F-GRP-02
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import router from '@/router';
import {
  type ApiBookClubDetail,
  type ApiChallengeGroupDetail,
  type ApiChatMessage,
  type ApiPoll,
} from '@/services/api';
import { TEST_ME } from '@/stores/__tests__/fake-session';
import type { GroupMember } from '@/types/groups';
import GroupDetailView from '../GroupDetailView.vue';

/** The signed-in reader of these tests. */
const DEMO_USER_ID = TEST_ME.id;

vi.mock('@/stores/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/stores/session')>();
  const { readySession } = await import('@/stores/__tests__/fake-session');
  const session = readySession(actual.createSession);
  await session.ensure();
  return { ...actual, session };
});

const getChallengeGroup = vi.hoisted(() =>
  vi.fn<(groupId: string) => Promise<ApiChallengeGroupDetail>>(),
);

const getBookClub = vi.hoisted(() => vi.fn<(groupId: string) => Promise<ApiBookClubDetail>>());
const getFriends = vi.hoisted(() => vi.fn<() => Promise<GroupMember[]>>());
const getGroupInvites = vi.hoisted(() => vi.fn<() => Promise<unknown[]>>());
const getGroupMessages = vi.hoisted(() => vi.fn<(groupId: string) => Promise<ApiChatMessage[]>>());
const voteForProposal = vi.hoisted(() =>
  vi.fn<(groupId: string, proposalId: string) => Promise<ApiPoll>>(),
);
const sendGroupMessage = vi.hoisted(() =>
  vi.fn<
    (groupId: string, payload: { clientId: string; body: string }) => Promise<ApiChatMessage>
  >(),
);

vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  getChallengeGroup,
  getBookClub,
  getFriends,
  getGroupInvites,
  getGroupMessages,
  voteForProposal,
  sendGroupMessage,
}));

// The live chat would open a socket; the page tests only need it to exist.
vi.mock('@/services/chat-socket', () => ({ connectChatSocket: () => ({ close: () => {} }) }));

const MAYA = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01';
const EMMA = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01';

const apiClub: ApiBookClubDetail = {
  id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380c09',
  name: 'Sunday Classics',
  description: '',
  adminId: MAYA,
  members: [
    { userId: MAYA, role: 'admin', joinedAt: '2026-11-01T10:00:00Z' },
    { userId: DEMO_USER_ID, role: 'member', joinedAt: '2026-11-02T10:00:00Z' },
  ],
  round: {
    id: 'r2',
    number: 2,
    startDate: '2026-11-01',
    deadline: '2026-11-30',
    outcome: 'active',
    finished: 1,
    expected: 2,
    daysLeft: 26,
    book: { id: EMMA, title: 'Emma', authors: [], pageCount: 474, coverUrl: null },
  },
  createdAt: '2026-10-01T10:00:00Z',
  standings: [
    {
      userId: MAYA,
      displayName: 'Maya Laurent',
      username: 'mayareads',
      role: 'admin',
      minutes: 50,
      currentPage: 474,
      percent: 100,
      finished: true,
    },
    {
      userId: DEMO_USER_ID,
      displayName: 'Demo Reader',
      username: 'demo_reader',
      role: 'member',
      minutes: 30,
      currentPage: 237,
      percent: 50,
      finished: false,
    },
  ],
  history: [
    {
      id: 'r1',
      number: 1,
      startDate: '2026-10-01',
      deadline: '2026-10-31',
      outcome: 'not-completed',
      finished: 1,
      expected: 2,
      daysLeft: 0,
      book: { id: 'p', title: 'Persuasion', authors: [], pageCount: 250, coverUrl: null },
    },
  ],
  poll: {
    id: 'poll',
    status: 'open',
    closesAt: '2026-11-25T18:00:00Z',
    anonymous: true,
    proposals: [
      { id: 'p1', bookId: 'b1', title: 'Piranesi', authors: [], proposedBy: null, votes: 1 },
      { id: 'p2', bookId: 'b2', title: 'Jane Eyre', authors: [], proposedBy: null, votes: 0 },
    ],
    yourVote: null,
    voted: 1,
    total: 2,
  },
};
apiClub.history.push(apiClub.round);

const apiGroup: ApiChallengeGroupDetail = {
  id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01',
  name: 'Halloween Sprint',
  description: '',
  adminId: DEMO_USER_ID,
  status: 'active',
  challenge: {
    startDate: '2026-10-31',
    endDate: '2026-11-06',
    winMetric: 'minutes',
    metricGoal: 0,
  },
  members: [{ userId: DEMO_USER_ID, role: 'admin', joinedAt: '2026-10-31T10:00:00Z' }],
  createdAt: '2026-10-31T10:00:00Z',
  standings: [
    {
      userId: DEMO_USER_ID,
      displayName: 'Demo Reader',
      username: 'demo_reader',
      role: 'admin',
      score: 40,
      books: [
        { bookId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01', title: 'Emma', minutes: 25 },
        {
          bookId: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a02',
          title: 'The Midnight Library',
          minutes: 15,
        },
      ],
    },
  ],
};

function mountGroup(groupId: string) {
  return mount(GroupDetailView, { props: { groupId }, global: { plugins: [router] } });
}

describe('GroupDetailView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getFriends.mockResolvedValue([]);
    getGroupInvites.mockResolvedValue([]);
  });

  it('sends a chat message on a challenge from the API', async () => {
    getChallengeGroup.mockResolvedValueOnce(apiGroup);
    getGroupMessages.mockResolvedValue([]);
    sendGroupMessage.mockImplementation(async (groupId, { clientId, body }) => ({
      id: 'm9',
      seq: 9,
      groupId,
      kind: 'text',
      authorId: DEMO_USER_ID,
      clientId,
      body,
      createdAt: '2026-11-17T10:00:00Z',
      deletedAt: null,
    }));
    const wrapper = mountGroup(apiGroup.id);
    await flushPromises();

    await wrapper.get('input[type="text"]').setValue('See you on the leaderboard');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(sendGroupMessage).toHaveBeenCalledWith(
      apiGroup.id,
      expect.objectContaining({ body: 'See you on the leaderboard' }),
    );
    expect(wrapper.text()).toContain('See you on the leaderboard');
    wrapper.unmount();
  });

  it('does not send an empty chat message', async () => {
    getChallengeGroup.mockResolvedValueOnce(apiGroup);
    getGroupMessages.mockResolvedValue([]);
    sendGroupMessage.mockClear();
    const wrapper = mountGroup(apiGroup.id);
    await flushPromises();

    await wrapper.get('input[type="text"]').setValue('   ');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(sendGroupMessage).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('shows the signed-in reader rank on a challenge from the API', async () => {
    getChallengeGroup.mockResolvedValueOnce(apiGroup);
    getGroupMessages.mockResolvedValue([]);
    const wrapper = mountGroup(apiGroup.id);
    await flushPromises();

    expect(wrapper.get('.rank').text()).toBe('#1of 1');
    expect(wrapper.get('.board').text()).toContain('Demo Reader · you');
    wrapper.unmount();
  });

  it('treats the old prototype ids like any other id and asks the API', async () => {
    getChallengeGroup.mockRejectedValueOnce(new Error('HTTP 404'));
    getBookClub.mockRejectedValueOnce(new Error('HTTP 404'));
    const wrapper = mountGroup('october-sprint');
    await flushPromises();

    expect(getChallengeGroup).toHaveBeenCalledWith('october-sprint');
    expect(wrapper.get('h1').text()).toBe('This group could not be found.');
    expect(wrapper.text()).not.toContain('October Sprint');
  });

  it('loads a created challenge group from the API with its minutes leaderboard', async () => {
    getChallengeGroup.mockResolvedValueOnce(apiGroup);
    const wrapper = mountGroup(apiGroup.id);
    await flushPromises();

    expect(getChallengeGroup).toHaveBeenCalledWith(apiGroup.id);
    expect(wrapper.get('h1').text()).toBe('Halloween Sprint');
    expect(wrapper.findAll('.board > li')).toHaveLength(1);
    expect(wrapper.get('.board').text()).toContain('40 min');
    const books = wrapper
      .findAll('.board .books li')
      .map((li) => [li.get('.book-title').text(), li.get('.book-score').text()]);
    expect(books).toEqual([
      ['Emma', '25 min'],
      ['The Midnight Library', '15 min'],
    ]);
    expect(wrapper.text()).not.toContain('Last month’s result');
  });

  it('does not show the invite option to a challenge member who is not the admin', async () => {
    const memberGroup: ApiChallengeGroupDetail = {
      ...apiGroup,
      adminId: MAYA,
      members: [
        { userId: MAYA, role: 'admin', joinedAt: '2026-10-31T10:00:00Z' },
        { userId: DEMO_USER_ID, role: 'member', joinedAt: '2026-11-01T10:00:00Z' },
      ],
      standings: [
        {
          userId: MAYA,
          displayName: 'Maya Laurent',
          username: 'mayareads',
          role: 'admin',
          score: 40,
          books: [],
        },
        {
          userId: DEMO_USER_ID,
          displayName: 'Demo Reader',
          username: 'demo_reader',
          role: 'member',
          score: 20,
          books: [],
        },
      ],
    };
    getChallengeGroup.mockResolvedValueOnce(memberGroup);
    const wrapper = mountGroup(apiGroup.id);
    await flushPromises();

    expect(wrapper.findAll('button').some((b) => b.text() === 'Admin & settings')).toBe(false);
    expect(wrapper.text()).not.toContain('Invite friends');
  });

  it('shows no rank while the challenge has no scores yet', async () => {
    const untracked = {
      ...apiGroup,
      standings: apiGroup.standings.map((s) => ({ ...s, score: null, books: [] })),
    };
    getChallengeGroup.mockResolvedValueOnce(untracked);
    const wrapper = mountGroup(apiGroup.id);
    await flushPromises();

    expect(wrapper.find('.rank-number').exists()).toBe(false);
    expect(wrapper.text()).toContain('Not ranked yet');
    expect(wrapper.text()).not.toContain('#0');
  });

  it('loads a book club from the API with progress, history, vote and chat', async () => {
    getChallengeGroup.mockRejectedValueOnce(new Error('HTTP 404'));
    getBookClub.mockResolvedValue(apiClub);
    getGroupMessages.mockResolvedValue([
      {
        id: 'm1',
        seq: 1,
        groupId: apiClub.id,
        kind: 'system',
        authorId: null,
        clientId: null,
        body: 'Emma was selected by admin Maya Laurent.',
        createdAt: '2026-11-01T10:00:00Z',
        deletedAt: null,
      },
    ]);
    voteForProposal.mockResolvedValue({} as ApiPoll);
    const wrapper = mountGroup(apiClub.id);
    await flushPromises();

    expect(getBookClub).toHaveBeenCalledWith(apiClub.id);
    expect(wrapper.get('h1').text()).toBe('Sunday Classics');
    expect(wrapper.text()).toContain('Round 2 · Active');
    expect(wrapper.text()).toContain('1 of 2 finished');
    expect(wrapper.text()).toContain('26 days to turn the last page');
    expect(wrapper.get('.board').text()).toContain('Demo Reader · you');
    expect(wrapper.text()).toContain('System · Emma was selected by admin Maya Laurent.');
    // Not the admin: no settings button
    expect(wrapper.findAll('button').some((b) => b.text() === 'Admin & settings')).toBe(false);

    expect(wrapper.text()).toContain('Round 1 · Not completed');
    expect(wrapper.text()).toContain('Persuasion · 1 of 2 finished');

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Vote for Piranesi')!
      .trigger('click');
    await flushPromises();
    expect(voteForProposal).toHaveBeenCalledWith(apiClub.id, 'p1');
    expect(getBookClub).toHaveBeenCalledTimes(2);
    wrapper.unmount();
  });

  it('shows the admin panel to the club admin', async () => {
    getChallengeGroup.mockRejectedValueOnce(new Error('HTTP 404'));
    getBookClub.mockResolvedValue({ ...apiClub, adminId: DEMO_USER_ID, poll: null });
    getGroupMessages.mockResolvedValue([]);
    const wrapper = mountGroup(apiClub.id);
    await flushPromises();

    expect(wrapper.text()).toContain('No vote is open yet. Open one from Admin & settings.');
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Admin & settings')!
      .trigger('click');

    expect(wrapper.text()).toContain('Start the next round');
    const start = wrapper.findAll('button').find((b) => b.text() === 'Start next round')!;
    expect(start.attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('Available once everyone finishes or the deadline passes.');
    wrapper.unmount();
  });

  it('explains when a group cannot be found', async () => {
    getChallengeGroup.mockRejectedValueOnce(new Error('HTTP 404'));
    getBookClub.mockRejectedValueOnce(new Error('HTTP 404'));
    const wrapper = mountGroup('winter-classics');
    await flushPromises();

    expect(wrapper.get('h1').text()).toBe('This group could not be found.');
  });

  it('shows the group plate skeleton while the group loads', async () => {
    let resolveGroup!: (group: ApiChallengeGroupDetail) => void;
    getChallengeGroup.mockReturnValueOnce(
      new Promise<ApiChallengeGroupDetail>((resolve) => {
        resolveGroup = resolve;
      }),
    );
    getGroupMessages.mockResolvedValue([]);
    const wrapper = mountGroup(apiGroup.id);
    await flushPromises();

    const skeleton = wrapper.get('.page-skeleton');
    expect(skeleton.classes()).toContain('detail');
    expect(skeleton.find('.band').exists()).toBe(true);
    expect(skeleton.find('.detail-body.page-column').exists()).toBe(true);

    resolveGroup(apiGroup);
    await flushPromises();
    wrapper.unmount();
  });
});
