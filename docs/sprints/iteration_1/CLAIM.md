# CLAIM — Iteration 1

Team: Group 6 — Bookmarked  
Tag: `iter-1`  
Previous tag: none (iteration 0 was not tagged `iter-0`)

This file lives on the tagged commit at `docs/sprints/iteration_1/CLAIM.md`. The review opens this file. We do not hunt the repository. A dead link scores that line at most 4\.&nbsp;

Iteration 0 is a readiness review. An ugly claim does not cap the mark if the slice runs. From Iteration 1, a missing tag or a missing CLAIM.md caps the team mark at 10\.

---

## Required permalinks

Use links that work on tag `iter-1`. If something does not exist yet, write `none yet` — do not paste a link that 404s.

| What | Link |
| :---- | :---- |
| MVP | <https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-1/docs/sprints/iteration_0/mvp.md> |
| Vision | <https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-1/docs/sprints/iteration_0/Vision.md> |
| Definition of Done | <https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-1/docs/sprints/iteration_0/DefenitionOfDone.md> |
|  |  |
| This tag (`iter-1`) | <https://github.com/MESW-LES-2627/les-project-group-6/tree/iter-1> |
| Frontend release | [`v0.8.0`](https://github.com/MESW-LES-2627/les-project-group-6/releases/tag/v0.8.0) (UI redesign, latest release) |
| Backend release | [`v0.7.0`](https://github.com/MESW-LES-2627/les-project-group-6/releases/tag/v0.7.0) (book clubs; `v0.8.0` changed only the frontend) |
|  |  |
| Production | <https://bookmarked-les.onrender.com/> |
| Staging | <https://bookmarked-les-stg.onrender.com/> |
|  |  |
| CI/CD Pipeline | See the [pipelines table](#cicd-pipelines) below |
|  |  |
| Stories in this increment | See the [stories list](#stories-in-this-increment) below |
| Retrospective | <https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-1/docs/sprints/iteration_1/log.md> |
| AI log | <https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-1/docs/sprints/iteration_1/LLM_LOG.md> |

## CI/CD pipelines

All runs: <https://github.com/MESW-LES-2627/les-project-group-6/actions>

| Pipeline | Runs | What it does |
| :---- | :---- | :---- |
| [Backend CI](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/backend-ci.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-1/.github/workflows/backend-ci.yml)) | PR to `main` touching the backend | Lints, type-checks and tests the backend. |
| [Frontend CI](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/frontend-ci.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-1/.github/workflows/frontend-ci.yml)) | PR to `main` touching the frontend | Lints, type-checks, tests and builds the frontend. |
| [Commit messages](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/commitlint.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-1/.github/workflows/commitlint.yml)) | Every PR to `main` | Checks every commit follows Conventional Commits, so releases can be versioned automatically. |
| [Backend CD (stg)](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/backend-cd-stg.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-1/.github/workflows/backend-cd-stg.yml)) | Manual, any branch | Deploys the chosen branch of the backend to the staging Render service and checks `/health`. |
| [Frontend CD (stg)](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/frontend-cd-stg.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-1/.github/workflows/frontend-cd-stg.yml)) | Manual, any branch | Deploys the chosen branch of the frontend to the staging Render site and checks it answers. |
| [Backend CD (prod)](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/backend-cd-prod.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-1/.github/workflows/backend-cd-prod.yml)) | Merge to `main` touching the backend | Runs backend CI, migrates the prod database, deploys to Render and checks `/health`. |
| [Frontend CD (prod)](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/frontend-cd-prod.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-1/.github/workflows/frontend-cd-prod.yml)) | Merge to `main` touching the frontend | Runs frontend CI, deploys the static site to Render and checks it answers. |
| [Release](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/release.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-1/.github/workflows/release.yml)) | After a successful prod CD | Tags the version (`vX.Y.Z`) and creates the GitHub Release with semantic-release. |

## Stories in this increment

