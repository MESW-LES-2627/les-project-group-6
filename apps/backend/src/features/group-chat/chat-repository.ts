import { and, desc, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { conversations, posts, users } from '../../database/schema.js';
import { GroupId } from '../group/group.js';
import { UserId } from '../user/user.js';
import { ChatMessage, MessageId, MessageText } from './chat-message.js';

/** A message with its author's names, as the chat shows it. */
export interface ChatEntry {
  message: ChatMessage;
  author: { displayName: string; username: string } | null;
}

export interface IChatRepository {
  add(message: ChatMessage): Promise<void>;
  /** The latest `limit` messages of the group, oldest first. */
  recent(groupId: GroupId, limit: number): Promise<ChatEntry[]>;
}

const GENERAL = 'General';

// Data Mapper over the existing tables: each group has one "General" conversation
// (created on its first message) and the messages are its posts.
export class DrizzleChatRepository implements IChatRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async add(message: ChatMessage): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Serialise the first message of a group so only one conversation is created.
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${message.groupId.value}))`);
      const found = await tx
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(eq(conversations.groupId, message.groupId.value), eq(conversations.name, GENERAL)),
        )
        .limit(1);
      let conversationId = found[0]?.id;
      if (!conversationId) {
        const created = await tx
          .insert(conversations)
          .values({ groupId: message.groupId.value, name: GENERAL, description: 'Group chat' })
          .returning({ id: conversations.id });
        conversationId = created[0]!.id;
      }
      await tx.insert(posts).values({
        id: message.id.value,
        authorId: message.authorId?.value ?? null,
        conversationId,
        content: message.text.value,
        createdAt: message.createdAt.toISOString(),
      });
    });
  }

  async recent(groupId: GroupId, limit: number): Promise<ChatEntry[]> {
    const rows = await this.db
      .select({
        id: posts.id,
        authorId: posts.authorId,
        content: posts.content,
        createdAt: posts.createdAt,
        displayName: users.displayName,
        username: users.username,
      })
      .from(posts)
      .innerJoin(conversations, eq(posts.conversationId, conversations.id))
      .leftJoin(users, eq(posts.authorId, users.id))
      .where(and(eq(conversations.groupId, groupId.value), eq(conversations.name, GENERAL)))
      .orderBy(desc(posts.createdAt), desc(posts.id))
      .limit(limit);

    return rows.reverse().map((row) => ({
      message: ChatMessage.reconstitute({
        id: MessageId.of(row.id),
        groupId,
        authorId: row.authorId ? UserId.of(row.authorId) : null,
        text: MessageText.of(row.content),
        createdAt: new Date(row.createdAt),
      }),
      author:
        row.displayName !== null && row.username !== null
          ? { displayName: row.displayName, username: row.username }
          : null,
    }));
  }
}
