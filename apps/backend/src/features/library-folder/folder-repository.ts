import { and, asc, count, eq, isNull, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { listBooks, lists } from '../../database/schema.js';
import type { BookId } from '../book/book.js';
import { UserId } from '../user/user.js';
import { Folder, FolderId, FolderName, FolderNameTakenError } from './folder.js';

/** A folder as the library sidebar shows it. */
export interface FolderView {
  id: string;
  name: string;
  /** How many books are in the folder. */
  count: number;
  createdAt: string;
}

type FolderRow = typeof lists.$inferSelect;

/** PostgreSQL unique violation, e.g. two folders with the same name at once. */
const isUniqueViolation = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && (error as { code?: unknown }).code === '23505';

function toDomain(row: FolderRow): Folder {
  return Folder.reconstitute({
    id: FolderId.of(row.id),
    userId: UserId.of(row.userId),
    name: FolderName.of(row.name),
    createdAt: new Date(row.createdAt),
  });
}

export interface IFolderRepository {
  listForUser(userId: UserId): Promise<FolderView[]>;
  findById(id: FolderId): Promise<Folder | null>;
  findByName(userId: UserId, name: FolderName): Promise<Folder | null>;
  save(folder: Folder): Promise<void>;
  delete(id: FolderId): Promise<boolean>;
  addBook(folderId: FolderId, bookId: BookId): Promise<boolean>;
  removeBook(folderId: FolderId, bookId: BookId): Promise<boolean>;
  countBooks(folderId: FolderId): Promise<number>;
}

// Data Mapper: `lists` stores both reader-owned folders and group lists, so every
// query here filters `user_id` and excludes group-owned rows.
export class DrizzleFolderRepository implements IFolderRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async listForUser(userId: UserId): Promise<FolderView[]> {
    const rows = await this.db
      .select({
        id: lists.id,
        name: lists.name,
        createdAt: lists.createdAt,
        count: count(listBooks.bookId).mapWith(Number),
      })
      .from(lists)
      .leftJoin(listBooks, eq(listBooks.listId, lists.id))
      .where(and(eq(lists.userId, userId.value), isNull(lists.groupId)))
      .groupBy(lists.id, lists.name, lists.createdAt)
      .orderBy(asc(sql`lower(${lists.name})`));

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      count: row.count,
      createdAt: new Date(row.createdAt).toISOString(),
    }));
  }

  async findById(id: FolderId): Promise<Folder | null> {
    const rows = await this.db
      .select()
      .from(lists)
      .where(and(eq(lists.id, id.value), isNull(lists.groupId)))
      .limit(1);
    const row = rows[0];
    return row?.userId ? toDomain(row) : null;
  }

  async findByName(userId: UserId, name: FolderName): Promise<Folder | null> {
    const rows = await this.db
      .select()
      .from(lists)
      .where(
        and(
          eq(lists.userId, userId.value),
          isNull(lists.groupId),
          sql`lower(${lists.name}) = lower(${name.value})`,
        ),
      )
      .limit(1);
    const row = rows[0];
    return row ? toDomain(row) : null;
  }

  async save(folder: Folder): Promise<void> {
    try {
      await this.db
        .insert(lists)
        .values({
          id: folder.id.value,
          userId: folder.userId.value,
          name: folder.name.value,
          visibility: 'private',
        })
        .onConflictDoUpdate({
          target: lists.id,
          set: { name: folder.name.value },
        });
    } catch (error) {
      // The service checks first; this keeps a concurrent create/rename honest.
      if (isUniqueViolation(error)) throw new FolderNameTakenError();
      throw error;
    }
  }

  async delete(id: FolderId): Promise<boolean> {
    const deleted = await this.db
      .delete(lists)
      .where(and(eq(lists.id, id.value), isNull(lists.groupId)))
      .returning({ id: lists.id });
    return deleted.length > 0;
  }

  async addBook(folderId: FolderId, bookId: BookId): Promise<boolean> {
    const added = await this.db
      .insert(listBooks)
      .values({ listId: folderId.value, bookId: bookId.value })
      .onConflictDoNothing()
      .returning({ listId: listBooks.listId });
    return added.length > 0;
  }

  async removeBook(folderId: FolderId, bookId: BookId): Promise<boolean> {
    const removed = await this.db
      .delete(listBooks)
      .where(and(eq(listBooks.listId, folderId.value), eq(listBooks.bookId, bookId.value)))
      .returning({ listId: listBooks.listId });
    return removed.length > 0;
  }

  async countBooks(folderId: FolderId): Promise<number> {
    const [row] = await this.db
      .select({ count: count().mapWith(Number) })
      .from(listBooks)
      .where(eq(listBooks.listId, folderId.value));
    return row?.count ?? 0;
  }
}
