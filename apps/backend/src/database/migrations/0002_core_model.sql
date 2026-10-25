-- Core database model (docs/architecture/table_UML.md).
-- Hand-written because drizzle-kit cannot ask its rename questions in CI: tables
-- that hold data are renamed and altered in place, tables outside Core are dropped.

-- 1. Tables outside Core (book clubs, live group sessions, goals, notifications, categories).
-- Lists and the chat are recreated below with their new owner columns.
DROP TABLE "book_club_rounds", "book_clubs", "book_genres", "categories", "challenge_status", "challenges", "group_sessions", "member_sessions", "leaderboard_entries", "leaderboards", "notifications", "reading_goals", "posts", "conversations", "list_books", "lists", "member", "groups" CASCADE;--> statement-breakpoint

-- 2. Enums.
CREATE TYPE "public"."dnf_reason" AS ENUM('not-for-me', 'too-slow', 'will-try-later', 'other');--> statement-breakpoint
CREATE TYPE "public"."friendship_status" AS ENUM('pending', 'accepted', 'declined');--> statement-breakpoint
CREATE TYPE "public"."group_member_role" AS ENUM('admin', 'member');--> statement-breakpoint
CREATE TYPE "public"."group_member_status" AS ENUM('invited', 'active', 'declined', 'left');--> statement-breakpoint
CREATE TYPE "public"."reading_session_status" AS ENUM('running', 'finished');--> statement-breakpoint
CREATE TYPE "public"."reading_status_type" AS ENUM('not-started', 'in-progress', 'finished', 'did-not-finish');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('private', 'public');--> statement-breakpoint

-- 3. Singular table names, keeping the data.
ALTER TABLE "users" RENAME TO "user";--> statement-breakpoint
ALTER TABLE "user" RENAME CONSTRAINT "users_pkey" TO "user_pkey";--> statement-breakpoint
ALTER TABLE "user" RENAME CONSTRAINT "users_email_key" TO "user_email_key";--> statement-breakpoint
ALTER TABLE "user" RENAME CONSTRAINT "users_username_key" TO "user_username_key";--> statement-breakpoint
ALTER TABLE "books" RENAME TO "book";--> statement-breakpoint
ALTER TABLE "book" RENAME CONSTRAINT "books_pkey" TO "book_pkey";--> statement-breakpoint
ALTER TABLE "book" RENAME CONSTRAINT "books_isbn13_key" TO "book_isbn13_key";--> statement-breakpoint
ALTER TABLE "authors" RENAME TO "author";--> statement-breakpoint
ALTER TABLE "author" RENAME CONSTRAINT "authors_pkey" TO "author_pkey";--> statement-breakpoint
ALTER TABLE "book_authors" RENAME TO "book_author";--> statement-breakpoint
ALTER TABLE "book_author" RENAME CONSTRAINT "book_authors_pkey" TO "book_author_pkey";--> statement-breakpoint
ALTER TABLE "book_author" RENAME CONSTRAINT "book_authors_book_id_fkey" TO "book_author_book_id_fkey";--> statement-breakpoint
ALTER TABLE "book_author" RENAME CONSTRAINT "book_authors_author_id_fkey" TO "book_author_author_id_fkey";--> statement-breakpoint
ALTER TABLE "genres" RENAME TO "genre";--> statement-breakpoint
ALTER TABLE "genre" RENAME CONSTRAINT "genres_pkey" TO "genre_pkey";--> statement-breakpoint
ALTER TABLE "genre" RENAME CONSTRAINT "genres_name_key" TO "genre_name_key";--> statement-breakpoint
ALTER TABLE "friendships" RENAME TO "friendship";--> statement-breakpoint
ALTER TABLE "friendship" RENAME CONSTRAINT "friendships_pkey" TO "friendship_pkey";--> statement-breakpoint
ALTER TABLE "reviews" RENAME TO "review";--> statement-breakpoint
ALTER TABLE "review" RENAME CONSTRAINT "reviews_pkey" TO "review_pkey";--> statement-breakpoint
ALTER TABLE "review" RENAME CONSTRAINT "reviews_user_id_fkey" TO "review_user_id_fkey";--> statement-breakpoint
ALTER TABLE "review" RENAME CONSTRAINT "reviews_book_id_fkey" TO "review_book_id_fkey";--> statement-breakpoint
ALTER TABLE "reading_sessions" RENAME TO "reading_session";--> statement-breakpoint
ALTER TABLE "reading_session" RENAME CONSTRAINT "reading_sessions_pkey" TO "reading_session_pkey";--> statement-breakpoint
ALTER TABLE "reading_session" RENAME CONSTRAINT "reading_sessions_user_id_fkey" TO "reading_session_user_id_fkey";--> statement-breakpoint
ALTER TABLE "reading_session" RENAME CONSTRAINT "reading_sessions_book_id_fkey" TO "reading_session_book_id_fkey";--> statement-breakpoint

