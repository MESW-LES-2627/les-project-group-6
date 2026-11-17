// @req F-GRP-02
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Listener = (...args: unknown[]) => void;

const fake = vi.hoisted(() => {
  const listeners = new Map<string, Listener>();
  const socket = {
    on: vi.fn<(event: string, listener: Listener) => void>((event, listener) => {
      listeners.set(event, listener);
    }),
    connect: vi.fn<() => void>(),
    disconnect: vi.fn<() => void>(),
    emitWithAck: vi.fn<() => Promise<{ ok: boolean }>>(async () => ({ ok: true })),
  };
  return { listeners, socket, io: vi.fn<() => typeof socket>(() => socket) };
});
vi.mock('socket.io-client', () => ({ io: fake.io }));
const accessToken = vi.hoisted(() => vi.fn<() => Promise<string>>());
vi.mock('@/services/auth', () => ({ authProvider: { accessToken } }));
vi.mock('@/services/api', () => ({
  apiEndpoint: () => ({ origin: 'http://api.test', path: '' }),
}));

import { connectChatSocket, SERVER_DISCONNECT_RETRY_MS } from '../chat-socket';

const handlers = () => ({
  onMessage: vi.fn<() => void>(),
  onDeleted: vi.fn<() => void>(),
  onJoined: vi.fn<() => void>(),
});

describe('chat socket', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    fake.listeners.clear();
    vi.clearAllMocks();
    accessToken.mockResolvedValue('jwt');
  });
  afterEach(() => vi.useRealTimers());

  it('reconnects after the server closes the socket (expired token)', () => {
    connectChatSocket('group-1', handlers());
    fake.listeners.get('disconnect')!('io server disconnect');

    expect(fake.socket.connect).not.toHaveBeenCalled();
    vi.advanceTimersByTime(SERVER_DISCONNECT_RETRY_MS);
    expect(fake.socket.connect).toHaveBeenCalledOnce();
  });

  it('leaves other disconnects to the built-in reconnection', () => {
    connectChatSocket('group-1', handlers());
    fake.listeners.get('disconnect')!('transport close');
    vi.advanceTimersByTime(SERVER_DISCONNECT_RETRY_MS);
    expect(fake.socket.connect).not.toHaveBeenCalled();
  });

  it('does not reconnect once closed', () => {
    const chat = connectChatSocket('group-1', handlers());
    fake.listeners.get('disconnect')!('io server disconnect');
    chat.close();
    vi.advanceTimersByTime(SERVER_DISCONNECT_RETRY_MS);
    expect(fake.socket.connect).not.toHaveBeenCalled();
    expect(fake.socket.disconnect).toHaveBeenCalledOnce();
  });

  it('sends the current access token in the handshake, or nothing when it fails', async () => {
    connectChatSocket('group-1', handlers());
    const [origin, options] = fake.io.mock.calls[0] as unknown as [
      string,
      { path: string; auth: (send: (data: object) => void) => void },
    ];
    expect(origin).toBe('http://api.test');
    expect(options.path).toBe('/socket.io');

    const send = vi.fn<(data: object) => void>();
    options.auth(send);
    await vi.waitFor(() => expect(send).toHaveBeenCalledWith({ token: 'jwt' }));

    accessToken.mockRejectedValueOnce(new Error('signed out'));
    options.auth(send);
    await vi.waitFor(() => expect(send).toHaveBeenLastCalledWith({}));
  });

  it('joins the group room on connect and reports a successful join', async () => {
    const h = handlers();
    connectChatSocket('group-1', h);
    await fake.listeners.get('connect')!();
    expect(fake.socket.emitWithAck).toHaveBeenCalledWith('group:join', 'group-1');
    expect(h.onJoined).toHaveBeenCalledOnce();

    fake.socket.emitWithAck.mockResolvedValueOnce({ ok: false });
    await fake.listeners.get('connect')!();
    expect(h.onJoined).toHaveBeenCalledOnce();
  });

  it('only forwards messages and deletions of its own group', () => {
    const h = handlers();
    connectChatSocket('group-1', h);
    const mine = { id: 'm1', groupId: 'group-1', seq: 1 };
    const other = { id: 'm2', groupId: 'group-2', seq: 2 };

    fake.listeners.get('message:new')!(mine);
    fake.listeners.get('message:new')!(other);
    fake.listeners.get('message:deleted')!(mine);
    fake.listeners.get('message:deleted')!(other);

    expect(h.onMessage).toHaveBeenCalledExactlyOnceWith(mine);
    expect(h.onDeleted).toHaveBeenCalledExactlyOnceWith(mine);
  });
});
