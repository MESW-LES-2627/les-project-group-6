import { and, asc, count, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { bookTags, userTags } from '../../database/schema.js';
import type { BookId } from '../book/book.js';
import { UserId } from '../user/user.js';
import { Tag, TagId, TagName } from './tag.js';

/** A tag as the library sidebar shows it. */
export interface TagView {
  id: string;
  name: string;
  /** How many books carry the tag. */
  count: number;
}

type TagRow = typeof userTags.$inferSelect;

const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: unknown }).code === '23505';

function toDomain(row: TagRow): Tag {
  return Tag.reconstitute({
    id: TagId.of(row.id),
    userId: UserId.of(row.userId),
    name: TagName.of(row.name),
    createdAt: new Date(row.createdAt),
  });
}

export interface ITagRepository {
  listForUser(userId: UserId): Promise<TagView[]>;
  findById(id: TagId): Promise<Tag | null>;
  findByName(userId: UserId, name: TagName): Promise<Tag | null>;
  /** Inserts the tag, or returns the one the reader already has with that name. */
  saveOrFind(tag: Tag): Promise<Tag>;
  delete(id: TagId): Promise<void>;
  addBook(tagId: TagId, bookId: BookId): Promise<void>;
  removeBook(tagId: TagId, bookId: BookId): Promise<boolean>;
  countBooks(tagId: TagId): Promise<number>;
}

// Data Mapper over user_tags and book_tags. Every query is scoped by user_id.
export class DrizzleTagRepository implements ITagRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async listForUser(userId: UserId): Promise<TagView[]> {
    return this.db
      .select({
        id: userTags.id,
        name: userTags.name,
        count: count(bookTags.bookId).mapWith(Number),
      })
      .from(userTags)
      .leftJoin(bookTags, eq(bookTags.tagId, userTags.id))
      .where(eq(userTags.userId, userId.value))
      .groupBy(userTags.id, userTags.name)
      .orderBy(asc(userTags.name));
  }

  async findById(id: TagId): Promise<Tag | null> {
    const [row] = await this.db.select().from(userTags).where(eq(userTags.id, id.value)).limit(1);
    return row ? toDomain(row) : null;
  }

  async findByName(userId: UserId, name: TagName): Promise<Tag | null> {
    const [row] = await this.db
      .select()
      .from(userTags)
      .where(and(eq(userTags.userId, userId.value), eq(userTags.name, name.value)))
      .limit(1);
    return row ? toDomain(row) : null;
  }

  async saveOrFind(tag: Tag): Promise<Tag> {
    try {
      await this.db.insert(userTags).values({
        id: tag.id.value,
        userId: tag.userId.value,
        name: tag.name.value,
      });
      return tag;
    } catch (error) {
      // Two requests created the same tag at once: use the one that won.
      if (!isUniqueViolation(error)) throw error;
      const existing = await this.findByName(tag.userId, tag.name);
      if (!existing) throw error;
      return existing;
    }
  }

  async delete(id: TagId): Promise<void> {
    await this.db.delete(userTags).where(eq(userTags.id, id.value));
  }

  async addBook(tagId: TagId, bookId: BookId): Promise<void> {
    await this.db
      .insert(bookTags)
      .values({ tagId: tagId.value, bookId: bookId.value })
      .onConflictDoNothing();
  }

  async removeBook(tagId: TagId, bookId: BookId): Promise<boolean> {
    const removed = await this.db
      .delete(bookTags)
      .where(and(eq(bookTags.tagId, tagId.value), eq(bookTags.bookId, bookId.value)))
      .returning({ tagId: bookTags.tagId });
    return removed.length > 0;
  }

  async countBooks(tagId: TagId): Promise<number> {
    const [row] = await this.db
      .select({ count: count().mapWith(Number) })
      .from(bookTags)
      .where(eq(bookTags.tagId, tagId.value));
    return row?.count ?? 0;
  }
}