Closed between 2026-10-26 and 2026-11-06: [issue search](https://github.com/MESW-LES-2627/les-project-group-6/issues?q=is%3Aissue+is%3Aclosed+closed%3A%3E%3D2026-10-26)

| Issue | Story |
| :---- | :---- |
| [#6](https://github.com/MESW-LES-2627/les-project-group-6/issues/6) | Project setup: create repo skeleton |
| [#71](https://github.com/MESW-LES-2627/les-project-group-6/issues/71) | Setup: release versioning, tags and GitHub Releases |
| [#72](https://github.com/MESW-LES-2627/les-project-group-6/issues/72) | Setup: pre-commit hooks and commit message conventions |
| [#80](https://github.com/MESW-LES-2627/les-project-group-6/issues/80) | Create the login page |
| [#14](https://github.com/MESW-LES-2627/les-project-group-6/issues/14) | F-READ-01: Reading session timer |
| [#46](https://github.com/MESW-LES-2627/les-project-group-6/issues/46) | F-READ-01: Start session and persistent timer widget |
| [#29](https://github.com/MESW-LES-2627/les-project-group-6/issues/29) | F-LIB-01: Library page |
| [#21](https://github.com/MESW-LES-2627/les-project-group-6/issues/21) | F-GRP-04: Challenge period, rules and winner |
| [#67](https://github.com/MESW-LES-2627/les-project-group-6/issues/67) | F-GRP-04: Challenge period, dates and status (database + backend) |
| [#22](https://github.com/MESW-LES-2627/les-project-group-6/issues/22) | F-GRP-03: Challenge leaderboard |
| [#56](https://github.com/MESW-LES-2627/les-project-group-6/issues/56) | F-GRP-03: Leaderboard UI on the group page |
| [#57](https://github.com/MESW-LES-2627/les-project-group-6/issues/57) | F-GRP-01: Groups list, create challenge form and group page |
| [#107](https://github.com/MESW-LES-2627/les-project-group-6/issues/107) | F-GRP-01: Group invites and friends list API (database + backend) |
| [#108](https://github.com/MESW-LES-2627/les-project-group-6/issues/108) | F-GRP-02: Persisted group chat shared by challenges and book clubs |
| [#104](https://github.com/MESW-LES-2627/les-project-group-6/issues/104) | Create Book Clubs |
| [#105](https://github.com/MESW-LES-2627/les-project-group-6/issues/105) | F-GRP-07: Book club tables, aggregate and create/list API (database + backend) |
| [#106](https://github.com/MESW-LES-2627/les-project-group-6/issues/106) | F-GRP-07: Book club round progress, outcome, history and next round (backend) |
| [#110](https://github.com/MESW-LES-2627/les-project-group-6/issues/110) | F-GRP-07: Book club pages wired to the API (frontend) |
| [#109](https://github.com/MESW-LES-2627/les-project-group-6/issues/109) | F-GRP-08: Book club voting and proposals (database + backend) |

In progress:

| Issue | Story | Work |
| :---- | :---- | :---- |
| [#7](https://github.com/MESW-LES-2627/les-project-group-6/issues/7) | F-AUTH-01: Sign up, log in, log out (Supabase Auth + our users table) | PR [#116](https://github.com/MESW-LES-2627/les-project-group-6/pull/116) |
| [#28](https://github.com/MESW-LES-2627/les-project-group-6/issues/28) | F-LIB-01: Library tables and endpoints | PR [#115](https://github.com/MESW-LES-2627/les-project-group-6/pull/115) |
| [#33](https://github.com/MESW-LES-2627/les-project-group-6/issues/33) | F-SOC-01: Friendships table and friend request API | PR [#114](https://github.com/MESW-LES-2627/les-project-group-6/pull/114) |
| [#31](https://github.com/MESW-LES-2627/les-project-group-6/issues/31) | F-READ-04: Streak calculator and service (backend) | assigned, no PR yet |
