# CLAIM — Iteration 2

Team: Group 6 — Bookmarked  
Tag: `iter-2`  
Previous tag: [`iter-1`](https://github.com/MESW-LES-2627/les-project-group-6/tree/iter-1)

This file lives on the tagged commit at `docs/iterations/2/CLAIM.md`. The review opens this file. We do not hunt the repository. A dead link scores that line at most 4&amp;nbsp;

From Iteration 1, a missing tag or a missing CLAIM.md caps the team mark at 10

---

## Required permalinks

Use links that work on tag `iter-2`. If something does not exist yet, write `none yet` — do not paste a link that 404s.


| What                      | Link                                                                                                                                                                                                             |
| :------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MVP                       | [https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/docs/iterations/0/mvp.md](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/docs/iterations/0/mvp.md)                           |
| Vision                    | [https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/docs/iterations/0/Vision.md](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/docs/iterations/0/Vision.md)                     |
| Definition of Done        | [https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/docs/iterations/0/DefenitionOfDone.md](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/docs/iterations/0/DefenitionOfDone.md) |
| This tag (`iter-2`)       | [https://github.com/MESW-LES-2627/les-project-group-6/releases/tag/iter-2](https://github.com/MESW-LES-2627/les-project-group-6/releases/tag/iter-2)                                                             |
| Production                | [https://bookmarked-les.onrender.com/](https://bookmarked-les.onrender.com/)                                                                                                                                     |
| Staging                   | [https://bookmarked-les-stg.onrender.com/](https://bookmarked-les-stg.onrender.com/)                                                                                                                             |
| CI/CD Pipeline            | See the [pipelines table](#cicd-pipelines) below                                                                                                                                                                 |
| Stories in this increment | [https://github.com/orgs/MESW-LES-2627/projects/23/views/10](https://github.com/orgs/MESW-LES-2627/projects/23/views/10)                                                                                         |
| Retrospective             | [https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/docs/iterations/2/retrospective.md](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/docs/iterations/2/retrospective.md)       |
| Iteration log             | [https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/docs/iterations/2/log.md](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/docs/iterations/2/log.md)                           |
| AI log                    | [https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/docs/iterations/2/LLM_LOG.md](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/docs/iterations/2/LLM_LOG.md)                   |


## CI/CD pipelines

All runs: [https://github.com/MESW-LES-2627/les-project-group-6/actions](https://github.com/MESW-LES-2627/les-project-group-6/actions)


| Pipeline                                                                                                                                                                                                                             | Runs                                  | What it does                                                                                                                                                 |
| :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Backend CI](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/backend-ci.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/.github/workflows/backend-ci.yml))                      | PR to `main` touching the backend     | Lints, type-checks and tests the backend.                                                                                                                    |
| [Frontend CI](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/frontend-ci.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/.github/workflows/frontend-ci.yml))                   | PR to `main` touching the frontend    | Lints, type-checks, tests and builds the frontend.                                                                                                           |
| [E2E](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/e2e.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/.github/workflows/e2e.yml))                                           | See the workflow file                 | Runs the Playwright end-to-end tests against the app.                                                                                                        |
| [Mutation tests](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/mutation.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/.github/workflows/mutation.yml))                      | See the workflow file                 | Runs mutation testing; results in [mutation_tests.md](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/docs/iterations/2/mutation_tests.md). |
| [Commit messages](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/commitlint.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/.github/workflows/commitlint.yml))                 | Every PR to `main`                    | Checks every commit follows Conventional Commits, so releases can be versioned automatically.                                                                |
| [Backend CD (stg)](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/backend-cd-stg.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/.github/workflows/backend-cd-stg.yml))        | Manual, any branch                    | Deploys the chosen branch of the backend to the staging Render service and checks `/health`.                                                                 |
| [Frontend CD (stg)](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/frontend-cd-stg.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/.github/workflows/frontend-cd-stg.yml))     | Manual, any branch                    | Deploys the chosen branch of the frontend to the staging Render site and checks it answers.                                                                  |
| [Backend CD (prod)](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/backend-cd-prod.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/.github/workflows/backend-cd-prod.yml))     | Merge to `main` touching the backend  | Runs backend CI, migrates the prod database, deploys to Render and checks `/health`.                                                                         |
| [Frontend CD (prod)](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/frontend-cd-prod.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/.github/workflows/frontend-cd-prod.yml))  | Merge to `main` touching the frontend | Runs frontend CI, deploys the static site to Render and checks it answers.                                                                                   |
| [Release](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/release.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/.github/workflows/release.yml))                               | After a successful prod CD            | Tags the version (`vX.Y.Z`) with semantic-release.                                                                                                           |
| [Iteration release](https://github.com/MESW-LES-2627/les-project-group-6/actions/workflows/iteration-release.yml) ([file](https://github.com/MESW-LES-2627/les-project-group-6/blob/iter-2/.github/workflows/iteration-release.yml)) | Manual, end of sprint                 | Creates the `iter-N` GitHub Release for the sprint.                                                                                                          |


