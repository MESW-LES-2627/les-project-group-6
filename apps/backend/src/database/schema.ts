// Core database model. The documented version, with the reasons behind each
// table, is docs/architecture/table_UML.md: change both together.
import {
  pgTable,
  pgEnum,
  unique,
  uniqueIndex,
  index,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  foreignKey,
  check,
  date,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Shared timestamp columns. `updated_at` is refreshed by Drizzle on every update
// it issues; upserts set it explicitly.
const createdAt = () =>
  timestamp('created_at', { withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull();
const updatedAt = () =>
  timestamp('updated_at', { withTimezone: true, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull()
    .$onUpdate(() => sql`CURRENT_TIMESTAMP`);
const deletedAt = () => timestamp('deleted_at', { withTimezone: true, mode: 'string' });

export const visibility = pgEnum('visibility', ['private', 'public']);
export const friendshipStatus = pgEnum('friendship_status', ['pending', 'accepted', 'declined']);
export const readingStatusType = pgEnum('reading_status_type', [
  'not-started',
  'in-progress',
  'finished',
  'did-not-finish',
]);
export const dnfReason = pgEnum('dnf_reason', [
  'not-for-me',
  'too-slow',
  'will-try-later',
  'other',
]);
export const readingSessionStatus = pgEnum('reading_session_status', ['running', 'finished']);
export const groupMemberRole = pgEnum('group_member_role', ['admin', 'member']);
export const groupMemberStatus = pgEnum('group_member_status', [
  'invited',
  'active',
  'declined',
  'left',
]);

// ---------------------------------------------------------------------------
// Identity and social graph
// ---------------------------------------------------------------------------

// The id is the Supabase Auth user id, so it has no default.
export const user = pgTable(
  'user',
  {
    id: uuid().primaryKey().notNull(),
    email: varchar({ length: 255 }).notNull(),
    username: varchar({ length: 50 }).notNull(),
    displayName: varchar('display_name', { length: 255 }).notNull(),
    photoUrl: text('photo_url'),
    profileDescription: text('profile_description'),
    // IANA time zone name, used to decide which local day a session counts for.
    timezone: varchar({ length: 64 }).default('Europe/Lisbon').notNull(),
    profileVisibility: visibility('profile_visibility').default('private').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique('user_email_key').on(table.email),
    unique('user_username_key').on(table.username),
  ],
);

export const friendship = pgTable(
  'friendship',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    requesterUserId: uuid('requester_user_id').notNull(),
    addresseeUserId: uuid('addressee_user_id').notNull(),
    status: friendshipStatus().default('pending').notNull(),
    createdAt: createdAt(),
    respondedAt: timestamp('responded_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    foreignKey({
      columns: [table.requesterUserId],
      foreignColumns: [user.id],
      name: 'friendship_requester_user_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.addresseeUserId],
      foreignColumns: [user.id],
      name: 'friendship_addressee_user_id_fkey',
    }).onDelete('cascade'),
    check('friendship_not_self_check', sql`${table.requesterUserId} <> ${table.addresseeUserId}`),
    // One friendship per pair of users, whoever sent the request.
    uniqueIndex('friendship_pair_key').on(
      sql`LEAST(${table.requesterUserId}, ${table.addresseeUserId})`,
      sql`GREATEST(${table.requesterUserId}, ${table.addresseeUserId})`,
    ),
  ],
);

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

// Fixed, seeded list. A table rather than an enum so a genre is added without a migration.
export const genre = pgTable(
  'genre',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
  },
  (table) => [unique('genre_name_key').on(table.name)],
);

export const book = pgTable(
  'book',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    title: text().notNull(),
    description: text(),
    isbn13: varchar({ length: 13 }),
    pageCount: integer('page_count'),
    coverUrl: text('cover_url'),
    genreId: uuid('genre_id'),
    isCommunityAdded: boolean('is_community_added').default(false).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    unique('book_isbn13_key').on(table.isbn13),
    foreignKey({
      columns: [table.genreId],
      foreignColumns: [genre.id],
      name: 'book_genre_id_fkey',
    }).onDelete('set null'),
  ],
);

export const author = pgTable('author', {
  id: uuid().defaultRandom().primaryKey().notNull(),
  name: text().notNull(),
});

export const bookAuthor = pgTable(
  'book_author',
  {
    bookId: uuid('book_id').notNull(),
    authorId: uuid('author_id').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [book.id],
      name: 'book_author_book_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.authorId],
      foreignColumns: [author.id],
      name: 'book_author_author_id_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.bookId, table.authorId], name: 'book_author_pkey' }),
  ],
);

// ---------------------------------------------------------------------------
// Library: a book saved by a user has exactly one reading_status row
// ---------------------------------------------------------------------------

export const readingStatus = pgTable(
  'reading_status',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    bookId: uuid('book_id').notNull(),
    status: readingStatusType().default('not-started').notNull(),
    currentPage: integer('current_page').default(0).notNull(),
    dnfReason: dnfReason('dnf_reason'),
    finishedAt: timestamp('finished_at', { withTimezone: true, mode: 'string' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'reading_status_user_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [book.id],
      name: 'reading_status_book_id_fkey',
    }).onDelete('cascade'),
    unique('reading_status_user_id_book_id_key').on(table.userId, table.bookId),
  ],
);

