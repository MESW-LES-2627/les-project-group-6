-- Keep only the newest review per (user_id, book_id) before enforcing uniqueness.
DELETE FROM "reviews" a
USING "reviews" b
WHERE a."user_id" = b."user_id"
  AND a."book_id" = b."book_id"
  AND (a."created_at", a."id") < (b."created_at", b."id");--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
CREATE INDEX "reviews_book_id_created_at_idx" ON "reviews" USING btree ("book_id","created_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_book_id_key" UNIQUE("user_id","book_id");