-- F-READ-04: the streak stores the last day that counted instead of a `hit_streak` flag.
-- The flag was never reset, so the streak could not grow past 1 (PR #160 review).
ALTER TABLE "users" ADD COLUMN "last_read_date" date;--> statement-breakpoint
-- Backfill from the last timed session of 5+ minutes, as a day in the reader's timezone.
UPDATE "users" u
SET "last_read_date" = (
	SELECT max(("rs"."ended_at" AT TIME ZONE u."timezone")::date)
	FROM "reading_sessions" "rs"
	WHERE "rs"."user_id" = u."id" AND "rs"."ended_at" IS NOT NULL AND "rs"."counted_minutes" >= 5
);--> statement-breakpoint
-- A stored streak with no reading day behind it cannot be trusted; it restarts on the next read.
UPDATE "users" SET "current_streak" = 0 WHERE "last_read_date" IS NULL;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "hit_streak";
