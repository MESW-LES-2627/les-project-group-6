// @req F-GRP-02
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiChatMessage } from '@/services/api';
import type { ChatSocketHandlers } from '@/services/chat-socket';
import GroupChat from '../GroupChat.vue';

const api = vi.hoisted(() => ({
  getGroupMessages: vi.fn<typeof import('@/services/api').getGroupMessages>(),
  sendGroupMessage: vi.fn<typeof import('@/services/api').sendGroupMessage>(),
  deleteGroupMessage: vi.fn<typeof import('@/services/api').deleteGroupMessage>(),
}));
const socket = vi.hoisted(() => ({
  handlers: null as ChatSocketHandlers | null,
  close: vi.fn<() => void>(),
}));

vi.mock('@/services/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/services/api')>()),
  ...api,
}));
vi.mock('@/services/chat-socket', () => ({
  connectChatSocket: (_groupId: string, handlers: ChatSocketHandlers) => {
    socket.handlers = handlers;
    return { close: socket.close };
  },
}));

const GROUP = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a01';
const me = { id: 'u-me', name: 'Demo Reader', initials: 'DR', handle: 'demo' };
const ana = { id: 'u-ana', name: 'Ana Silva', initials: 'AS', handle: 'ana' };

function message(seq: number, overrides: Partial<ApiChatMessage> = {}): ApiChatMessage {
  return {
    id: `m-${seq}`,
    seq,
    groupId: GROUP,
    kind: 'text',
    authorId: ana.id,
    clientId: `c-${seq}`,
    body: `message ${seq}`,
    createdAt: '2026-11-02T10:00:00Z',
    deletedAt: null,
    ...overrides,
  };
}

function mountLive(isAdmin = false) {
  return mount(GroupChat, {
    props: {
      messages: [],
      me,
      label: 'Message the group',
      placeholder: 'Write…',
      groupId: GROUP,
      members: [me, ana],
      isAdmin,
    },
  });
}

describe('GroupChat (live)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getGroupMessages.mockResolvedValue([
      message(1, {
        kind: 'system',
        authorId: null,
        clientId: null,
        body: 'Ana created the challenge',
      }),
      message(2),
    ]);
  });

  it('loads the history and shows pushed messages once', async () => {
    const wrapper = mountLive();
    await flushPromises();
    expect(wrapper.text()).toContain('System · Ana created the challenge');
    expect(wrapper.text()).toContain('Ana Silva');

    socket.handlers!.onMessage(message(3));
    socket.handlers!.onMessage(message(3));
    await flushPromises();
    expect(wrapper.findAll('.messages > li')).toHaveLength(3);
  });

  it('catches up from the last seq after the socket (re)joins', async () => {
    mountLive();
    await flushPromises();
    api.getGroupMessages.mockResolvedValue([message(3)]);
    socket.handlers!.onJoined();
    await flushPromises();
    expect(api.getGroupMessages).toHaveBeenLastCalledWith(GROUP, { after: 2 });
  });

  it('sends with a client id and replaces the pending copy with the stored one', async () => {
    api.sendGroupMessage.mockImplementation(async (_g, payload) =>
      message(3, { authorId: me.id, clientId: payload.clientId, body: payload.body }),
    );
    const wrapper = mountLive();
    await flushPromises();

    await wrapper.get('input').setValue('  Hello  ');
    await wrapper.get('form').trigger('submit');
    await flushPromises();

    const [, payload] = api.sendGroupMessage.mock.calls[0]!;
    expect(payload.body).toBe('Hello');
    // The push of the same message arrives after the response: still one copy.
    socket.handlers!.onMessage(
      message(3, { authorId: me.id, clientId: payload.clientId, body: 'Hello' }),
    );
    await flushPromises();
    expect(wrapper.findAll('.messages > li')).toHaveLength(3);
    expect(wrapper.text()).not.toContain('Sending…');
  });

  it('offers a retry when sending fails', async () => {
    api.sendGroupMessage.mockRejectedValueOnce(new Error('offline'));
    const wrapper = mountLive();
    await flushPromises();
    await wrapper.get('input').setValue('Hello');
    await wrapper.get('form').trigger('submit');
    await flushPromises();
    expect(wrapper.text()).toContain('Not sent.');

    api.sendGroupMessage.mockResolvedValueOnce(message(3, { authorId: me.id, body: 'Hello' }));
    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Retry')!
      .trigger('click');
    await flushPromises();
    const [, first] = api.sendGroupMessage.mock.calls[0]!;
    const [, second] = api.sendGroupMessage.mock.calls[1]!;
    expect(second.clientId).toBe(first.clientId);
  });

  it('only shows delete on own messages, or on all of them for the admin', async () => {
    api.getGroupMessages.mockResolvedValue([message(1), message(2, { authorId: me.id })]);
    const member = mountLive();
    await flushPromises();
    expect(member.findAll('button').filter((b) => b.text() === 'Delete')).toHaveLength(1);

    const admin = mountLive(true);
    await flushPromises();
    expect(admin.findAll('button').filter((b) => b.text() === 'Delete')).toHaveLength(2);
  });

  it('marks a message deleted when told by the socket', async () => {
    const wrapper = mountLive();
    await flushPromises();
    socket.handlers!.onDeleted({ id: 'm-2', groupId: GROUP, seq: 2 });
    await flushPromises();
    expect(wrapper.text()).toContain('This message was deleted');
    expect(wrapper.text()).not.toContain('message 2');
  });

  it('closes the socket when it leaves the page', async () => {
    const wrapper = mountLive();
    await flushPromises();
    wrapper.unmount();
    expect(socket.close).toHaveBeenCalled();
  });

  it('deletes own message through the API and shows it as deleted', async () => {
    api.deleteGroupMessage.mockResolvedValueOnce(undefined as never);
    api.getGroupMessages.mockResolvedValue([message(1, { authorId: me.id, body: 'Oops' })]);
    const wrapper = mountLive();
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Delete')!
      .trigger('click');
    await flushPromises();

    expect(api.deleteGroupMessage).toHaveBeenCalledWith(GROUP, 'm-1');
    expect(wrapper.text()).toContain('This message was deleted');
    expect(wrapper.text()).not.toContain('Oops');
  });

  it('keeps the message and shows the error when deleting fails', async () => {
    api.deleteGroupMessage.mockRejectedValueOnce(new Error('Forbidden'));
    api.getGroupMessages.mockResolvedValue([message(1, { authorId: me.id, body: 'Oops' })]);
    const wrapper = mountLive();
    await flushPromises();

    await wrapper
      .findAll('button')
      .find((b) => b.text() === 'Delete')!
      .trigger('click');
    await flushPromises();

    expect(wrapper.get('[role="alert"]').text()).toBe('Forbidden');
    expect(wrapper.text()).toContain('Oops');
  });
});
