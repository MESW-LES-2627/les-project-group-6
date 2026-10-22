import { relations } from 'drizzle-orm/relations';
import {
  users,
  friendships,
  readingStatus,
  books,
  groups,
  reviews,
  lists,
  bookClubs,
  bookClubRounds,
  challenges,
  genres,
  categories,
  authors,
  challengeStatus,
  groupSessions,
  memberSessions,
  leaderboards,
  readingSessions,
  conversations,
  posts,
  readingGoals,
  notifications,
  bookAuthors,
  bookGenres,
  listBooks,
  member,
  leaderboardEntries,
} from './schema.js';

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  user_requesterId: one(users, {
    fields: [friendships.requesterId],
    references: [users.id],
    relationName: 'friendships_requesterId_users_id',
  }),
  user_addresseeId: one(users, {
    fields: [friendships.addresseeId],
    references: [users.id],
    relationName: 'friendships_addresseeId_users_id',
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  friendships_requesterId: many(friendships, {
    relationName: 'friendships_requesterId_users_id',
  }),
  friendships_addresseeId: many(friendships, {
    relationName: 'friendships_addresseeId_users_id',
  }),
  readingStatuses: many(readingStatus),
  groups: many(groups),
  reviews: many(reviews),
  lists: many(lists),
  challengeStatuses: many(challengeStatus),
  groupSessions: many(groupSessions),
  memberSessions: many(memberSessions),
  readingSessions: many(readingSessions),
  posts: many(posts),
  readingGoals: many(readingGoals),
  notifications: many(notifications),
  members: many(member),
  leaderboardEntries: many(leaderboardEntries),
}));

export const readingStatusRelations = relations(readingStatus, ({ one }) => ({
  user: one(users, {
    fields: [readingStatus.userId],
    references: [users.id],
  }),
  book: one(books, {
    fields: [readingStatus.bookId],
    references: [books.id],
  }),
}));

export const booksRelations = relations(books, ({ many }) => ({
  readingStatuses: many(readingStatus),
  reviews: many(reviews),
  bookClubs: many(bookClubs),
  memberSessions: many(memberSessions),
  readingSessions: many(readingSessions),
  bookAuthors: many(bookAuthors),
  bookGenres: many(bookGenres),
  listBooks: many(listBooks),
}));

export const groupsRelations = relations(groups, ({ one, many }) => ({
  user: one(users, {
    fields: [groups.adminId],
    references: [users.id],
  }),
  lists: many(lists),
  bookClubs: many(bookClubs),
  challenges: many(challenges),
  groupSessions: many(groupSessions),
  leaderboards: many(leaderboards),
  conversations: many(conversations),
  members: many(member),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  user: one(users, {
    fields: [reviews.userId],
    references: [users.id],
  }),
  book: one(books, {
    fields: [reviews.bookId],
    references: [books.id],
  }),
}));

