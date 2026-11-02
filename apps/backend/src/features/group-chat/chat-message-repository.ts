import { and, asc, desc, eq, gt, lt } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { groupMessages } from '../../database/schema.js';
import { GroupId } from '../challenge-group/challenge-group.js';
import { UserId } from '../user/user.js';
import {
  ChatMessage,
  ClientMessageId,
  MessageBody,
  MessageId,
  messageKindOf,
} from './chat-message.js';

/** Where to read from: newer than `after`, or older than `before` (latest page when neither). */
export interface MessageCursor {
  after?: number;
  before?: number;
}

export interface IChatMessageRepository {
  /**
   * Stores a new message and returns it with its seq. When the same author already
   * sent this client id, nothing is written and the stored message comes back.
   */
  append(message: ChatMessage): Promise<{ message: ChatMessage; created: boolean }>;
  findById(groupId: GroupId, id: MessageId): Promise<ChatMessage | null>;
  /** Up to `limit` messages of the group in ascending seq order. */
  page(groupId: GroupId, cursor: MessageCursor, limit: number): Promise<ChatMessage[]>;
  markDeleted(message: ChatMessage): Promise<void>;
}

type MessageRow = typeof groupMessages.$inferSelect;

function toDomain(row: MessageRow): ChatMessage {
  return ChatMessage.reconstitute({
    id: MessageId.of(row.id),
    seq: row.seq,
    groupId: GroupId.of(row.groupId),
    authorId: row.authorId ? UserId.of(row.authorId) : null,
    clientId: row.clientId ? ClientMessageId.of(row.clientId) : null,
    kind: messageKindOf(row.kind),
    body: MessageBody.of(row.body),
    createdAt: new Date(row.createdAt),
    deletedAt: row.deletedAt ? new Date(row.deletedAt) : null,
  });
}

export class DrizzleChatMessageRepository implements IChatMessageRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async append(message: ChatMessage): Promise<{ message: ChatMessage; created: boolean }> {
    const inserted = await this.db
      .insert(groupMessages)
      .values({
        id: message.id.value,
        groupId: message.groupId.value,
        authorId: message.authorId?.value ?? null,
        clientId: message.clientId?.value ?? null,
        kind: message.kind,
        body: message.body.value,
        createdAt: message.createdAt.toISOString(),
      })
      .onConflictDoNothing({ target: [groupMessages.authorId, groupMessages.clientId] })
      .returning();
    if (inserted[0]) return { message: toDomain(inserted[0]), created: true };

    // A retry: the author already sent this client id.
    const [existing] = await this.db
      .select()
      .from(groupMessages)
      .where(
        and(
          eq(groupMessages.authorId, message.authorId!.value),
          eq(groupMessages.clientId, message.clientId!.value),
        ),
      );
    return { message: toDomain(existing!), created: false };
  }

  async findById(groupId: GroupId, id: MessageId): Promise<ChatMessage | null> {
    const [row] = await this.db
      .select()
      .from(groupMessages)
      .where(and(eq(groupMessages.groupId, groupId.value), eq(groupMessages.id, id.value)));
    return row ? toDomain(row) : null;
  }

  async page(groupId: GroupId, cursor: MessageCursor, limit: number): Promise<ChatMessage[]> {
    const inGroup = eq(groupMessages.groupId, groupId.value);
    if (cursor.after !== undefined) {
      const rows = await this.db
        .select()
        .from(groupMessages)
        .where(and(inGroup, gt(groupMessages.seq, cursor.after)))
        .orderBy(asc(groupMessages.seq))
        .limit(limit);
      return rows.map(toDomain);
    }
    // Latest page, or the page before a seq: read newest first, then flip.
    const rows = await this.db
      .select()
      .from(groupMessages)
      .where(
        cursor.before !== undefined ? and(inGroup, lt(groupMessages.seq, cursor.before)) : inGroup,
      )
      .orderBy(desc(groupMessages.seq))
      .limit(limit);
    return rows.reverse().map(toDomain);
  }

  async markDeleted(message: ChatMessage): Promise<void> {
    await this.db
      .update(groupMessages)
      .set({ deletedAt: message.deletedAt?.toISOString() ?? null })
      .where(eq(groupMessages.id, message.id.value));
  }
}
