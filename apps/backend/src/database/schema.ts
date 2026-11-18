import {
  pgTable,
  unique,
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
  bigserial,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const users = pgTable(
  'users',
  {
    id: uuid().primaryKey().notNull(),
    email: varchar({ length: 255 }).notNull(),
    username: varchar({ length: 50 }).notNull(),
    displayName: varchar('display_name', { length: 255 }).notNull(),
    photoUrl: text('photo_url'),
    bio: text(),
    timezone: varchar({ length: 100 }).default('Europe/Lisbon').notNull(),
    profileVisibility: varchar('profile_visibility', { length: 20 }).default('private').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    streakType: varchar('streak_type', { length: 20 }).default('daily').notNull(),
    currentStreak: integer('current_streak').default(0).notNull(),
    longestStreak: integer('longest_streak').default(0).notNull(),
    // Last day (in the user's timezone) that counted for the streak (F-READ-04).
    lastReadDate: date('last_read_date', { mode: 'string' }),
  },
  (table) => [
    unique('users_email_key').on(table.email),
    unique('users_username_key').on(table.username),
    // Usernames are unique ignoring case (F-AUTH-01).
    uniqueIndex('users_username_lower_key').using('btree', sql`lower(${table.username})`),
  ],
);

export const friendships = pgTable(
  'friendships',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    requesterId: uuid('requester_id').notNull(),
    addresseeId: uuid('addressee_id').notNull(),
    status: varchar({ length: 20 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    respondedAt: timestamp('responded_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    foreignKey({
      columns: [table.requesterId],
      foreignColumns: [users.id],
      name: 'friendships_requester_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.addresseeId],
      foreignColumns: [users.id],
      name: 'friendships_addressee_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const books = pgTable(
  'books',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    title: text().notNull(),
    description: text(),
    isbn13: varchar({ length: 13 }),
    pageCount: integer('page_count'),
    coverUrl: text('cover_url'),
    isCommunityAdded: boolean('is_community_added').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    unique('books_isbn13_key').on(table.isbn13),
    // F-EXP-01: fuzzy title search (pg_trgm), accent- and case-insensitive. Created in 0009.
    index('books_title_trgm_idx').using('gin', sql`f_unaccent(lower(${table.title})) gin_trgm_ops`),
  ],
);

export const authors = pgTable(
  'authors',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
  },
  // F-EXP-01: fuzzy author search (pg_trgm). Created in 0009.
  (table) => [
    index('authors_name_trgm_idx').using('gin', sql`f_unaccent(lower(${table.name})) gin_trgm_ops`),
  ],
);

export const genres = pgTable(
  'genres',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
  },
  (table) => [unique('genres_name_key').on(table.name)],
);

export const readingStatus = pgTable(
  'reading_status',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    bookId: uuid('book_id').notNull(),
    status: varchar({ length: 20 }).notNull(),
    currentPage: integer('current_page').default(0).notNull(),
    startedOn: date('started_on'),
    finishedOn: date('finished_on'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'reading_status_user_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [books.id],
      name: 'reading_status_book_id_fkey',
    }).onDelete('cascade'),
    unique('reading_status_user_id_book_id_key').on(table.userId, table.bookId),
  ],
);

export const groups = pgTable(
  'groups',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    description: text().notNull(),
    /** 'challenge' or 'book-club', owned by the group kernel (see GROUP_KINDS). */
    kind: varchar({ length: 20 }).notNull(),
    adminId: uuid('admin_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.adminId],
      foreignColumns: [users.id],
      name: 'groups_admin_id_fkey',
    }).onDelete('restrict'),
  ],
);

export const reviews = pgTable(
  'reviews',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    bookId: uuid('book_id').notNull(),
    rating: integer().notNull(),
    comment: text(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'reviews_user_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [books.id],
      name: 'reviews_book_id_fkey',
    }).onDelete('cascade'),
    check('reviews_rating_check', sql`(rating >= 1) AND (rating <= 5)`),
    // F-LIB-02: one review per reader per book; saving again replaces it.
    unique('reviews_user_id_book_id_key').on(table.userId, table.bookId),
    index('reviews_book_id_created_at_idx').on(table.bookId, table.createdAt.desc()),
  ],
);

