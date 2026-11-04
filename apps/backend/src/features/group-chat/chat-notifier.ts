import type { ChatMessageDto, MessageDeletedEvent } from './chat-dto.js';

// Port for real-time push (ADR-0006). The chat service calls it only after the
// change is stored; the Socket.IO adapter lives in chat-socket.ts.
export interface ChatNotifier {
  messageCreated(message: ChatMessageDto): void;
  messageDeleted(event: MessageDeletedEvent): void;
  /** Removes a user's open sockets from a group's room (e.g. after they leave the group). */
  leave(userId: string, groupId: string): void;
}

/** Used when no socket server is attached (tests, scripts): REST still works. */
export class NoopChatNotifier implements ChatNotifier {
  messageCreated(): void {}
  messageDeleted(): void {}
  leave(): void {}
}
