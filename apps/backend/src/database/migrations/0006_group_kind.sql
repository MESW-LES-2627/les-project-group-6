-- The group kernel owns the kind of each group, instead of finding it by
-- looking for a book_clubs row. Existing groups get their kind from that row.
ALTER TABLE "groups" ADD COLUMN "kind" varchar(20);--> statement-breakpoint
UPDATE "groups" SET "kind" = CASE
  WHEN EXISTS (SELECT 1 FROM "book_clubs" WHERE "book_clubs"."group_id" = "groups"."id") THEN 'book-club'
  ELSE 'challenge'
END;--> statement-breakpoint
ALTER TABLE "groups" ALTER COLUMN "kind" SET NOT NULL;
