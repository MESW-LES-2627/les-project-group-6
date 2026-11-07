import { io, type Socket } from 'socket.io-client';

import { apiEndpoint, type ApiChatMessage } from '@/services/api';
import { authProvider } from '@/services/auth';

export interface ChatSocketHandlers {
  onMessage(message: ApiChatMessage): void;
  onDeleted(event: { id: string; groupId: string; seq: number }): void;
  /** Called after every (re)join, so the caller can fetch what it missed. */
  onJoined(): void;
}

export interface ChatSocket {
  close(): void;
}

export const SERVER_DISCONNECT_RETRY_MS = 1000;

// Thin wrapper over socket.io-client (ADR-0006): listen-only, one group per socket.
export function connectChatSocket(groupId: string, handlers: ChatSocketHandlers): ChatSocket {
  const { origin, path } = apiEndpoint();
  // The handshake sends the current access token; the server reads the user from it.
  // A callback, so every reconnect uses a refreshed token.
  const socket: Socket = io(origin, {
    path: `${path}/socket.io`,
    auth: (send) => {
      authProvider
        .accessToken()
        .then((token) => send({ token }))
        .catch(() => send({}));
    },
  });

  // Rooms are lost when the connection drops, so join again on every connect.
  socket.on('connect', async () => {
    const result = (await socket.emitWithAck('group:join', groupId)) as { ok: boolean };
    if (result.ok) handlers.onJoined();
  });
  // The server closes the socket when its access token expires (it is only
  // checked in the handshake), and socket.io does not retry on its own after a
  // server-side disconnect. Reconnect shortly, with the refreshed token.
  let retry: ReturnType<typeof setTimeout> | undefined;
  socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') {
      retry = setTimeout(() => socket.connect(), SERVER_DISCONNECT_RETRY_MS);
    }
  });
  socket.on('message:new', (message: ApiChatMessage) => {
    if (message.groupId === groupId) handlers.onMessage(message);
  });
  socket.on('message:deleted', (event: { id: string; groupId: string; seq: number }) => {
    if (event.groupId === groupId) handlers.onDeleted(event);
  });

  return {
    close: () => {
      clearTimeout(retry);
      socket.disconnect();
    },
  };
}
