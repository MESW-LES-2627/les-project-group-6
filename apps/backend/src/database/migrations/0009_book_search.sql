-- F-EXP-01: fuzzy book search by title and author (pg_trgm), ignoring case and accents.
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS unaccent;--> statement-breakpoint
-- unaccent() is STABLE, so it cannot be used in an index. f_unaccent names its
-- dictionary explicitly and is IMMUTABLE. Supabase installs extensions in the
-- `extensions` schema and local Postgres in `public`, so both schemas are
-- looked up instead of hard-coded.
DO $$
DECLARE
  unaccent_schema text;
  trgm_schema text;
BEGIN
  SELECT n.nspname INTO unaccent_schema
    FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'unaccent';
  SELECT n.nspname INTO trgm_schema
    FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_trgm';

  EXECUTE format(
    'CREATE OR REPLACE FUNCTION public.f_unaccent(text) RETURNS text '
      || 'LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT AS %L',
    format('SELECT %I.unaccent(%L::regdictionary, $1)', unaccent_schema, unaccent_schema || '.unaccent')
  );
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS books_title_trgm_idx ON public.books '
      || 'USING gin (public.f_unaccent(lower(title)) %I.gin_trgm_ops)',
    trgm_schema
  );
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS authors_name_trgm_idx ON public.authors '
      || 'USING gin (public.f_unaccent(lower(name)) %I.gin_trgm_ops)',
    trgm_schema
  );
END $$;
