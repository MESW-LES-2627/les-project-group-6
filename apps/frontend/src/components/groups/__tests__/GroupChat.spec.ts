import { flushPromises, mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ApiChatMessage } from '@/services/api';
import GroupChat from '../GroupChat.vue';

const getGroupMessages = vi.hoisted(() => vi.fn<(groupId: string) => Promise<ApiChatMessage[]>>());
const postGroupMessage = vi.hoisted(() =>
  vi.fn<(groupId: string, text: string, userId: string) => Promise<ApiChatMessage>>(),
);

vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  getGroupMessages,
  postGroupMessage,
}));

const me = { id: 'u1', name: 'Demo Reader', initials: 'DR', handle: 'demo_reader' };
const message = (id: string, text: string): ApiChatMessage => ({
  id,
  groupId: 'g1',
  author: { userId: 'u2', displayName: 'Maya Laurent', username: 'mayareads' },
  text,
  createdAt: new Date().toISOString(),
});

function mountChat(pollInterval = 5000) {
  return mount(GroupChat, {
    props: { me, groupId: 'g1', label: 'Message the group', placeholder: 'Write…', pollInterval },
  });
}

describe('GroupChat with the API', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  it('loads the messages and sends a new one as the reader', async () => {
    getGroupMessages.mockResolvedValue([message('m1', 'Chapter 27!')]);
    postGroupMessage.mockResolvedValue({
      ...message('m2', 'So good'),
      author: { userId: 'u1', displayName: 'Demo Reader', username: 'demo_reader' },
    });
    const wrapper = mountChat();
    await flushPromises();

    expect(getGroupMessages).toHaveBeenCalledWith('g1', 'u1');
    expect(wrapper.text()).toContain('Maya Laurent');
    expect(wrapper.text()).toContain('Today ·');

    await wrapper.get('input').setValue('  So good ');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(postGroupMessage).toHaveBeenCalledWith('g1', 'So good', 'u1');
    expect(wrapper.findAll('.messages > li')).toHaveLength(2);
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('');
    wrapper.unmount();
  });

  it('checks for new messages on an interval', async () => {
    vi.useFakeTimers();
    getGroupMessages.mockResolvedValueOnce([]).mockResolvedValue([message('m1', 'Hello')]);
    const wrapper = mountChat(1000);
    await flushPromises();
    expect(wrapper.text()).toContain('No messages yet.');

    await vi.advanceTimersByTimeAsync(1000);
    await flushPromises();

    expect(wrapper.text()).toContain('Hello');
    wrapper.unmount();
  });

  it('shows the server error and keeps the draft when sending fails', async () => {
    getGroupMessages.mockResolvedValue([]);
    postGroupMessage.mockRejectedValue(new Error('Only group members can write in the chat'));
    const wrapper = mountChat();
    await flushPromises();

    await wrapper.get('input').setValue('Hi');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toBe('Only group members can write in the chat');
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('Hi');
    wrapper.unmount();
  });
});
