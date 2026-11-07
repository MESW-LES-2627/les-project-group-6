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
