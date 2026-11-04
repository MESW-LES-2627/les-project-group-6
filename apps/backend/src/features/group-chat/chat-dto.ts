import type { ChatMessage, MessageKind } from './chat-message.js';

// Shape of a message on the wire, for REST responses and socket events alike.
export interface ChatMessageDto {
  id: string;
  seq: number;
  groupId: string;
  kind: MessageKind;
  authorId: string | null;
  clientId: string | null;
  /** Null once the message is deleted, so its text is no longer served. */
  body: string | null;
  createdAt: string;
  deletedAt: string | null;
}

export function toChatMessageDto(message: ChatMessage): ChatMessageDto {
  return {
    id: message.id.value,
    seq: message.seq ?? 0,
    groupId: message.groupId.value,
    kind: message.kind,
    authorId: message.authorId?.value ?? null,
    clientId: message.clientId?.value ?? null,
    body: message.isDeleted ? null : message.body.value,
    createdAt: message.createdAt.toISOString(),
    deletedAt: message.deletedAt?.toISOString() ?? null,
  };
}

export interface MessageDeletedEvent {
  id: string;
  groupId: string;
  seq: number;
}
