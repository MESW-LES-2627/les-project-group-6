-- Supabase exposes the public schema through its REST API (PostgREST) to the
-- anon and authenticated roles, and the browser has the publishable key. The
-- app tables are only meant to be reached through our Express API, which
-- connects as the table owner (it bypasses RLS and keeps its privileges).
--
-- 1. Row level security on every app table, with no policies: deny by default.
-- 2. Revoke the Supabase API roles' table and sequence privileges, now and for
--    tables created later by this role. Skipped where the roles do not exist
--    (local Docker and CI Postgres).
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
     AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
  END IF;
END $$;
