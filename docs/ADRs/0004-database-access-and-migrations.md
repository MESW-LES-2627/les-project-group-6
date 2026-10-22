# ADR-0004: Database Host, Access Library and Migrations (PostgreSQL, Drizzle ORM, Drizzle Kit)

- **Status:** Accepted
- **Date:** 2026-10-22
- **Deciders:** Group 6
- **Context area:** Database, persistence (`apps/backend`)

## Context

[ADR-0001](0001-choose-tech-stack.md) chose TypeScript on Node for the backend and left the database persistence library to a follow-up decision. [ADR-0002](0002-external-dependencies.md) selected Supabase for authentication but deferred database hosting.

To support core feature development, the backend requires a relational database setup with local developer isolation, reproducible migrations, and a typed query layer that aligns with the team's workflow.

## Decision

We will use:

1. **Local Database:** **PostgreSQL 17** running via Docker Compose (`docker-compose.yml`), listening on port `5432`.
2. **Production Database:** **Supabase PostgreSQL 17**, fed by the same base schema and accessed as plain Postgres using connection pooling (`pg.Pool`). No Supabase client library or Row Level Security (RLS) is used in the backend.
3. **Migration & Schema Tooling:** **Drizzle Kit** (`drizzle-kit`) to manage migrations and schema file generation from the locally hosted database. Migration files are stored in `apps/backend/database/migrations/`.
4. **Runtime Access & Queries:** **Drizzle ORM** (`drizzle-orm`) with `pg` to handle runtime database access, transactions, and querying.

This decision was chosen directly based on:
- **Accessibility for CLI scripts:** Drizzle Kit provides straightforward CLI commands (`generate`, `migrate`, `studio`) that integrate cleanly with npm scripts.
- **Simplicity:** The library stays close to SQL, avoids heavy runtime abstraction, and outputs plain `.sql` migration files.
- **Team expertise:** Matches the team's skills in TypeScript and SQL without requiring complex framework-specific configuration.

## Consequences

### Positive

- Standard `.sql` migrations are committed and versioned in `apps/backend/database/migrations/`.
- Local development runs with a single command (`docker compose up -d db`).
- Runtime queries are type-safe without hiding underlying SQL behavior.
- Drizzle Studio provides an accessible web interface for local database inspection.

### Negative / risks

- **Supabase IPv6 vs IPv4:** Supabase direct connections are IPv6-only. *Mitigation:* In deployed environments (Render, GitHub Actions), use the Supabase pooler connection string (port 5432 or 6543) which supports IPv4.
- **Supabase Inactivity Pausing:** Supabase pauses free projects after one week of inactivity. *Mitigation:* The scheduled keep-alive ping on `GET /health` runs a lightweight `SELECT 1` query to keep the database awake.

## References

- [ADR-0001: Choose the Technology Stack](0001-choose-tech-stack.md)
- [ADR-0002: External Dependencies](0002-external-dependencies.md)
- [Infrastructure Specification](../architecture/infra.md)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
