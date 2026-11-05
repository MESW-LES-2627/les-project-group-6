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

/**
 * Registers the connection handshake and the room events. The client sends its
 * Supabase access token as `auth: { token }`; the user is the token's subject.
 */
export function registerChatSocket(io: Server, auth: AuthProvider, canListen: CanListen): void {
  io.use(async (socket, next) => {
    try {
      const token: unknown = socket.handshake.auth?.token;
      if (typeof token !== 'string' || token === '') throw new Error('missing token');
      socket.data.userId = (await auth.verify(token)).userId.value;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId: string = socket.data.userId;
    void socket.join(userRoomOf(userId));

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
