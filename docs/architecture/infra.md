# Infrastructure

Draft v0.1 · 2026-10-17

What we run, where it runs, and how it is deployed. This covers **Core** (sprints 1 and 2, see [features_priority.md](../product/features_priority.md)); pieces needed later are listed at the end. Library choices (HTTP layer, database access) are not covered here.

---

## Overview

```
                    ┌──────────────────────────┐
  browser ─────────▶│ Frontend (Vue SPA)       │  static files: Vercel / Netlify
     │              └──────────────────────────┘
     │ login (supabase-js)
     ├────────────────────────────▶ Supabase Auth ──▶ sends password-reset email
     │ REST + JWT
     ▼
  ┌──────────────────────────┐      ┌──────────────────────┐
  │ Backend (Node, our code) │─────▶│ Postgres (Supabase)  │
  │ Render web service       │      └──────────────────────┘
  └──────────────────────────┘
     ├──▶ Supabase Auth JWKS  (verify tokens)
     └──▶ Open Library API    (book search and metadata)
```

## Pieces needed for Core

| # | Piece | What it is | Where | Cost | Owner |
|---|---|---|---|---|---|
| 1 | **Database** | Postgres | Supabase *(to confirm)* | Free tier | Us: schema and migrations |
| 2 | **Backend server** | One long-running Node process serving the REST API | Render web service | Free tier | Us |
| 3 | **Frontend hosting** | Static files of the Vue build | Vercel or Netlify | Free tier | Us: only the build |
| 4 | Authentication | Accounts, sessions, password reset email | Supabase Auth ([ADR-0002](../ADRs/0002-external-dependencies.md)) | Free tier | External |
| 5 | Book data | Search and metadata | Open Library API ([ADR-0002](../ADRs/0002-external-dependencies.md)) | Free, no key | External |

Free-tier limits change often. Check them again before relying on them.

## Decisions

### A live public URL at every iteration

