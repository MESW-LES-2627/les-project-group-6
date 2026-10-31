-- Keep only the most recently updated row per (user_id, book_id) before enforcing uniqueness.
DELETE FROM "reading_status" a
USING "reading_status" b
WHERE a."user_id" = b."user_id"
  AND a."book_id" = b."book_id"
  AND (a."updated_at", a."id") < (b."updated_at", b."id");--> statement-breakpoint
ALTER TABLE "reading_status" ADD CONSTRAINT "reading_status_user_id_book_id_key" UNIQUE("user_id","book_id");
