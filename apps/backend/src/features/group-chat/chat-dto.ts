import type { ChatEntry } from './chat-repository.js';

export interface ChatMessageDto {
  id: string;
  groupId: string;
  /** Null for system messages. */
  author: { userId: string; displayName: string; username: string } | null;
  text: string;
  createdAt: string;
}

export function toChatMessageDto({ message, author }: ChatEntry): ChatMessageDto {
  return {
    id: message.id.value,
    groupId: message.groupId.value,
    author:
      message.authorId && author
        ? {
            userId: message.authorId.value,
            displayName: author.displayName,
            username: author.username,
          }
        : null,
    text: message.text.value,
    createdAt: message.createdAt.toISOString(),
  };
}