export const lists = pgTable(
  'lists',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id'),
    groupId: uuid('group_id'),
    name: text().notNull(),
    visibility: varchar({ length: 20 }).default('private').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'lists_user_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [groups.id],
      name: 'lists_group_id_fkey',
    }).onDelete('cascade'),
    check(
      'chk_list_owner',
      sql`((user_id IS NOT NULL) AND (group_id IS NULL)) OR ((user_id IS NULL) AND (group_id IS NOT NULL))`,
    ),
    // F-LIB-03: a reader's folder names are unique ignoring case. Group lists
    // (user_id null) keep their own names.
    uniqueIndex('lists_user_name_unique')
      .on(table.userId, sql`lower(${table.name})`)
      .where(sql`${table.userId} is not null`),
  ],
);

export const bookClubs = pgTable(
  'book_clubs',
  {
    groupId: uuid('group_id').primaryKey().notNull(),
    currentBookId: uuid('current_book_id'),
  },
  (table) => [
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [groups.id],
      name: 'book_clubs_group_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.currentBookId],
      foreignColumns: [books.id],
      name: 'book_clubs_current_book_id_fkey',
    }).onDelete('set null'),
  ],
);

export const categories = pgTable(
  'categories',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
  },
  (table) => [unique('categories_name_key').on(table.name)],
);

export const bookClubRounds = pgTable(
  'book_club_rounds',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    bookClubId: uuid('book_club_id').notNull(),
    roundNumber: integer('round_number').notNull(),
    start: date().notNull(),
    deadline: date().notNull(),
    status: varchar({ length: 20 }).default('pending').notNull(),
    bookId: uuid('book_id').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.bookClubId],
      foreignColumns: [bookClubs.groupId],
      name: 'book_club_rounds_book_club_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [books.id],
      name: 'book_club_rounds_book_id_fkey',
    }).onDelete('restrict'),
    unique('book_club_rounds_club_number_key').on(table.bookClubId, table.roundNumber),
  ],
);

export const challenges = pgTable(
  'challenges',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity({
      name: 'challenges_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 2147483647,
      cache: 1,
    }),
    groupId: uuid('group_id').notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    winMetric: varchar('win_metric', { length: 20 }).notNull(),
    metricGoal: integer('metric_goal').notNull(),
    targetGenreId: uuid('target_genre_id'),
    targetCategoryId: uuid('target_category_id'),
    targetAuthorId: uuid('target_author_id'),
  },
  (table) => [
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [groups.id],
      name: 'challenges_group_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.targetGenreId],
      foreignColumns: [genres.id],
      name: 'challenges_target_genre_id_fkey',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.targetCategoryId],
      foreignColumns: [categories.id],
      name: 'challenges_target_category_id_fkey',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.targetAuthorId],
      foreignColumns: [authors.id],
      name: 'challenges_target_author_id_fkey',
    }).onDelete('set null'),
  ],
);

export const challengeStatus = pgTable(
  'challenge_status',
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity({
      name: 'challenge_status_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 2147483647,
      cache: 1,
    }),
    userId: uuid('user_id').notNull(),
    challengeId: integer('challenge_id').notNull(),
    code: varchar({ length: 20 }).notNull(),
    progress: integer().default(0).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'challenge_status_user_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.challengeId],
      foreignColumns: [challenges.id],
      name: 'challenge_status_challenge_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const groupSessions = pgTable(
  'group_sessions',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    groupId: uuid('group_id').notNull(),
    hostId: uuid('host_id').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true, mode: 'string' }),
    status: varchar({ length: 20 }).default('open').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [groups.id],
      name: 'group_sessions_group_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.hostId],
      foreignColumns: [users.id],
      name: 'group_sessions_host_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const memberSessions = pgTable(
  'member_sessions',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    groupSessionId: uuid('group_session_id').notNull(),
    userId: uuid('user_id').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    leftAt: timestamp('left_at', { withTimezone: true, mode: 'string' }),
    pagesRead: integer('pages_read').default(0).notNull(),
    bookId: uuid('book_id').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.groupSessionId],
      foreignColumns: [groupSessions.id],
      name: 'member_sessions_group_session_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'member_sessions_user_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [books.id],
      name: 'member_sessions_book_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const leaderboards = pgTable(
  'leaderboards',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    groupId: uuid('group_id').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    metric: varchar({ length: 20 }).notNull(),
    targetGenreId: uuid('target_genre_id'),
    targetCategoryId: uuid('target_category_id'),
    targetAuthorId: uuid('target_author_id'),
  },
  (table) => [
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [groups.id],
      name: 'leaderboards_group_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.targetGenreId],
      foreignColumns: [genres.id],
      name: 'leaderboards_target_genre_id_fkey',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.targetCategoryId],
      foreignColumns: [categories.id],
      name: 'leaderboards_target_category_id_fkey',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.targetAuthorId],
      foreignColumns: [authors.id],
      name: 'leaderboards_target_author_id_fkey',
    }).onDelete('set null'),
  ],
);

