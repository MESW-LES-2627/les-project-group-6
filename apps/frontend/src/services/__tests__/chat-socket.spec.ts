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
vi.mock('@/services/auth', () => ({ authProvider: { accessToken: async () => 'jwt' } }));
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
});
