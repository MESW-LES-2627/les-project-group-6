CREATE TABLE "group_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"seq" bigserial NOT NULL,
	"group_id" uuid NOT NULL,
	"author_id" uuid,
	"client_id" uuid,
	"kind" varchar(10) NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "group_messages_seq_key" UNIQUE("seq"),
	CONSTRAINT "group_messages_author_id_client_id_key" UNIQUE("author_id","client_id"),
	CONSTRAINT "group_messages_kind_check" CHECK ("group_messages"."kind" IN ('text', 'system')),
	CONSTRAINT "group_messages_author_check" CHECK (("group_messages"."kind" = 'system') = ("group_messages"."author_id" IS NULL AND "group_messages"."client_id" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "group_messages_group_id_seq_idx" ON "group_messages" USING btree ("group_id","seq");