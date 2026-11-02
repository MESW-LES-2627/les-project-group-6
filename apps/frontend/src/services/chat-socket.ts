import { io, type Socket } from 'socket.io-client';

import { apiEndpoint, DEMO_USER_ID, type ApiChatMessage } from '@/services/api';

export interface ChatSocketHandlers {
  onMessage(message: ApiChatMessage): void;
  onDeleted(event: { id: string; groupId: string; seq: number }): void;
  /** Called after every (re)join, so the caller can fetch what it missed. */
  onJoined(): void;
}

export interface ChatSocket {
  close(): void;
}

// Thin wrapper over socket.io-client (ADR-0006): listen-only, one group per socket.
export function connectChatSocket(
  groupId: string,
  handlers: ChatSocketHandlers,
  userId: string = DEMO_USER_ID,
): ChatSocket {
  const { origin, path } = apiEndpoint();
  const socket: Socket = io(origin, { path: `${path}/socket.io`, auth: { userId } });

  // Rooms are lost when the connection drops, so join again on every connect.
  socket.on('connect', async () => {
    const result = (await socket.emitWithAck('group:join', groupId)) as { ok: boolean };
    if (result.ok) handlers.onJoined();
  });
  socket.on('message:new', (message: ApiChatMessage) => {
    if (message.groupId === groupId) handlers.onMessage(message);
  });
  socket.on('message:deleted', (event: { id: string; groupId: string; seq: number }) => {
    if (event.groupId === groupId) handlers.onDeleted(event);
  });

  return { close: () => socket.disconnect() };
}
