// @req F-GRP-01
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/services/api';
import type { GroupMember } from '@/types/groups';
import InviteFriends from '../InviteFriends.vue';

const api = vi.hoisted(() => ({
  getFriends: vi.fn<() => Promise<GroupMember[]>>(),
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
  const wrapper = mount(InviteFriends, { props: { groupId: 'g1', members: [ANA, MAYA] } });
  await flushPromises();
  return wrapper;
}

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

    expect(wrapper.text()).toContain('All your friends are already here.');
  });
});
