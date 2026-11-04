import type { Server, Socket } from 'socket.io';
import { UserId } from '../user/user.js';
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
 * Registers the connection handshake and the room events. The user id comes from
 * the handshake `auth` payload until Supabase Auth lands; then it is the JWT's subject.
 */
export function registerChatSocket(io: Server, canListen: CanListen): void {
  io.use((socket, next) => {
    try {
      socket.data.userId = UserId.of(socket.handshake.auth?.userId).value;
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
