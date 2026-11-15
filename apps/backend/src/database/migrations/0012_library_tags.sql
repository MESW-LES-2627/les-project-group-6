CREATE TABLE "book_tags" (
	"tag_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "book_tags_pkey" PRIMARY KEY("tag_id","book_id")
);
--> statement-breakpoint
CREATE TABLE "user_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(40) NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "user_tags_user_name_key" UNIQUE("user_id","name")
);
--> statement-breakpoint
ALTER TABLE "book_tags" ADD CONSTRAINT "book_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."user_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_tags" ADD CONSTRAINT "book_tags_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tags" ADD CONSTRAINT "user_tags_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "book_tags_book_id_idx" ON "book_tags" USING btree ("book_id");--> statement-breakpoint
-- Keep the deny-by-default posture of 0005 for the new tables.
ALTER TABLE "user_tags" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "book_tags" ENABLE ROW LEVEL SECURITY;