export const readingSessions = pgTable(
  'reading_sessions',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    bookId: uuid('book_id').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true, mode: 'string' }),
    durationSeconds: integer('duration_seconds').default(0).notNull(),
    countedMinutes: integer('counted_minutes').default(0).notNull(),
    pagesRead: integer('pages_read').default(0).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'reading_sessions_user_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [books.id],
      name: 'reading_sessions_book_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const conversations = pgTable(
  'conversations',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    groupId: uuid('group_id').notNull(),
    name: text().notNull(),
    description: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [groups.id],
      name: 'conversations_group_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const posts = pgTable(
  'posts',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    authorId: uuid('author_id').notNull(),
    conversationId: uuid('conversation_id'),
    roundId: uuid('round_id'),
    content: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.authorId],
      foreignColumns: [users.id],
      name: 'posts_author_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [conversations.id],
      name: 'posts_conversation_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.roundId],
      foreignColumns: [bookClubRounds.id],
      name: 'posts_round_id_fkey',
    }).onDelete('cascade'),
    check(
      'chk_post_parent',
      sql`((conversation_id IS NOT NULL) AND (round_id IS NULL)) OR ((conversation_id IS NULL) AND (round_id IS NOT NULL))`,
    ),
  ],
);

export const readingGoals = pgTable(
  'reading_goals',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    targetDate: date('target_date').notNull(),
    metric: varchar({ length: 20 }).notNull(),
    value: integer().notNull(),
    targetGenreId: uuid('target_genre_id'),
    targetCategoryId: uuid('target_category_id'),
    targetAuthorId: uuid('target_author_id'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'reading_goals_user_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.targetGenreId],
      foreignColumns: [genres.id],
      name: 'reading_goals_target_genre_id_fkey',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.targetCategoryId],
      foreignColumns: [categories.id],
      name: 'reading_goals_target_category_id_fkey',
    }).onDelete('set null'),
    foreignKey({
      columns: [table.targetAuthorId],
      foreignColumns: [authors.id],
      name: 'reading_goals_target_author_id_fkey',
    }).onDelete('set null'),
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    type: varchar({ length: 50 }).notNull(),
    targetId: uuid('target_id').notNull(),
    isRead: boolean('is_read').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'notifications_user_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const bookAuthors = pgTable(
  'book_authors',
  {
    bookId: uuid('book_id').notNull(),
    authorId: uuid('author_id').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [books.id],
      name: 'book_authors_book_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.authorId],
      foreignColumns: [authors.id],
      name: 'book_authors_author_id_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.bookId, table.authorId], name: 'book_authors_pkey' }),
  ],
);

export const bookGenres = pgTable(
  'book_genres',
  {
    bookId: uuid('book_id').notNull(),
    genreId: uuid('genre_id').notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [books.id],
      name: 'book_genres_book_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.genreId],
      foreignColumns: [genres.id],
      name: 'book_genres_genre_id_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.bookId, table.genreId], name: 'book_genres_pkey' }),
  ],
);

export const listBooks = pgTable(
  'list_books',
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
      foreignColumns: [lists.id],
      name: 'list_books_list_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [books.id],
      name: 'list_books_book_id_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.listId, table.bookId], name: 'list_books_pkey' }),
  ],
);

export const member = pgTable(
  'member',
  {
    groupId: uuid('group_id').notNull(),
    userId: uuid('user_id').notNull(),
    role: varchar({ length: 20 }).default('member').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [groups.id],
      name: 'member_group_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'member_user_id_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.groupId, table.userId], name: 'member_pkey' }),
  ],
);

export const leaderboardEntries = pgTable(
  'leaderboard_entries',
  {
    leaderboardId: uuid('leaderboard_id').notNull(),
    userId: uuid('user_id').notNull(),
    score: integer().default(0).notNull(),
    rank: integer().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.leaderboardId],
      foreignColumns: [leaderboards.id],
      name: 'leaderboard_entries_leaderboard_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'leaderboard_entries_user_id_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.leaderboardId, table.userId], name: 'leaderboard_entries_pkey' }),
  ],
);

