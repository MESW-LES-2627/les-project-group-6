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
    book: { id: 'emma', title: 'Emma', pageCount: 474, coverUrl: null },
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
import GroupsView from '../GroupsView.vue';

function mountView() {
  return mount(GroupsView, { global: { plugins: [router] } });
}

describe('GroupsView', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('shows the heading, the invitation and all six groups', () => {
    const wrapper = mountView();

    expect(wrapper.get('h1').text()).toBe('Good books bring people together.');
    expect(wrapper.text()).toContain('The Sunday Shelf');
    expect(wrapper.findAll('article')).toHaveLength(6);
  });

  it('filters by kind and by status', async () => {
    const wrapper = mountView();
    const button = (label: string) =>
      wrapper.findAll('.filter').find((b) => b.text().startsWith(label))!;

    await button('Challenges').trigger('click');
    expect(wrapper.findAll('article')).toHaveLength(3);

    await button('Completed').trigger('click');
    expect(wrapper.findAll('article')).toHaveLength(2);
    expect(button('Completed').attributes('aria-pressed')).toBe('true');
  });

  it('adds the group when the invitation is accepted', async () => {
    const wrapper = mountView();

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'View & accept')!
      .trigger('click');

    expect(wrapper.findAll('article')).toHaveLength(7);
    expect(wrapper.text()).not.toContain('A new invitation');
    expect(wrapper.get('[role="status"]').text()).toBe('You joined The Sunday Shelf.');
  });

  it('removes the invitation when it is declined', async () => {
    const wrapper = mountView();

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Decline')!
      .trigger('click');

    expect(wrapper.findAll('article')).toHaveLength(6);
    expect(wrapper.text()).not.toContain('A new invitation');
  });

  it('links to the create page and to each group', () => {
    const wrapper = mountView();
    const hrefs = wrapper.findAll('a').map((a) => a.attributes('href'));

    expect(hrefs).toContain('/groups/new');
    expect(hrefs).toContain('/groups/october-sprint');
    expect(hrefs).toContain('/groups/classics');
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
    expect(wrapper.text()).not.toContain('Pending invites');
    expect(wrapper.get('[role="status"]').text()).toBe('You joined Sunday Classics.');
    expect(wrapper.findAll('article')).toHaveLength(7);
    expect(wrapper.text()).toContain('0 of 3 finished');
  });
});