The class needs a working public URL at the end of each iteration, so a local demo is not enough. Every merge to `main` deploys automatically (see [Deployment](#deployment-cicd)).

### No background jobs: everything is computed on read

The app is reachable 24/7, but no feature in Core needs a process that does work while nobody is using it. We store only the raw facts (sessions, library entries, friendships, groups) and calculate every derived value when it is read:

| Value | Calculated from |
|---|---|
| Streak status and history | Stored directly on `User` (`streak_type`, `current_streak`, `longest_streak`, `hit_streak`), updated whenever a qualifying session (>= 5 minutes) finishes in the user's timezone |
| Total minutes, books read | `reading_sessions` and `reading_status` |
| Challenge status (scheduled, active, finished) | `start_date`, `end_date` and the current time |
| Leaderboard | Sessions inside the challenge period, from current members |
| Winners and "challenges won" | The same leaderboard once the challenge has ended |

- *Why:* no scheduler to run or monitor, no "midnight job" to close challenges, and the backend stays stateless, so a host that sleeps when idle still works.
- *Consequence:* Streak fields are maintained on the `User` profile at session completion. Aggregated totals (such as total counted minutes, books read, challenges won) are computed dynamically on read without background jobs.
- *Rejected:* scheduled background workers to calculate streaks or close challenges.

Known edge cases:

1. **Results could change after a challenge ends** if a member deletes a session. *Proposed:* deleting a session that counted in a finished challenge is blocked.
2. **Changing timezone recalculates past streaks**, because old sessions may fall on different days. *Proposed:* accepted, since it is rare and harmless.

### Days are counted in the user's timezone

Each user has a `timezone` (IANA name, e.g. `Europe/Lisbon`), taken from the browser at sign-up (`Intl.DateTimeFormat().resolvedOptions().timeZone`) and editable in settings. Streaks and "today" are calculated in that timezone. Timestamps are stored in UTC.

### Supabase handles identity, our database owns the user

Supabase Auth only knows who the user is (email, password, session). Everything else (username, profile, timezone, sessions, library, groups) lives in our own `users` table, which uses **the same UUID** as the Supabase user.

```
auth.users (Supabase, never touched)          users (ours)
┌──────────────────────┐                      ┌────────────────────────────────┐
│ id  uuid  ───────────┼──── same value ─────▶│ id  uuid PK                    │
│ email                │                      │ username UK                    │
│ encrypted_password   │                      │ display_name, bio, photo_url   │
│ ...                  │                      │ timezone                       │
└──────────────────────┘                      │ profile_visibility, ...        │
                                              └────────────────────────────────┘
                                                 ▲ reading_sessions.user_id
                                                 ▲ reading_status.user_id
                                                 ▲ member.user_id ...
```

How a request is authenticated:

1. The frontend logs in with `supabase-js` and receives a JWT. Its `sub` claim is the Supabase user ID.
2. Every API call sends `Authorization: Bearer <jwt>`.
3. The backend's `SupabaseAuthProvider` verifies the token with Supabase's public keys (JWKS) and returns the user ID.
4. An auth middleware loads our `User` by that ID and attaches it to the request. Services and repositories only see our `User`, never Supabase.

Creating our user row: right after sign-up, the frontend calls `POST /me { username, displayName, timezone }`. The backend inserts the `users` row and checks that the username is unique (F-AUTH-01). A logged-in user with no `users` row is sent back to this step, which also covers an interrupted sign-up.

*Note:* As specified in [table_UML.md](table_UML.md), `User` stores application profile fields and `timezone`, while passwords and tokens are handled externally by Supabase Auth.

### HTTP

- **REST with JSON over HTTPS** between the frontend and the backend.
- The frontend and the backend are on different domains, so the backend allows the frontend origin with **CORS**.
- **Reading timer:** starting a session saves `started_at` on the server, and stopping it calculates the duration on the server. The client only displays a ticking clock. This is what lets a session survive a closed tab (F-READ-01), and it prevents the client from sending made-up durations.
- **No real-time or WebSockets in Core.** Text chat (Extras) starts with polling every few seconds, or Server-Sent Events.

## Environments

| Environment | Frontend | Backend | Database |
|---|---|---|---|
| **Local** | `localhost` dev server | `localhost` Node process | Dev database *(to decide: shared Supabase dev project, or Supabase CLI in Docker)* |
| **Production** | Vercel or Netlify | Render | Supabase production project |

No staging environment: for five people over two months, it costs more than it gives.

## Deployment (CI/CD)

GitHub Actions:

- **On every pull request:** lint, type check and tests for the frontend and the backend.
- **On merge to `main`:** apply the database migrations, deploy the backend and deploy the frontend.
- **Keep-alive (scheduled, every 10 minutes):** call the backend's `GET /health`. Render's free service sleeps after about 15 idle minutes (the first request then takes 30–60 s), and a Supabase free project pauses after about a week of inactivity. `/health` runs a small database query, so one ping keeps both awake.

### Database migrations

The schema is changed only through SQL migration files in the repository, applied in order, so every environment has the same schema. The tool is chosen together with the database access library.

### Secrets and configuration

- Supabase URL and keys and `DATABASE_URL` are kept in the hosts' environment settings and in GitHub Actions secrets. They are never committed.
- `.env.example` in each app lists the variables needed to run it locally.

## Not needed in Core

| Piece | Why not yet | When and what |
|---|---|---|
| Scheduler or cron | Everything is computed on read | Optional features (retrospectives, nudges, "streak at risk" emails): a daily GitHub Actions cron or Supabase `pg_cron` |
| File storage | Covers come from Open Library or are the default cover; profile photos and chat media are not in Core | Supabase Storage when photos, cover upload or chat media are built |
| Our own email service | Supabase sends the password reset email. Its built-in sender allows only a few emails per hour, which is enough for a demo | Resend behind a `Notifier` interface, if email notifications are built ([ADR-0002](../ADRs/0002-external-dependencies.md)) |
| Real-time | No live feature in Core | Polling or SSE for chat; revisit for live reading rooms (F-GRP-09) |
| Cache, queue, load balancer, containers in production | Not needed at our scale | Only if a real need appears |

## Open decisions

1. **Database:** use Supabase Postgres (proposed: same project, free tier), accessed as plain Postgres from our backend, without the Supabase client or Row Level Security. Needs an ADR.
2. **Frontend hosting:** a separate static host (proposed), or the backend also serves the SPA (one URL and no CORS, but the login page waits whenever the backend cold-starts).
3. **Local database:** a shared Supabase dev project (simplest), or the Supabase CLI in Docker (each developer isolated, needs Docker).
4. **Edge cases** of computing on read: confirm the two proposals above.
