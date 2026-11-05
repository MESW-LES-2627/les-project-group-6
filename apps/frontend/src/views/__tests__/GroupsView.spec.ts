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

  it('shows the plate, the invitation and all six groups by status', () => {
    const wrapper = mountView();

    expect(wrapper.get('h1').text()).toBe('Groups');
    expect(wrapper.text()).toContain('The Sunday Shelf');
    expect(wrapper.findAll('article')).toHaveLength(6);
    const sections = wrapper.findAll('.group-section h2').map((h) => h.text());
    expect(sections).toEqual(['Active', 'Coming up', 'Completed']);
  });

  it('filters by kind', async () => {
    const wrapper = mountView();
    const tab = (label: string) =>
      wrapper.findAll('.page-tab').find((b) => b.text().startsWith(label))!;

    await tab('Challenges').trigger('click');
    expect(wrapper.findAll('article')).toHaveLength(3);
    expect(tab('Challenges').attributes('aria-pressed')).toBe('true');

    await tab('Book clubs').trigger('click');
    expect(wrapper.findAll('article')).toHaveLength(3);
    expect(wrapper.text()).not.toContain('October Sprint');
  });

  it('adds the group when the invitation is accepted', async () => {
    const wrapper = mountView();

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'View and accept')!
      .trigger('click');

    expect(wrapper.findAll('article')).toHaveLength(7);
    expect(wrapper.text()).not.toContain('invited you to The Sunday Shelf');
    expect(wrapper.get('[role="status"]').text()).toBe('You joined The Sunday Shelf.');
  });

  it('removes the invitation when it is declined', async () => {
    const wrapper = mountView();

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Decline')!
      .trigger('click');

    expect(wrapper.findAll('article')).toHaveLength(6);
    expect(wrapper.text()).not.toContain('invited you to The Sunday Shelf');
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
    expect(wrapper.text()).not.toContain('Maya Laurent invited you to a book club');
    expect(wrapper.get('[role="status"]').text()).toBe('You joined Sunday Classics.');
    expect(wrapper.findAll('article')).toHaveLength(7);
    expect(wrapper.text()).toContain('0 of 3 finished');
  });
});
