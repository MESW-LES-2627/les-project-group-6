ALTER TABLE "reading_status" ADD COLUMN "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL;--> statement-breakpoint
UPDATE "reading_status" SET "created_at" = "updated_at";
