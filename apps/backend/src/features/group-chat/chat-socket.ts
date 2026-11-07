import type { Server, Socket } from 'socket.io';
import type { AuthProvider } from '../auth/auth-provider.js';
import type { ChatMessageDto, MessageDeletedEvent } from './chat-dto.js';
import type { ChatNotifier } from './chat-notifier.js';

// Socket.IO adapter for the chat (ADR-0006). Clients only listen: they join the
// rooms of their groups and receive message:new / message:deleted.

export const roomOf = (groupId: string) => `group:${groupId}`;
const userRoomOf = (userId: string) => `user:${userId}`;

/** Checks whether a user may listen to a group (ChatService.canListen). */
export type CanListen = (groupId: unknown, userId: unknown) => Promise<boolean>;

type JoinAck = (result: { ok: boolean; error?: string }) => void;

export class SocketIoChatNotifier implements ChatNotifier {
  constructor(private readonly io: Server) {}

  messageCreated(message: ChatMessageDto): void {
    this.io.to(roomOf(message.groupId)).emit('message:new', message);
  }

  messageDeleted(event: MessageDeletedEvent): void {
    this.io.to(roomOf(event.groupId)).emit('message:deleted', event);
  }

  leave(userId: string, groupId: string): void {
    this.io.in(userRoomOf(userId)).socketsLeave(roomOf(groupId));
  }
}

// setTimeout fires at once for delays above this (about 24.8 days).
const MAX_TIMER_MS = 2 ** 31 - 1;

/**
 * Registers the connection handshake and the room events. The client sends its
 * Supabase access token as `auth: { token }`; the user is the token's subject.
 * The token is only checked here, so the socket is closed when it expires; the
 * client reconnects with a fresh token.
 */
export function registerChatSocket(io: Server, auth: AuthProvider, canListen: CanListen): void {
  io.use(async (socket, next) => {
    try {
      const token: unknown = socket.handshake.auth?.token;
      if (typeof token !== 'string' || token === '') throw new Error('missing token');
      const identity = await auth.verify(token);
      socket.data.userId = identity.userId.value;
      socket.data.expiresAt = identity.expiresAt;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId: string = socket.data.userId;
    void socket.join(userRoomOf(userId));

    const expiresAt: Date | null = socket.data.expiresAt;
    const msLeft = expiresAt ? expiresAt.getTime() - Date.now() : null;
    if (msLeft !== null && msLeft <= MAX_TIMER_MS) {
      const expiry = setTimeout(() => socket.disconnect(true), Math.max(0, msLeft));
      socket.once('disconnect', () => clearTimeout(expiry));
    }

    socket.on('group:join', async (groupId: unknown, ack?: JoinAck) => {
      try {
        if (!(await canListen(groupId, userId))) {
          ack?.({ ok: false, error: 'forbidden' });
          return;
        }
        await socket.join(roomOf(groupId as string));
        ack?.({ ok: true });
      } catch (error) {
        console.error(error);
        ack?.({ ok: false, error: 'internal' });
      }
    });

    socket.on('group:leave', async (groupId: unknown) => {
      if (typeof groupId === 'string') await socket.leave(roomOf(groupId));
    });
  });
}
