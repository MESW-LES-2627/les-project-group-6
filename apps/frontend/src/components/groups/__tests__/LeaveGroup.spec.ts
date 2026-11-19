// @req F-GRP-01
import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import router from '@/router';
import { ApiError } from '@/services/api';
import LeaveGroup from '../LeaveGroup.vue';

const leaveGroup = vi.hoisted(() => vi.fn<(groupId: string) => Promise<void>>());
vi.mock('@/services/api', async (original) => ({
  ...(await original<typeof import('@/services/api')>()),
  leaveGroup,
}));

function mountButton() {
  return mount(LeaveGroup, {
    props: { groupId: 'g1', groupName: 'Sprint' },
    global: { plugins: [router] },
  });
}

afterEach(() => vi.restoreAllMocks());

describe('LeaveGroup', () => {
  it('leaves after confirming and goes back to the groups page', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined);
    leaveGroup.mockResolvedValue(undefined);
    const wrapper = mountButton();

    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Leave Sprint?'));
    expect(leaveGroup).toHaveBeenCalledWith('g1');
    expect(push).toHaveBeenCalledWith({ name: 'groups' });
  });

  it('does nothing when the reader cancels', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    leaveGroup.mockClear();
    const wrapper = mountButton();

    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(leaveGroup).not.toHaveBeenCalled();
  });

  it('shows why the admin cannot leave', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const push = vi.spyOn(router, 'push');
    leaveGroup.mockRejectedValue(
      new ApiError('The admin cannot leave while other members are in the group', 409),
    );
    const wrapper = mountButton();

    await wrapper.get('button').trigger('click');
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toBe(
      'The admin cannot leave while other members are in the group',
    );
    expect(push).not.toHaveBeenCalled();
  });
});
