# Claim - Iteration 0

## Deployed environments

| Environment | Frontend | Backend (API) | Health check |
|---|---|---|---|
| Production | <https://bookmarked-les.onrender.com> | <https://api-bookmarked-les.onrender.com> | <https://api-bookmarked-les.onrender.com/health> |
| Staging (`stg`) | <https://bookmarked-les-stg.onrender.com> | <https://api-bookmarked-les-stg.onrender.com> | <https://api-bookmarked-les-stg.onrender.com/health> |

The `/health` route belongs to the backend, so it is reached through the `api-` links.

## What we have so far

- Frontend and backend are deployed on Render in both production and staging.
- The database is hosted on Supabase.
