-- #143: authors.name had no unique constraint, so two concurrent imports could
-- insert the same author twice. Merge existing duplicates (same name ignoring
-- case and accents) into the oldest-looking row, then enforce uniqueness.
CREATE TEMP TABLE author_merge ON COMMIT DROP AS
SELECT id AS dup_id, keep_id
FROM (
  SELECT id,
         first_value(id) OVER (PARTITION BY f_unaccent(lower(name)) ORDER BY id) AS keep_id
  FROM authors
) ranked
WHERE id <> keep_id;
--> statement-breakpoint
INSERT INTO book_authors (book_id, author_id)
SELECT ba.book_id, m.keep_id FROM book_authors ba JOIN author_merge m ON m.dup_id = ba.author_id
ON CONFLICT DO NOTHING;
--> statement-breakpoint
UPDATE challenges c SET target_author_id = m.keep_id FROM author_merge m WHERE c.target_author_id = m.dup_id;
--> statement-breakpoint
UPDATE leaderboards l SET target_author_id = m.keep_id FROM author_merge m WHERE l.target_author_id = m.dup_id;
--> statement-breakpoint
UPDATE reading_goals g SET target_author_id = m.keep_id FROM author_merge m WHERE g.target_author_id = m.dup_id;
--> statement-breakpoint
DELETE FROM authors a USING author_merge m WHERE a.id = m.dup_id;
--> statement-breakpoint
CREATE UNIQUE INDEX "authors_name_normalized_key" ON "authors" USING btree (f_unaccent(lower("name")));
