# CLAIM — Iteration 2

Team: Group 6 — Bookmarked  
Tag: `iter-2`  
Previous tag: `iter-1`

This file lives on the tagged commit at `docs/iterations/2/CLAIM.md`. The review opens this file. We do not hunt the repository. A dead link scores that line at most 4\.&nbsp;

From Iteration 1, a missing tag or a missing CLAIM.md caps the team mark at 10\.

---

## Required permalinks

Use links that work on tag `iter-2`. If something does not exist yet, write `none yet` — do not paste a link that 404s.

| What | Link |
| :---- | :---- |
| MVP | <https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/docs/iterations/0/mvp.md> |
| Vision | <https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/docs/iterations/0/Vision.md> |
| Definition of Done | <https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/docs/iterations/0/DefenitionOfDone.md> |
|  |  |
| This tag (`iter-2`) | <https://github.com/MESW-LES-2627/les-project-group-6/tree/iter-2> |
| Release | [`iter-2`](https://github.com/MESW-LES-2627/les-project-group-6/releases/tag/iter-2) (one GitHub Release per sprint since 2026-11-07; `vX.Y.Z` stay as tags only) |
|  |  |
| Production | <https://bookmarked-les.onrender.com/> |
| Staging | <https://bookmarked-les-stg.onrender.com/> |
|  |  |
| CI/CD Pipeline | See the [pipelines table](#cicd-pipelines) below |
|  |  |
| Sprint board | <https://github.com/orgs/MESW-LES-2627/projects/23> (Iteration 2) |
| Stories in this increment | See the [stories list](#stories-in-this-increment) below |
| Sprint report | <https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/docs/iterations/2/weekly_report.md> |
| Retrospective | <https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/docs/iterations/2/log.md> |
| AI log | <https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/docs/iterations/2/LLM_LOG.md> |

## CI/CD pipelines

All runs: <https://github.com/MESW-LES-2627/les-project-group-6/actions>

| Pipeline | Runs | What it does |
| :---- | :---- | :---- |
| [Backend CI](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/backend-ci.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/.github/workflows/backend-ci.yml)) | PR to `main` touching the backend | Lints, type-checks and tests the backend. |
| [Frontend CI](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/frontend-ci.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/.github/workflows/frontend-ci.yml)) | PR to `main` touching the frontend | Lints, type-checks, tests and builds the frontend. |
| [Commit messages](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/commitlint.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/.github/workflows/commitlint.yml)) | Every PR to `main` | Checks every commit follows Conventional Commits, so releases can be versioned automatically. |
| [Backend CD (stg)](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/backend-cd-stg.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/.github/workflows/backend-cd-stg.yml)) | Manual, any branch | Deploys the chosen branch of the backend to the staging Render service and checks `/health`. |
| [Frontend CD (stg)](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/frontend-cd-stg.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/.github/workflows/frontend-cd-stg.yml)) | Manual, any branch | Deploys the chosen branch of the frontend to the staging Render site and checks it answers. |
| [Backend CD (prod)](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/backend-cd-prod.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/.github/workflows/backend-cd-prod.yml)) | Merge to `main` touching the backend | Runs backend CI, migrates the prod database, deploys to Render and checks `/health`. |
| [Frontend CD (prod)](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/frontend-cd-prod.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/.github/workflows/frontend-cd-prod.yml)) | Merge to `main` touching the frontend | Runs frontend CI, deploys the static site to Render and checks it answers. |
| [Release](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/release.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/.github/workflows/release.yml)) | After a successful prod CD | Tags the version (`vX.Y.Z`) with semantic-release; no GitHub Release. |
| [Iteration release](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/iteration-release.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/.github/workflows/iteration-release.yml)) | Manual, end of sprint | Tags `iter-N` and creates the sprint's GitHub Release with its release notes and merged PRs. |

## Stories in this increment

Iteration 2 (2026-11-09 to 2026-11-15) on the [Sprint goals board](https://github.com/orgs/MESW-LES-2627/projects/23): 9 stories, 39 points. Details in the [sprint report](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/docs/iterations/2/weekly_report.md).

Done (19 points):

| Issue | Story | Pts | Work |
| :---- | :---- | :---- | :---- |
| [#120](https://github.com/MESW-LES-2627/les-project-group-6/issues/120) | Search any book, add it if missing | 2 | PR [#144](https://github.com/MESW-LES-2627/les-project-group-6/pull/144), PR [#145](https://github.com/MESW-LES-2627/les-project-group-6/pull/145) |
| [#126](https://github.com/MESW-LES-2627/les-project-group-6/issues/126) | Explore page: trending, most read this week, search | 5 | PR [#141](https://github.com/MESW-LES-2627/les-project-group-6/pull/141), PR [#142](https://github.com/MESW-LES-2627/les-project-group-6/pull/142) |
| [#122](https://github.com/MESW-LES-2627/les-project-group-6/issues/122) | Rate and review a book I read | 2 | #26, #27 |
| [#146](https://github.com/MESW-LES-2627/les-project-group-6/issues/146) | Add a comment to a book I read | 2 | split from #122 |
| [#127](https://github.com/MESW-LES-2627/les-project-group-6/issues/127) | Tech debt: e2e tests for every frontend page | 8 | #135 to #139 |

In review:

| Issue | Story | Pts |
| :---- | :---- | :---- |
| [#125](https://github.com/MESW-LES-2627/les-project-group-6/issues/125) | Organize my library in my own folders | 2 |

Not done, moved to Iteration 3:

| Issue | Story | Pts | Work |
| :---- | :---- | :---- | :---- |
| [#121](https://github.com/MESW-LES-2627/les-project-group-6/issues/121) | Reading streak and total minutes on my profile | 5 | not started |
| [#123](https://github.com/MESW-LES-2627/les-project-group-6/issues/123) | Find a user by username, see the profile, send a friend request | 8 | friend request API done in PR [#114](https://github.com/MESW-LES-2627/les-project-group-6/pull/114); friends page and profile endpoint not started |
| [#124](https://github.com/MESW-LES-2627/les-project-group-6/issues/124) | Challenge ends with a winner | 5 | not started |

Also merged this sprint: email-only login (PR [#118](https://github.com/MESW-LES-2627/les-project-group-6/pull/118), [#119](https://github.com/MESW-LES-2627/les-project-group-6/pull/119)), Supabase Auth sign-up/log-in/log-out (PR [#116](https://github.com/MESW-LES-2627/les-project-group-6/pull/116)), reading status endpoints (PR [#115](https://github.com/MESW-LES-2627/les-project-group-6/pull/115)), one GitHub Release per sprint (PR [#117](https://github.com/MESW-LES-2627/les-project-group-6/pull/117)), lower coupling between groups and reading data (PR [#128](https://github.com/MESW-LES-2627/les-project-group-6/pull/128)), brand favicon (PR [#140](https://github.com/MESW-LES-2627/les-project-group-6/pull/140)).
