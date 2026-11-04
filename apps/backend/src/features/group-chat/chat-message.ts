import crypto from 'node:crypto';
import { InvalidValueError } from '../../utils/errors.js';
import { Uuid } from '../../utils/uuid.js';
import type { GroupId } from '../group/group.js';
import type { UserId } from '../user/user.js';

export class MessageId extends Uuid {
  declare private readonly brand: 'MessageId';

  static of(raw: unknown): MessageId {
    return new MessageId(Uuid.parse(raw, 'message id'));
  }

  static generate(): MessageId {
    return new MessageId(crypto.randomUUID());
  }
}

export const MAX_MESSAGE_LENGTH = 2000;

export class InvalidMessageTextError extends InvalidValueError {
  constructor() {
    super(`A message must be 1-${MAX_MESSAGE_LENGTH} characters`);
  }
}

export class MessageText {
  private constructor(readonly value: string) {}

  static of(raw: unknown): MessageText {
    const text = typeof raw === 'string' ? raw.trim() : '';
    if (text.length === 0 || text.length > MAX_MESSAGE_LENGTH) throw new InvalidMessageTextError();
    return new MessageText(text);
  }
}

export interface ChatMessageState {
  id: MessageId;
  groupId: GroupId;
  /** Null for a system message. */
  authorId: UserId | null;
  text: MessageText;
  createdAt: Date;
}

// Entity: one line of a group's chat, written by a member or by the system for a
// key event (member joined, round started...). Messages are never edited.
export class ChatMessage {
  readonly id: MessageId;
  readonly groupId: GroupId;
  readonly authorId: UserId | null;
  readonly text: MessageText;
  readonly createdAt: Date;

  private constructor(state: ChatMessageState) {
    this.id = state.id;
    this.groupId = state.groupId;
    this.authorId = state.authorId;
    this.text = state.text;
    this.createdAt = state.createdAt;
  }

  /** A member writes to the group. Membership is checked by the caller's roster. */
  static post(groupId: GroupId, authorId: UserId, text: MessageText, now: Date): ChatMessage {
    return new ChatMessage({ id: MessageId.generate(), groupId, authorId, text, createdAt: now });
  }

  /** The app announces a group event. */
  static system(groupId: GroupId, text: string, now: Date): ChatMessage {
    return new ChatMessage({
      id: MessageId.generate(),
      groupId,
      authorId: null,
      text: MessageText.of(text),
      createdAt: now,
    });
  }

  static reconstitute(state: ChatMessageState): ChatMessage {
    return new ChatMessage(state);
  }

  get isSystem(): boolean {
    return this.authorId === null;
  }
}
