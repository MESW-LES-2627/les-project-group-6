// @req F-GRP-01
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import router from '@/router';
import { ApiError, type ApiGroupInvite } from '@/services/api';
import type { GroupMember } from '@/types/groups';
import InviteFriends from '../InviteFriends.vue';

const api = vi.hoisted(() => ({
  getFriends: vi.fn<() => Promise<GroupMember[]>>(),
  getGroupInvites: vi.fn<(groupId: string) => Promise<ApiGroupInvite[]>>(),
  inviteToGroup: vi.fn<(groupId: string, inviteeId: string) => Promise<unknown>>(),
}));
vi.mock('@/services/api', async (original) => ({
  ...(await original<typeof import('@/services/api')>()),
  ...api,
}));

const member = (id: string, name: string): GroupMember => ({
  id,
  name,
  initials: name.slice(0, 2).toUpperCase(),
  handle: id,
});
const ANA = member('ana', 'Ana');
const MAYA = member('maya', 'Maya');
const BOB = member('bob', 'Bob');

async function mountList() {
  const wrapper = mount(InviteFriends, {
    props: { groupId: 'g1', members: [ANA, MAYA] },
    global: { plugins: [router] },
  });
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  api.getGroupInvites.mockResolvedValue([]);
});
afterEach(() => vi.clearAllMocks());

describe('InviteFriends', () => {
  it('lists only friends who are not members and marks an invited one', async () => {
    api.getFriends.mockResolvedValue([MAYA, BOB]);
    api.inviteToGroup.mockResolvedValue({});
    const wrapper = await mountList();

    expect(wrapper.findAll('.friend-name').map((n) => n.text())).toEqual(['Bob']);
    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(api.inviteToGroup).toHaveBeenCalledWith('g1', 'bob');
    expect(wrapper.get('button').text()).toBe('Invited');
    expect(wrapper.get('button').attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('Invite sent to Bob.');
  });

  it('marks a friend with a pending invite as invited and cannot invite them again', async () => {
    api.getFriends.mockResolvedValue([BOB]);
    api.getGroupInvites.mockResolvedValue([
      {
        id: 'i1',
        groupId: 'g1',
        inviteeId: BOB.id,
        inviterId: 'me',
        status: 'pending',
        createdAt: '2026-11-24T10:00:00Z',
      },
    ]);
    const wrapper = await mountList();

    const invited = wrapper.findAll('li').find((li) => li.text().includes('Bob'))!;
    expect(invited.get('button').text()).toBe('Invited');
    expect(invited.get('button').attributes('disabled')).toBeDefined();
    expect(api.inviteToGroup).not.toHaveBeenCalled();
  });

  it('shows the server message when an invite is refused', async () => {
    api.getFriends.mockResolvedValue([BOB]);
    api.inviteToGroup.mockRejectedValue(
      new ApiError('This reader already has a pending invite', 409),
    );
    const wrapper = await mountList();

    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toBe('This reader already has a pending invite');
    expect(wrapper.get('button').text()).toBe('Invite');
  });

  it('says when every friend is already in the group', async () => {
    api.getFriends.mockResolvedValue([MAYA]);
    const wrapper = await mountList();

    expect(wrapper.text()).toContain('All your friends are already in this group.');
  });

  it('points a reader with no friends to Explore', async () => {
    api.getFriends.mockResolvedValue([]);
    const wrapper = await mountList();

    expect(wrapper.text()).toContain('You have no friends to invite yet.');
    expect(wrapper.get('.find-friends').attributes('href')).toBe('/explore');
  });

  it('still lists friends when the pending-invites data is unavailable', async () => {
    api.getFriends.mockResolvedValue([BOB]);
    api.getGroupInvites.mockRejectedValue(new Error('HTTP 404'));
    const wrapper = await mountList();

    expect(wrapper.findAll('.friend-name').map((n) => n.text())).toEqual(['Bob']);
    expect(wrapper.text()).not.toContain('All your friends are already in this group.');
  });
});
