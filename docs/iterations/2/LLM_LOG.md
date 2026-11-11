# LLM Usage Log - Iteration 2

## Template

````markdown
### YYYY-MM-DD: [Short Topic / Task Description]

- **Date:** YYYY-MM-DD
- **Author:** [Name]
- **Model:** [e.g. Gemini 3.8 Flash, Claude Sonnet 4.6, GPT-4o]
- **Tool:** [e.g. Antigravity, ChatGPT, Cursor, GitHub Copilot]
- **Domain:** [e.g. docs, database, architecture, frontend, backend, testing]

#### Prompt
```text
[Insert prompt here]
```

#### Explanation of Changes
[Brief explanation of what was changed, generated, or decided.]
````

---

## Logs

### 2026-11-07: One GitHub Release per sprint

- **Date:** 2026-11-07
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** ci, docs

#### Prompt
```text
currently we have 10 releases being the last one as v0.9.0. However, we have a request to have one release per sprint, being the names as iter-0, iter-1, iter-2, iter-3 and the last one, iter-4. The tags can be a lot, but release must be tjsut these. The next release on the next friday is iter-2. How can we do this? can we trigger the release mannually? this way we will trigger the next one?
```
(Then confirmed: implement it, delete the existing releases, and create the past ones, iter-0 for the first week and iter-1 until 2026-11-06.)

#### Explanation of Changes
Removed `@semantic-release/github` from the semantic-release config so `release.yml` only tags `vX.Y.Z`. Added `.github/workflows/iteration-release.yml`, a manual workflow that tags a commit `iter-N` and creates its GitHub Release from the iteration's release notes plus the PRs since the previous `iter-*` tag. Deleted the ten `v0.x` releases (tags kept) and created `iter-0` (`ab9a315`) and `iter-1` (`31f0e69`). Updated the README, AGENTS.md (current iteration is now 2), the docs index and the iteration 2 log.

### 2026-11-07: Email-only login

- **Date:** 2026-11-07
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** frontend, testing, docs

#### Prompt
```text
ok, so, I'm not being able to login with my username, just the email and pass. In this sense, can we remove the email or username texts, remove the message "Username sign-in is not available yet. Please use your email address."
```

#### Explanation of Changes
Changed the login field from "Email or username" to an `Email` input (`type="email"`) in `LoginView.vue`. In `auth.ts`, `SignInInput.identifier` became `email`, and the unused `UsernameResolver` hook and its "Username sign-in is not available yet" error were removed. Updated `auth.spec.ts` (dropped the username tests), `LoginView.spec.ts`, the frontend README and the iteration 2 log.

### 2026-11-08: Prioritized backlog and sprint plan with user stories

- **Date:** 2026-11-08
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** planning, docs

#### Prompt
```text
https://github.com/orgs/MESW-LES-2627/projects/23/views/1 I created a prioritized backlog that is empty right now. We already have a kanban but the teacher askes us to do like this:
- plan the user stories to be done in each sprint (a week)
currently we are just picking tasks and doing without priority, without planning, without gherkin user stories descriptions. Can we do this here?
for this sprint (iteration_2) i was thinking of: [e2e tests for every page; search a book or add it manually; streak and total minutes on the profile; comments and reviews; library folders; explore page with trends, most read of the week and search; search a user by username, see the profile and send a friend request]
add any missing one from https://github.com/orgs/MESW-LES-2627/projects/9
```
(Then: "can I organize by sprints?", and approved closing the old parent issues.)

#### Explanation of Changes
Checked the code to see which features are still missing or mocked, and added the challenge winner story left over from project 9. Wrote 8 user stories with Gherkin scenarios as issues #120 to #127, moved the existing task issues under them as sub-issues, and closed the old parents. On project 23, changed the Iteration field to one-week sprints and gave each story a Priority, story points and Iteration 2. Added the user story issue template and updated the README and the iteration log. The team still has to review the points and priority order.


### 2026-11-08: Component diagram for iteration 1

- **Date:** 2026-11-08
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** architecture, docs

#### Prompt
```text
@docs/oop_assets/component_diagram_iteration_0.png I made this diagram in the first week of the repo. Something changed during the realease iter-1? can I updated this somehow?
```

#### Result
Compared the iteration 0 component diagram with the backend feature modules, `api_routes.md`, `infra.md` and the iteration 1 log, and listed what changed. Robert redrew the iteration 1 diagram by hand. Claude rewrote `docs/design.md` to explain both diagrams and reviewed the source and target of each arrow against the code.

### 2026-11-08: UML class diagrams for OOP iterations 1 and 2

- **Date:** 2026-11-08
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** architecture, docs

#### Prompt
```text
ok, now, I need to create a class diagram using UML 2.0 for iteration 0 and iteration 1. Based on the differente of the component diagram of iteration 0 and 1, create for me. Some things I remember right now that could be helpful: challenge groups and book clubs maybe are inheritance of groups because they reuse classes. etc. help me, we already have some class implemented but this class diagram is not focused in  implementation but domain.
```

#### Result
Generated two domain class diagrams in Mermaid (UML 2.0 notation: generalization, composition, multiplicities, enumerations, derived attributes) from the two component diagrams, the domain classes in `apps/backend/src/features/` and `table_UML.md`. Added them to `docs/design.md` with a list of what changed, and rendered PNGs to `docs/oop_assets/`.

### 2026-11-08: Change analysis (adding book clubs)

- **Date:** 2026-11-08
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5 (main agent and one subagent)
- **Tool:** Claude Code
- **Domain:** architecture, docs

#### Prompt
```text
add the analysis in a separate md in oop_assets and just reference in design.md. For the coupling analysis you can use this skill: https://github.com/vladikk/modularity span a subagent to use this skill
```