// Group chat (ADR-0006). `seq` orders messages and is the catch-up cursor;
// (author_id, client_id) makes a retried send idempotent.
export const groupMessages = pgTable(
  'group_messages',
  {
    id: uuid().primaryKey().notNull(),
    seq: bigserial({ mode: 'number' }).notNull(),
    groupId: uuid('group_id').notNull(),
    authorId: uuid('author_id'),
    clientId: uuid('client_id'),
    kind: varchar({ length: 10 }).notNull(),
    body: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [groups.id],
      name: 'group_messages_group_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.authorId],
      foreignColumns: [users.id],
      name: 'group_messages_author_id_fkey',
    }).onDelete('cascade'),
    unique('group_messages_seq_key').on(table.seq),
    unique('group_messages_author_id_client_id_key').on(table.authorId, table.clientId),
    index('group_messages_group_id_seq_idx').on(table.groupId, table.seq),
    check('group_messages_kind_check', sql`${table.kind} IN ('text', 'system')`),
    check(
      'group_messages_author_check',
      sql`(${table.kind} = 'system') = (${table.authorId} IS NULL AND ${table.clientId} IS NULL)`,
    ),
  ],
);

export const groupInvites = pgTable(
  'group_invites',
  {
    id: uuid().primaryKey().notNull(),
    groupId: uuid('group_id').notNull(),
    inviteeId: uuid('invitee_id').notNull(),
    inviterId: uuid('inviter_id').notNull(),
    status: varchar({ length: 20 }).default('pending').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    respondedAt: timestamp('responded_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [groups.id],
      name: 'group_invites_group_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.inviteeId],
      foreignColumns: [users.id],
      name: 'group_invites_invitee_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.inviterId],
      foreignColumns: [users.id],
      name: 'group_invites_inviter_id_fkey',
    }).onDelete('cascade'),
    uniqueIndex('group_invites_one_pending_idx')
      .on(table.groupId, table.inviteeId)
      .where(sql`status = 'pending'`),
  ],
);

export const bookClubPolls = pgTable(
  'book_club_polls',
  {
    id: uuid().primaryKey().notNull(),
    groupId: uuid('group_id').notNull(),
    closesAt: timestamp('closes_at', { withTimezone: true, mode: 'string' }).notNull(),
    anonymous: boolean().default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [
    foreignKey({
      columns: [table.groupId],
      foreignColumns: [bookClubs.groupId],
      name: 'book_club_polls_group_id_fkey',
    }).onDelete('cascade'),
  ],
);

export const bookClubProposals = pgTable(
  'book_club_proposals',
  {
    id: uuid().primaryKey().notNull(),
    pollId: uuid('poll_id').notNull(),
    bookId: uuid('book_id').notNull(),
    proposedBy: uuid('proposed_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.pollId],
      foreignColumns: [bookClubPolls.id],
      name: 'book_club_proposals_poll_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [books.id],
      name: 'book_club_proposals_book_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.proposedBy],
      foreignColumns: [users.id],
      name: 'book_club_proposals_proposed_by_fkey',
    }).onDelete('cascade'),
    unique('book_club_proposals_poll_book_key').on(table.pollId, table.bookId),
  ],
);

export const bookClubVotes = pgTable(
  'book_club_votes',
  {
    pollId: uuid('poll_id').notNull(),
    userId: uuid('user_id').notNull(),
    proposalId: uuid('proposal_id').notNull(),
    castAt: timestamp('cast_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.pollId],
      foreignColumns: [bookClubPolls.id],
      name: 'book_club_votes_poll_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'book_club_votes_user_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.proposalId],
      foreignColumns: [bookClubProposals.id],
      name: 'book_club_votes_proposal_id_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.pollId, table.userId], name: 'book_club_votes_pkey' }),
  ],
);

// F-LIB-04: a reader's free tags ("borrowed", "audiobook"). Names are stored in
// lower case, so one reader cannot have the same tag twice.
export const userTags = pgTable(
  'user_tags',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    name: varchar({ length: 40 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'user_tags_user_id_fkey',
    }).onDelete('cascade'),
    unique('user_tags_user_name_key').on(table.userId, table.name),
  ],
);

export const bookTags = pgTable(
  'book_tags',
  {
    tagId: uuid('tag_id').notNull(),
    bookId: uuid('book_id').notNull(),
    addedAt: timestamp('added_at', { withTimezone: true, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.tagId],
      foreignColumns: [userTags.id],
      name: 'book_tags_tag_id_fkey',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.bookId],
      foreignColumns: [books.id],
      name: 'book_tags_book_id_fkey',
    }).onDelete('cascade'),
    primaryKey({ columns: [table.tagId, table.bookId], name: 'book_tags_pkey' }),
    index('book_tags_book_id_idx').on(table.bookId),
  ],
);