export const review = pgTable(
  'review',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    bookId: uuid('book_id').notNull(),
    rating: integer().notNull(),
    comment: text(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'review_user_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [book.id],
      name: 'review_book_id_fkey',
    }).onDelete('cascade'),
    check('review_rating_check', sql`${table.rating} BETWEEN 1 AND 5`),
    // One live review per user and book; deleted reviews do not block a new one.
    uniqueIndex('review_user_id_book_id_key')
      .on(table.userId, table.bookId)
      .where(sql`${table.deletedAt} IS NULL`),
  ],
);

// A named collection (folder) of books from the owner's library.
export const list = pgTable(
  'list',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    name: text().notNull(),
    visibility: visibility().default('private').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'list_user_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const listBook = pgTable(
  'list_book',
  {
    listId: uuid('list_id').notNull(),
    bookId: uuid('book_id').notNull(),
    addedAt: timestamp('added_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.listId],
      foreignColumns: [list.id],
      name: 'list_book_list_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [book.id],
      name: 'list_book_book_id_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.listId, table.bookId], name: 'list_book_pkey' }),
  ],
);

// ---------------------------------------------------------------------------
// Reading: one row per timer run. It has no group link; a session counts in
// every challenge whose period contains it and where the user is an active member.
// ---------------------------------------------------------------------------

export const readingSession = pgTable(
  'reading_session',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    bookId: uuid('book_id').notNull(),
    status: readingSessionStatus().default('running').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true, mode: 'string' }),
    durationSeconds: integer('duration_seconds').default(0).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'reading_session_user_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [book.id],
      name: 'reading_session_book_id_fkey',
    }).onDelete('cascade'),
    check(
      'reading_session_ended_check',
      sql`(${table.status} = 'running' AND ${table.endedAt} IS NULL) OR (${table.status} = 'finished' AND ${table.endedAt} >= ${table.startedAt})`,
    ),
    // F-READ-01: only one active session per user.
    uniqueIndex('reading_session_one_running_key')
      .on(table.userId)
      .where(sql`${table.status} = 'running'`),
    index('reading_session_user_id_started_at_idx').on(table.userId, table.startedAt),
  ],
);

// ---------------------------------------------------------------------------
// Challenge groups (book clubs come back in Extras)
// ---------------------------------------------------------------------------

// Scheduled, active or finished is computed from the dates (no background jobs, see infra.md).
export const challengeGroup = pgTable(
  'challenge_group',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    description: text(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (table) => [check('challenge_group_period_check', sql`${table.endDate} >= ${table.startDate}`)],
);

// The admin is the member with role 'admin'; the group has no separate admin column.
export const groupMember = pgTable(
  'group_member',
  {
    challengeGroupId: uuid('challenge_group_id').notNull(),
    userId: uuid('user_id').notNull(),
    role: groupMemberRole().default('member').notNull(),
    status: groupMemberStatus().default('invited').notNull(),
    createdAt: createdAt(),
    joinedAt: timestamp('joined_at', { withTimezone: true, mode: 'string' }),
    leftAt: timestamp('left_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    foreignKey({
      columns: [table.challengeGroupId],
      foreignColumns: [challengeGroup.id],
      name: 'group_member_challenge_group_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'group_member_user_id_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.challengeGroupId, table.userId], name: 'group_member_pkey' }),
    index('group_member_user_id_idx').on(table.userId),
  ],
);

// The group chat, 1:1 with a challenge group.
export const conversation = pgTable(
  'conversation',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    challengeGroupId: uuid('challenge_group_id').notNull(),
    createdAt: createdAt(),
    // Also the time of the last message, to sort chats by activity.
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.challengeGroupId],
      foreignColumns: [challengeGroup.id],
      name: 'conversation_challenge_group_id_fkey',
    }).onDelete('cascade'),
    unique('conversation_challenge_group_id_key').on(table.challengeGroupId),
  ],
);

export const message = pgTable(
  'message',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    conversationId: uuid('conversation_id').notNull(),
    userId: uuid('user_id').notNull(),
    content: text().notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [conversation.id],
      name: 'message_conversation_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'message_user_id_fkey',
    }).onDelete('cascade'),
    index('message_conversation_id_created_at_idx').on(table.conversationId, table.createdAt),
  ],
);

// Final standings, written the first time a finished challenge is read (no
// scheduler). The live leaderboard is computed from reading_session.
export const leaderboardEntry = pgTable(
  'leaderboard_entry',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    challengeGroupId: uuid('challenge_group_id').notNull(),
    userId: uuid('user_id').notNull(),
    totalMinutes: integer('total_minutes').default(0).notNull(),
    // Ties share a rank; every rank-1 entry is a winner.
    rank: integer().notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    foreignKey({
      columns: [table.challengeGroupId],
      foreignColumns: [challengeGroup.id],
      name: 'leaderboard_entry_challenge_group_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [user.id],
      name: 'leaderboard_entry_user_id_fkey',
    }).onDelete('cascade'),
    unique('leaderboard_entry_challenge_group_id_user_id_key').on(
      table.challengeGroupId,
      table.userId,
    ),
  ],
);
