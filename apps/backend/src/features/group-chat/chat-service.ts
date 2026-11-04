import type { Clock } from '../../utils/clock.js';
import { ForbiddenError, InvalidValueError, NotFoundError } from '../../utils/errors.js';
import { GroupId, type MemberRole } from '../group/group.js';
import { UserId } from '../user/user.js';
import { ChatMessage, ClientMessageId, MessageBody, MessageId } from './chat-message.js';
import type { IChatMessageRepository, MessageCursor } from './chat-message-repository.js';
import { toChatMessageDto } from './chat-dto.js';
import type { ChatNotifier } from './chat-notifier.js';
import type { GroupMembership } from './group-membership-query.js';

export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 100;

export interface SendMessageCommand {
  groupId: unknown;
  userId: unknown;
  clientId: unknown;
  body: unknown;
}

export interface HistoryQuery {
  groupId: unknown;
  userId: unknown;
  after?: unknown;
  before?: unknown;
  limit?: unknown;
}

export interface DeleteMessageCommand {
  groupId: unknown;
  messageId: unknown;
  userId: unknown;
}

/** Lets other features post system messages without knowing about the chat internals. */
export interface SystemMessages {
  postSystem(groupId: GroupId, text: string): Promise<void>;
}

function parseSeq(raw: unknown, label: string): number | undefined {
  if (raw === undefined) return undefined;
  const n = typeof raw === 'string' ? Number(raw) : raw;
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n < 0) {
    throw new InvalidValueError(`Invalid ${label}: ${String(raw)}`);
  }
  return n;
}

// Application service: the only place that writes chat messages and emits
// their events (ADR-0006). Store first, then notify.
export class ChatService implements SystemMessages {
  constructor(
    private readonly messages: IChatMessageRepository,
    private readonly members: GroupMembership,
    private readonly notifier: ChatNotifier,
    private readonly now: Clock = () => new Date(),
  ) {}

  /** Sends a text message; a retry with the same client id returns the stored one. */
  async send(command: SendMessageCommand): Promise<{ message: ChatMessage; created: boolean }> {
    const groupId = GroupId.of(command.groupId);
    const userId = UserId.of(command.userId);
    const clientId = ClientMessageId.of(command.clientId);
    const body = MessageBody.of(command.body);
    await this.requireRole(groupId, userId);

    const result = await this.messages.append(
      ChatMessage.write({ groupId, authorId: userId, clientId, body }, this.now()),
    );
    if (result.created) this.notifier.messageCreated(toChatMessageDto(result.message));
    return result;
  }

  async history(query: HistoryQuery): Promise<ChatMessage[]> {
    const groupId = GroupId.of(query.groupId);
    await this.requireRole(groupId, UserId.of(query.userId));

    const cursor: MessageCursor = {
      after: parseSeq(query.after, 'after'),
      before: parseSeq(query.before, 'before'),
    };
    if (cursor.after !== undefined && cursor.before !== undefined) {
      throw new InvalidValueError('Use either after or before, not both');
    }
    const limit = parseSeq(query.limit, 'limit') ?? DEFAULT_PAGE_SIZE;
    if (limit < 1 || limit > MAX_PAGE_SIZE) {
      throw new InvalidValueError(`Limit must be between 1 and ${MAX_PAGE_SIZE}`);
    }
    return this.messages.page(groupId, cursor, limit);
  }

  async delete(command: DeleteMessageCommand): Promise<void> {
    const groupId = GroupId.of(command.groupId);
    const userId = UserId.of(command.userId);
    const messageId = MessageId.of(command.messageId);
    const role = await this.requireRole(groupId, userId);

    const message = await this.messages.findById(groupId, messageId);
    if (!message) throw new NotFoundError('Message');
    if (!message.deleteBy(userId, role, this.now())) return;

    await this.messages.markDeleted(message);
    this.notifier.messageDeleted({
      id: message.id.value,
      groupId: groupId.value,
      seq: message.seq ?? 0,
    });
  }

  async postSystem(groupId: GroupId, text: string): Promise<void> {
    const { message } = await this.messages.append(
      ChatMessage.system(groupId, MessageBody.of(text), this.now()),
    );
    this.notifier.messageCreated(toChatMessageDto(message));
  }

  /** Whether a user may receive a group's events (used by the socket room join). */
  async canListen(groupId: unknown, userId: unknown): Promise<boolean> {
    try {
      return (await this.members.roleOf(GroupId.of(groupId), UserId.of(userId))) !== null;
    } catch (error) {
      if (error instanceof InvalidValueError) return false;
      throw error;
    }
  }

  private async requireRole(groupId: GroupId, userId: UserId): Promise<MemberRole> {
    const role = await this.members.roleOf(groupId, userId);
    if (!role) throw new ForbiddenError('Only members can use the group chat');
    return role;
  }
}
