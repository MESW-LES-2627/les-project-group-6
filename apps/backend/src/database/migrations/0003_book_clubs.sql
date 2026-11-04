CREATE TABLE "book_club_polls" (
	"id" uuid PRIMARY KEY NOT NULL,
	"group_id" uuid NOT NULL,
	"closes_at" timestamp with time zone NOT NULL,
	"anonymous" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"closed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "book_club_proposals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"poll_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"proposed_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "book_club_proposals_poll_book_key" UNIQUE("poll_id","book_id")
);
--> statement-breakpoint
CREATE TABLE "book_club_votes" (
	"poll_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"proposal_id" uuid NOT NULL,
	"cast_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "book_club_votes_pkey" PRIMARY KEY("poll_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "group_invites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"group_id" uuid NOT NULL,
	"invitee_id" uuid NOT NULL,
	"inviter_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "book_club_rounds" ADD COLUMN "book_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "book_club_polls" ADD CONSTRAINT "book_club_polls_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."book_clubs"("group_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_club_proposals" ADD CONSTRAINT "book_club_proposals_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "public"."book_club_polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_club_proposals" ADD CONSTRAINT "book_club_proposals_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_club_proposals" ADD CONSTRAINT "book_club_proposals_proposed_by_fkey" FOREIGN KEY ("proposed_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_club_votes" ADD CONSTRAINT "book_club_votes_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "public"."book_club_polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_club_votes" ADD CONSTRAINT "book_club_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_club_votes" ADD CONSTRAINT "book_club_votes_proposal_id_fkey" FOREIGN KEY ("proposal_id") REFERENCES "public"."book_club_proposals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invites" ADD CONSTRAINT "group_invites_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invites" ADD CONSTRAINT "group_invites_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_invites" ADD CONSTRAINT "group_invites_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "group_invites_one_pending_idx" ON "group_invites" USING btree ("group_id","invitee_id") WHERE status = 'pending';--> statement-breakpoint
ALTER TABLE "book_club_rounds" ADD CONSTRAINT "book_club_rounds_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_club_rounds" ADD CONSTRAINT "book_club_rounds_club_number_key" UNIQUE("book_club_id","round_number");