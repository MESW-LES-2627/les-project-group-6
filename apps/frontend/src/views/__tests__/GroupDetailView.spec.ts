import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import router from '@/router';
import {
  DEMO_USER_ID,
  type ApiBookClubDetail,
  type ApiChallengeGroupDetail,
  type ApiChatMessage,
  type ApiPoll,
} from '@/services/api';
import GroupDetailView from '../GroupDetailView.vue';

const getChallengeGroup = vi.hoisted(() =>
  vi.fn<(groupId: string) => Promise<ApiChallengeGroupDetail>>(),
);

const getBookClub = vi.hoisted(() => vi.fn<(groupId: string) => Promise<ApiBookClubDetail>>());
const getGroupMessages = vi.hoisted(() => vi.fn<(groupId: string) => Promise<ApiChatMessage[]>>());
const voteForProposal = vi.hoisted(() =>
  vi.fn<(groupId: string, proposalId: string) => Promise<ApiPoll>>(),
);

vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  getChallengeGroup,
  getBookClub,
  getGroupMessages,
  voteForProposal,
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
    book: { id: EMMA, title: 'Emma', pageCount: 474, coverUrl: null },
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
      book: { id: 'p', title: 'Persuasion', pageCount: 250, coverUrl: null },
    },
  ],
  poll: {
    id: 'poll',
    status: 'open',
    closesAt: '2026-11-25T18:00:00Z',
    anonymous: true,
    proposals: [
      { id: 'p1', bookId: 'b1', title: 'Piranesi', proposedBy: null, votes: 1 },
      { id: 'p2', bookId: 'b2', title: 'Jane Eyre', proposedBy: null, votes: 0 },
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
  it('shows the challenge page with the leaderboard and sends a chat message', async () => {
    const wrapper = mountGroup('october-sprint');

    expect(wrapper.get('h1').text()).toBe('October Sprint');
    expect(wrapper.text()).toContain('#2 · 420');
    expect(wrapper.findAll('.board > li')).toHaveLength(6);
    expect(wrapper.get('.board').text()).toContain('Eleanor Whitmore · you');

    await wrapper.get('input[type="text"]').setValue('See you on the leaderboard');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.text()).toContain('See you on the leaderboard');
  });

  it('does not send an empty chat message', async () => {
    const wrapper = mountGroup('october-sprint');
    const before = wrapper.findAll('.messages > li').length;

    await wrapper.get('input[type="text"]').setValue('   ');
    await wrapper.get('form').trigger('submit');

    expect(wrapper.findAll('.messages > li')).toHaveLength(before);
  });

  it('shows the reader rank, the fair-reading rules and the last result', async () => {
    const wrapper = mountGroup('october-sprint');

    expect(wrapper.get('.rank').text()).toBe('#2of 6');
    expect(wrapper.findAll('.rules li')).toHaveLength(6);
    expect(wrapper.text()).toContain('Completed · September Sprint');

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Rematch September Sprint')!
      .trigger('click');
    expect(wrapper.get('[role="status"]').text()).toContain('A rematch with the same members');
  });

  it('shows the book club page with the round and the vote', () => {
    const wrapper = mountGroup('classics');

    expect(wrapper.get('h1').text()).toBe('Classics');
    expect(wrapper.text()).toContain('2 of 6 finished');
    expect(wrapper.text()).toContain('Start reading Emma');
    expect(wrapper.findAll('.options > li')).toHaveLength(3);
    expect(wrapper.text()).toContain('Round 3 · Completed');
  });

  it('changes the vote and adds a proposal', async () => {
    const wrapper = mountGroup('classics');

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Change my vote')!
      .trigger('click');
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Vote for Piranesi')!
      .trigger('click');

    const options = wrapper.findAll('.options > li');
    expect(options[0]!.text()).toContain('2 votes');
    expect(options[1]!.text()).toContain('3 votes');
    expect(options[1]!.get('.your-vote').text()).toBe('Your vote');

    await wrapper.get('#proposal-title').setValue('Middlemarch');
    await wrapper.get('.proposal').trigger('submit');

    expect(wrapper.findAll('.options > li')).toHaveLength(4);
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

    expect(getBookClub).toHaveBeenCalledWith(apiClub.id, DEMO_USER_ID);
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
    expect(voteForProposal).toHaveBeenCalledWith(apiClub.id, 'p1', DEMO_USER_ID);
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
});
