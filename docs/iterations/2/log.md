# Iteration 2 log

A running record of what the team did and decided in iteration 2. The [release notes](release_notes.md) are the summary written at the end; this file is the day-to-day history. Newest entries go at the bottom. Earlier iterations are in their own logs ([iteration 0](../iteration_0/log.md), [iteration 1](../iteration_1/log.md)).

**Traceability chain:** requirement ID (`F-XXX-NN`) → GitHub issue (milestone `Iteration 2`) → PR → release notes.

## Status

| Area | State |
|---|---|
| Releases | One GitHub Release per sprint (`iter-0` to `iter-4`), made by hand with `iteration-release.yml`; `vX.Y.Z` stay as tags only. `iter-0` and `iter-1` released |
| Auth (F-AUTH-01) | Login is email and password only; username login removed from the form |
| Planning | Sprints planned on the [prioritized backlog](https://github.com/orgs/MESW-LES-2627/projects/23): 8 stories (49 points) in Iteration 2 (#120 to #127) |

## Log

### 2026-11-07: One GitHub Release per sprint

- Commit `5f7c586`, PR [#117](https://github.com/MESW-LES-2627/les-project-group-6/pull/117).
- **Decision: GitHub Releases are one per sprint, named `iter-0` to `iter-4`.** Asked for by the class: every merge that deployed a `feat` or `fix` made a release, so there were ten (`v0.1.0` to `v0.9.0`) after two sprints.
- [`release.yml`](../../../.github/workflows/release.yml) still runs semantic-release after each prod deploy, but `@semantic-release/github` was removed from the `release` key of `package.json`, so it only pushes the `vX.Y.Z` tag. The ten `v0.x` GitHub Releases were deleted; their tags were kept.
- New [`iteration-release.yml`](../../../.github/workflows/iteration-release.yml), run by hand at the end of the sprint: pick `iter-N` and the commit or branch, it tags it and creates the release (latest) with the iteration's `release_notes.md` and the PRs merged since the previous `iter-*` tag. The tag is pushed with git, because creating it through the API needs the `workflow` token scope. *Rejected:* a Friday schedule, because the end of a sprint can move and a wrong release is worse than a forgotten click.
- Past sprints released by hand: [`iter-0`](https://github.com/MESW-LES-2627/les-project-group-6/releases/tag/iter-0) on `ab9a315` (last merge of the first week, 2026-10-23, same commit as `v0.1.0`) and [`iter-1`](https://github.com/MESW-LES-2627/les-project-group-6/releases/tag/iter-1) on the existing tag `31f0e69` (2026-11-06). `iter-2` is next Friday.
- Documented in the README "Production deploy and versions" section.

### 2026-11-07: Login is by email only

- Commit `6015c62`.
- **Decision: the login form asks for an email, not "email or username".** Username login was never wired up: typing a username only showed "Username sign-in is not available yet". Supabase signs in by email, and mapping a username to an email needs a public lookup that leaks users' emails. *Rejected:* a backend username → email endpoint, for that reason.
- [`LoginView.vue`](../../../apps/frontend/src/views/LoginView.vue) now has an `Email` field (`type="email"`); [`auth.ts`](../../../apps/frontend/src/services/auth.ts) takes `email` and the unused username resolver hook and its message were removed. Tests and the [frontend README](../../../apps/frontend/README.md) updated. Usernames are still chosen at sign-up and shown in the app.

### 2026-11-08: Sprint planning with user stories and a prioritized backlog

- **Decision: we plan each one-week sprint from a prioritized backlog of user stories.** Asked for by the class: until now we picked tasks from the kanban ([project 9](https://github.com/orgs/MESW-LES-2627/projects/9)) with no priority, no plan and no acceptance criteria.
- **Board:** [project 23 "Sprint goals"](https://github.com/orgs/MESW-LES-2627/projects/23). Its `Iteration` field was changed from 2-week sprints to one week: Iteration 2 (2026-11-09 to 11-15), 3 (11-16 to 11-22), 4 (11-23 to 11-29). Each story has `Priority` (org issue field), `Estimate` (story points, Fibonacci) and `Iteration`. Items with no iteration are the unplanned backlog.
- **Stories:** issues with the new `user story` label and type Feature: a story sentence, Gherkin scenarios, and the technical tasks as sub-issues. New template [`00-user-story.yml`](../../../.github/ISSUE_TEMPLATE/00-user-story.yml).
- **Iteration 2 plan, in priority order** (49 points; the bottom stories move to Iteration 3 if not finished):

  | # | Story | Priority | Pts | Tasks |
  |---|---|---|---|---|
  | [#120](https://github.com/MESW-LES-2627/les-project-group-6/issues/120) | Search any book, add it if missing | High | 8 | #45 #48 #50 #51 #32 #35 #37 |
  | [#121](https://github.com/MESW-LES-2627/les-project-group-6/issues/121) | Reading streak and total minutes on my profile | High | 5 | #31 #34 #54 #60 |
  | [#122](https://github.com/MESW-LES-2627/les-project-group-6/issues/122) | Rate and review a book I read | High | 5 | #26 #27 |
  | [#123](https://github.com/MESW-LES-2627/les-project-group-6/issues/123) | Find a user by username, see the profile, send a friend request | High | 8 | #33 #36 #58 |
  | [#124](https://github.com/MESW-LES-2627/les-project-group-6/issues/124) | Challenge ends with a winner (left over from project 9) | High | 5 | #68 #69 #61 |
  | [#125](https://github.com/MESW-LES-2627/les-project-group-6/issues/125) | Organize my library in my own folders (mocked today) | Medium | 5 | to split |
  | [#126](https://github.com/MESW-LES-2627/les-project-group-6/issues/126) | Explore page: trending, most read this week, search | Low | 5 | to split, needs #120 |
  | [#127](https://github.com/MESW-LES-2627/les-project-group-6/issues/127) | Tech debt: e2e tests for every frontend page | Medium | 8 | to split |

- The old feature parents #9 #11 #15 #16 #17 #18 #19 were closed as superseded by these stories and removed from project 23; their tasks moved under the stories.

## Next steps

- Split #125, #126 and #127 into Task sub-issues and assign owners.
- In project 23, add the views that the API cannot create: **Current sprint** (board, filter `iteration:@current`, columns by Status) and group **Prioritized backlog** by Iteration.
- Check and close the open issues that look done in the code: #10 #25 (book page), #28 #30 (library and status), #43 #49 (session API and summary), #52 #55 #59 (group invites, done in #107).
- Fill in [`release_notes.md`](release_notes.md) before running "Iteration release" for `iter-2`.

### 2026-11-08: Component diagram updated to iteration 1

- New [iteration 1 component diagram](../../oop_assets/component_diagram_iteration_1.png), explained in [`design.md`](../../design.md) next to the [iteration 0 one](../../oop_assets/component_diagram_iteration_0.png). Both show the target architecture, including components not built yet.
- What changed from iteration 0: new Auth middleware, Users management, Social links, Group management and Book club services; Challenge management became the Book challenge service; the Leaderboard sync and Search engine services were removed (leaderboards are worked out when read, and book search is part of Books management).
- `design.md` now has a contents list and is organised by OOP iteration (1 to 3), each with a class diagram and a component diagram, plus event storming in iteration 1 and a change analysis in iteration 2. The two existing component diagrams are under iterations 1 and 2.
- Added UML class diagrams of the domain (Mermaid in [`design.md`](../../design.md), PNGs in `oop_assets/`) for OOP iterations 1 and 2. **Decision:** `Group` is an abstract class with `ChallengeGroup` and `BookClub` as subclasses, because both share members, roles, invites and chat; the leaderboard is a derived attribute instead of a stored class, matching the "computed on read" decision in `infra.md`.
- Wrote the [change analysis](../../oop_assets/change_analysis.md) for OOP iteration 2, linked from `design.md`. Scenario: adding book clubs. It includes a coupling analysis with the Balanced Coupling model ([modularity skill](https://github.com/vladikk/modularity)), a cohesion analysis, and the decision: a shared `Group` kernel with one module per kind of group (`7a919bd`, `2f8830c`). It also records three follow-ups as debt. The critical one is that the challenge standings and the club progress queries both repeat the counted-minutes rule by reading `reading_sessions` directly.

### 2026-11-08: Fixed the coupling problems found in the change analysis

- Branch `refactor/group-coupling`, commits `d1f3e37` and `ee0c762`. Not merged yet.
- **Reading activity through contracts.** Reading Session now publishes `ReadingActivityQuery` (which minutes count) and Reading Status publishes `ReadingProgressQuery`. Challenge standings and book club progress call them instead of reading `reading_sessions` and `reading_status` directly, so the counted-minutes rule lives in one place. *Rejected:* keeping the two read-side queries (CQRS) as they were, because they duplicated a core rule in two modules.
- **Group kind stored on the group.** Migration [0006](../../../apps/backend/src/database/migrations/0006_group_kind.sql) adds `groups.kind`, filled from `book_clubs` for existing rows (checked on a scratch database). The group roster and invite repositories no longer join `book_clubs`.
- Left as known debt: the club reads `updatedAt` as the finish date, and two modules still write their admin's `member` row. See section 7 of the [change analysis](../../oop_assets/change_analysis.md).
- **Tests.** Backend 190 passing (4 new integration tests for the activity query and the challenge standings).
- **Deploy:** migration 0006 runs with the CD on merge. No new environment variables.
- **CI:** `scripts/check-commits.sh` was removed with the `scripts/` folder (`fbbdf9a`), but `commitlint.yml` still called it, so the commit check failed on every pull request. The same check now runs inline in the workflow, and the README no longer lists `infra/` and `scripts/`.