export const listsRelations = relations(lists, ({ one, many }) => ({
  user: one(users, {
    fields: [lists.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [lists.groupId],
    references: [groups.id],
  }),
  listBooks: many(listBooks),
}));

export const bookClubsRelations = relations(bookClubs, ({ one, many }) => ({
  group: one(groups, {
    fields: [bookClubs.groupId],
    references: [groups.id],
  }),
  book: one(books, {
    fields: [bookClubs.currentBookId],
    references: [books.id],
  }),
  bookClubRounds: many(bookClubRounds),
}));

export const bookClubRoundsRelations = relations(bookClubRounds, ({ one, many }) => ({
  bookClub: one(bookClubs, {
    fields: [bookClubRounds.bookClubId],
    references: [bookClubs.groupId],
  }),
  posts: many(posts),
}));

export const challengesRelations = relations(challenges, ({ one, many }) => ({
  group: one(groups, {
    fields: [challenges.groupId],
    references: [groups.id],
  }),
  genre: one(genres, {
    fields: [challenges.targetGenreId],
    references: [genres.id],
  }),
  category: one(categories, {
    fields: [challenges.targetCategoryId],
    references: [categories.id],
  }),
  author: one(authors, {
    fields: [challenges.targetAuthorId],
    references: [authors.id],
  }),
  challengeStatuses: many(challengeStatus),
}));

export const genresRelations = relations(genres, ({ many }) => ({
  challenges: many(challenges),
  leaderboards: many(leaderboards),
  readingGoals: many(readingGoals),
  bookGenres: many(bookGenres),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  challenges: many(challenges),
  leaderboards: many(leaderboards),
  readingGoals: many(readingGoals),
}));

export const authorsRelations = relations(authors, ({ many }) => ({
  challenges: many(challenges),
  leaderboards: many(leaderboards),
  readingGoals: many(readingGoals),
  bookAuthors: many(bookAuthors),
}));

export const challengeStatusRelations = relations(challengeStatus, ({ one }) => ({
  user: one(users, {
    fields: [challengeStatus.userId],
    references: [users.id],
  }),
  challenge: one(challenges, {
    fields: [challengeStatus.challengeId],
    references: [challenges.id],
  }),
}));

export const groupSessionsRelations = relations(groupSessions, ({ one, many }) => ({
  group: one(groups, {
    fields: [groupSessions.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [groupSessions.hostId],
    references: [users.id],
  }),
  memberSessions: many(memberSessions),
}));

export const memberSessionsRelations = relations(memberSessions, ({ one }) => ({
  groupSession: one(groupSessions, {
    fields: [memberSessions.groupSessionId],
    references: [groupSessions.id],
  }),
  user: one(users, {
    fields: [memberSessions.userId],
    references: [users.id],
  }),
  book: one(books, {
    fields: [memberSessions.bookId],
    references: [books.id],
  }),
}));

export const leaderboardsRelations = relations(leaderboards, ({ one, many }) => ({
  group: one(groups, {
    fields: [leaderboards.groupId],
    references: [groups.id],
  }),
  genre: one(genres, {
    fields: [leaderboards.targetGenreId],
    references: [genres.id],
  }),
  category: one(categories, {
    fields: [leaderboards.targetCategoryId],
    references: [categories.id],
  }),
  author: one(authors, {
    fields: [leaderboards.targetAuthorId],
    references: [authors.id],
  }),
  leaderboardEntries: many(leaderboardEntries),
}));

export const readingSessionsRelations = relations(readingSessions, ({ one }) => ({
  user: one(users, {
    fields: [readingSessions.userId],
    references: [users.id],
  }),
  book: one(books, {
    fields: [readingSessions.bookId],
    references: [books.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  group: one(groups, {
    fields: [conversations.groupId],
    references: [groups.id],
  }),
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  user: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  conversation: one(conversations, {
    fields: [posts.conversationId],
    references: [conversations.id],
  }),
  bookClubRound: one(bookClubRounds, {
    fields: [posts.roundId],
    references: [bookClubRounds.id],
  }),
}));

export const readingGoalsRelations = relations(readingGoals, ({ one }) => ({
  user: one(users, {
    fields: [readingGoals.userId],
    references: [users.id],
  }),
  genre: one(genres, {
    fields: [readingGoals.targetGenreId],
    references: [genres.id],
  }),
  category: one(categories, {
    fields: [readingGoals.targetCategoryId],
    references: [categories.id],
  }),
  author: one(authors, {
    fields: [readingGoals.targetAuthorId],
    references: [authors.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const bookAuthorsRelations = relations(bookAuthors, ({ one }) => ({
  book: one(books, {
    fields: [bookAuthors.bookId],
    references: [books.id],
  }),
  author: one(authors, {
    fields: [bookAuthors.authorId],
    references: [authors.id],
  }),
}));

export const bookGenresRelations = relations(bookGenres, ({ one }) => ({
  book: one(books, {
    fields: [bookGenres.bookId],
    references: [books.id],
  }),
  genre: one(genres, {
    fields: [bookGenres.genreId],
    references: [genres.id],
  }),
}));

export const listBooksRelations = relations(listBooks, ({ one }) => ({
  list: one(lists, {
    fields: [listBooks.listId],
    references: [lists.id],
  }),
  book: one(books, {
    fields: [listBooks.bookId],
    references: [books.id],
  }),
}));

export const memberRelations = relations(member, ({ one }) => ({
  group: one(groups, {
    fields: [member.groupId],
    references: [groups.id],
  }),
  user: one(users, {
    fields: [member.userId],
    references: [users.id],
  }),
}));

export const leaderboardEntriesRelations = relations(leaderboardEntries, ({ one }) => ({
  leaderboard: one(leaderboards, {
    fields: [leaderboardEntries.leaderboardId],
    references: [leaderboards.id],
  }),
  user: one(users, {
    fields: [leaderboardEntries.userId],
    references: [users.id],
  }),
}));
