import { flushPromises, mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';

import router from '@/router';
import { DEMO_USER_ID, type ApiChallengeGroupDetail } from '@/services/api';
import GroupDetailView from '../GroupDetailView.vue';

const getChallengeGroup = vi.hoisted(() =>
  vi.fn<(groupId: string) => Promise<ApiChallengeGroupDetail>>(),
);

vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  getChallengeGroup,
}));

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

  it('switches the challenge conversation tabs', async () => {
    const wrapper = mountGroup('october-sprint');

    await wrapper
      .findAll('.tab')
      .find((t) => t.text().startsWith('Members'))!
      .trigger('click');

    expect(wrapper.findAll('.members li')).toHaveLength(6);
  });

  it('shows the book club page with the round and the vote', () => {
    const wrapper = mountGroup('classics');

    expect(wrapper.get('h1').text()).toBe('Classics, in good company.');
    expect(wrapper.text()).toContain('2 of 6 finished');
    expect(wrapper.text()).toContain('Start Emma session');
    expect(wrapper.findAll('.options > li')).toHaveLength(3);
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
    expect(options[1]!.text()).toMatch(/3 votes\s+· your vote/);

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

  it('explains when a group cannot be found', async () => {
    getChallengeGroup.mockRejectedValueOnce(new Error('HTTP 404'));
    const wrapper = mountGroup('winter-classics');
    await flushPromises();

    expect(wrapper.get('h1').text()).toBe('This group could not be found.');
  });
});