#### Result
A subagent applied the Balanced Coupling model from the modularity skill (integration strength, distance, volatility) to the book club change, comparing the code at `fd29f4b`, `7a919bd` and `2f8830c`. Claude wrote `docs/oop_assets/change_analysis.md` from that analysis. It covers the scenario, the coupling tables before and after, cohesion, the options and the decision, and is linked from `design.md`.

### 2026-11-08: Reduce coupling between groups and reading data

- **Date:** 2026-11-08
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** backend, database, docs

#### Prompt
```text
ok, so, about the section 7 of what is not ideal. can we do something to improve this and reduce coupling?
```

#### Result
Added `ReadingActivityQuery` (reading-session) and `ReadingProgressQuery` (reading-status), and made the challenge standings and the book club progress use them instead of reading those tables (`d1f3e37`). Added `groups.kind` with migration 0006, filled in for existing groups, and removed the `book_clubs` joins from the group roster and invite repositories (`ee0c762`). Added 4 integration tests (190 passing) and simplified the change analysis, adding a section 7 on the fixes.

### 2026-11-08: Event storming review and added to the design

- **Date:** 2026-11-08
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** docs, architecture

#### Prompt
```text
I made this eventstorming of the project. its correct? what can be the aggregates?
about the point 1 what are the events you think we can change?
now, add this image name as eventstorming in oop_assets and add to design.md as reference
```

#### Result
Reviewed the event storming board: flagged UI interactions written as domain events (to remove or turn into read models), commands written as clicks, streak and badge policies triggered by opening the profile, and technical steps in the chat flow, and suggested aggregates per subdomain. Added the updated board as `docs/oop_assets/eventstorming.png` and filled in the event storming section of `design.md` with the image and a table of the aggregates per subdomain.

### 2026-11-11: Auth middleware on the friend request API and merge with main

- **Date:** 2026-11-11
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** backend, testing, docs

#### Prompt
```text
https://github.com/MESW-LES-2627/les-project-group-6/pull/114 and https://github.com/MESW-LES-2627/les-project-group-6/pull/115 these 2 PRs needs to add the auth middleware. Add for me and resolve the conflicts with main
```

#### Explanation of Changes
Merged `main` into PR #114 and resolved the conflicts. The friend routes now take the acting reader from the token (`currentUserId`) instead of `requesterId`/`userId` in the body or path, and `GET /user/:userId/friend-requests` became `GET /me/friend-requests`. Rewrote the integration tests to authenticate with `FakeAuthProvider`, and moved the PR's docs from the old `docs/sprints/` folder into `docs/iterations/`.

### 2026-11-11: Auth middleware on the reading status routes and merge with main

- **Date:** 2026-11-11
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** backend, database, testing, docs

#### Prompt
```text
https://github.com/MESW-LES-2627/les-project-group-6/pull/114 and https://github.com/MESW-LES-2627/les-project-group-6/pull/115 these 2 PRs needs to add the auth middleware. Add for me and resolve the conflicts with main
push and merge both prs
```

#### Explanation of Changes
Merged `main` into PR #115 and resolved the conflicts. Regenerated the reading status dates migration as 0007, made every reading status and library route take the reader from the token, added an ownership check to `removeById`, replaced `DELETE /user/:userId/library/:bookId` with `DELETE /me/library/:bookId` and dropped `GET /library?userId=`. Rewrote the integration tests to use `FakeAuthProvider`, added `db` to the commit types in `commitlint.yml`, and moved the PR's docs into `docs/iterations/`.

### 2026-11-11: Explore page spec

- **Date:** 2026-11-11
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** docs, architecture, frontend, backend

#### Prompt
```text
I will do this user story https://github.com/orgs/MESW-LES-2627/projects/23/views/10?pane=issue&itemId=297555567&issue=MESW-LES-2627%7Cles-project-group-6%7C126
here some infos to create the spec:
- keep the style patern of UI. reuse components if possible
- We need to create the explore page. The explore page yill have a big search bar to search by books and below some books on trend.
```

#### Result
Wrote the [Explore page design](../../superpowers/specs/2026-11-11-explore-page-design.md) after two questions: search is inline using the existing `GET /book`, and both lists from the story are built. The backend composes the published read contracts (`ReadingActivityQuery`, `ReadingProgressQuery`) and adds `reading_status.created_at` (migration 0008). The UI follows the old Explore mockup and reuses the global classes and existing components.

### 2026-11-11: Explore page implementation

- **Date:** 2026-11-11
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** backend, database, frontend, testing, docs

#### Prompt
```text
implement the spec
```

#### Result
Wrote the [implementation plan](../../superpowers/plans/2026-11-11-explore-page.md) and built it test-first.
- **Backend:** migration 0008 (`reading_status.created_at`), the `topBooks` and `mostAdded` contract methods, `findByIds`, `ExploreService` and `GET /explore`.
- **Frontend:** the `/explore` page with search, results and trending cards, the header link, and the move of the page header to `layout/`.
- **Tests:** 22 new tests. All checks pass (backend 271 tests, frontend 138 tests, typecheck and lint).

### 2026-11-11: Explore trending suggestions

- **Date:** 2026-11-11
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** backend, frontend, testing, docs

#### Prompt
```text
nice, now, when we have no activity, can you get some random books to add on trending?
```

#### Result
Added `IBookRepository.random`, a `suggestions` list in `ExploreService` and `GET /explore` (only while nothing trends), and the Trending tab's fallback cards with a note. Also removed the unused header search in favour of the Explore page. New tests for the repository, the service, the route and the view.