-- 4. user: profile_description, enum visibility, no streak columns (streaks are computed from sessions).
ALTER TABLE "user" RENAME COLUMN "bio" TO "profile_description";--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "streak_type", DROP COLUMN "current_streak", DROP COLUMN "longest_streak", DROP COLUMN "hit_streak";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "timezone" SET DATA TYPE varchar(64);--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "profile_visibility" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "profile_visibility" SET DATA TYPE "visibility" USING "profile_visibility"::"visibility";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "profile_visibility" SET DEFAULT 'private';--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
UPDATE "user" SET "updated_at" = "created_at";--> statement-breakpoint

-- 5. book: one optional genre, updated_at.
ALTER TABLE "book" ADD COLUMN "genre_id" uuid;--> statement-breakpoint
ALTER TABLE "book" ADD COLUMN "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
UPDATE "book" SET "updated_at" = "created_at";--> statement-breakpoint
ALTER TABLE "book" ADD CONSTRAINT "book_genre_id_fkey" FOREIGN KEY ("genre_id") REFERENCES "public"."genre"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

-- 6. friendship: role-prefixed user columns, enum status, one row per pair.
ALTER TABLE "friendship" RENAME COLUMN "requester_id" TO "requester_user_id";--> statement-breakpoint
ALTER TABLE "friendship" RENAME COLUMN "addressee_id" TO "addressee_user_id";--> statement-breakpoint
ALTER TABLE "friendship" RENAME CONSTRAINT "friendships_requester_id_fkey" TO "friendship_requester_user_id_fkey";--> statement-breakpoint
ALTER TABLE "friendship" RENAME CONSTRAINT "friendships_addressee_id_fkey" TO "friendship_addressee_user_id_fkey";--> statement-breakpoint
ALTER TABLE "friendship" ALTER COLUMN "status" SET DATA TYPE "friendship_status" USING "status"::"friendship_status";--> statement-breakpoint
ALTER TABLE "friendship" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "friendship" ADD CONSTRAINT "friendship_not_self_check" CHECK ("friendship"."requester_user_id" <> "friendship"."addressee_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "friendship_pair_key" ON "friendship" USING btree (LEAST("requester_user_id", "addressee_user_id"),GREATEST("requester_user_id", "addressee_user_id"));--> statement-breakpoint

-- 7. reading_status: enum status, DNF reason, finish date, created_at.
ALTER TABLE "reading_status" ALTER COLUMN "status" SET DATA TYPE "reading_status_type" USING "status"::"reading_status_type";--> statement-breakpoint
ALTER TABLE "reading_status" ALTER COLUMN "status" SET DEFAULT 'not-started';--> statement-breakpoint
ALTER TABLE "reading_status" ADD COLUMN "dnf_reason" "dnf_reason";--> statement-breakpoint
ALTER TABLE "reading_status" ADD COLUMN "finished_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reading_status" ADD COLUMN "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
UPDATE "reading_status" SET "created_at" = "updated_at";--> statement-breakpoint

-- 8. review: editable and soft-deleted; one live review per user and book.
ALTER TABLE "review" DROP CONSTRAINT "reviews_rating_check";--> statement-breakpoint
ALTER TABLE "review" ADD CONSTRAINT "review_rating_check" CHECK ("review"."rating" BETWEEN 1 AND 5);--> statement-breakpoint
ALTER TABLE "review" ADD COLUMN "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
ALTER TABLE "review" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
UPDATE "review" SET "updated_at" = "created_at";--> statement-breakpoint
CREATE UNIQUE INDEX "review_user_id_book_id_key" ON "review" USING btree ("user_id","book_id") WHERE "review"."deleted_at" IS NULL;--> statement-breakpoint

-- 9. reading_session: explicit status, one running session per user. Minutes come
-- from duration_seconds; pages are tracked on reading_status.
ALTER TABLE "reading_session" DROP COLUMN "counted_minutes", DROP COLUMN "pages_read";--> statement-breakpoint
ALTER TABLE "reading_session" ADD COLUMN "status" "reading_session_status" DEFAULT 'running' NOT NULL;--> statement-breakpoint
ALTER TABLE "reading_session" ADD COLUMN "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
UPDATE "reading_session" SET "status" = 'finished', "updated_at" = "ended_at" WHERE "ended_at" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "reading_session" ADD CONSTRAINT "reading_session_ended_check" CHECK (("reading_session"."status" = 'running' AND "reading_session"."ended_at" IS NULL) OR ("reading_session"."status" = 'finished' AND "reading_session"."ended_at" >= "reading_session"."started_at"));--> statement-breakpoint
CREATE UNIQUE INDEX "reading_session_one_running_key" ON "reading_session" USING btree ("user_id") WHERE "reading_session"."status" = 'running';--> statement-breakpoint
CREATE INDEX "reading_session_user_id_started_at_idx" ON "reading_session" USING btree ("user_id","started_at");--> statement-breakpoint

-- 10. Lists (folders), owned by one user.
CREATE TABLE "list" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"visibility" "visibility" DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "list_book" (
	"list_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "list_book_pkey" PRIMARY KEY("list_id","book_id")
);
--> statement-breakpoint
ALTER TABLE "list" ADD CONSTRAINT "list_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_book" ADD CONSTRAINT "list_book_list_id_fkey" FOREIGN KEY ("list_id") REFERENCES "public"."list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "list_book" ADD CONSTRAINT "list_book_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "public"."book"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint

-- 11. Challenge groups, members, chat and final standings.
CREATE TABLE "challenge_group" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "challenge_group_period_check" CHECK ("challenge_group"."end_date" >= "challenge_group"."start_date")
);
--> statement-breakpoint
CREATE TABLE "group_member" (
	"challenge_group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "group_member_role" DEFAULT 'member' NOT NULL,
	"status" "group_member_status" DEFAULT 'invited' NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"joined_at" timestamp with time zone,
	"left_at" timestamp with time zone,
	CONSTRAINT "group_member_pkey" PRIMARY KEY("challenge_group_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "conversation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_group_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "conversation_challenge_group_id_key" UNIQUE("challenge_group_id")
);
--> statement-breakpoint
CREATE TABLE "message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "leaderboard_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_group_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"total_minutes" integer DEFAULT 0 NOT NULL,
	"rank" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "leaderboard_entry_challenge_group_id_user_id_key" UNIQUE("challenge_group_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "group_member" ADD CONSTRAINT "group_member_challenge_group_id_fkey" FOREIGN KEY ("challenge_group_id") REFERENCES "public"."challenge_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_member" ADD CONSTRAINT "group_member_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation" ADD CONSTRAINT "conversation_challenge_group_id_fkey" FOREIGN KEY ("challenge_group_id") REFERENCES "public"."challenge_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_entry" ADD CONSTRAINT "leaderboard_entry_challenge_group_id_fkey" FOREIGN KEY ("challenge_group_id") REFERENCES "public"."challenge_group"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leaderboard_entry" ADD CONSTRAINT "leaderboard_entry_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "group_member_user_id_idx" ON "group_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "message_conversation_id_created_at_idx" ON "message" USING btree ("conversation_id","created_at");
