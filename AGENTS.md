# AGENTS.md

Instructions for AI coding agents working on this repository. See [README.md](README.md) for the project overview.

## Keep the README up to date

The "Repository structure" section of `README.md` documents the folder layout. Whenever you add, remove, rename or move a folder or an important file (for example inside `docs/`), update `README.md` in the same change so it matches the real structure.

## Keep the docs index up to date

`docs/README.md` explains each folder and file in `docs/`. Whenever you add, remove, rename, move or fill in a file there, update that index in the same change.

## Keep the iteration log up to date

Each iteration has a running log at `docs/sprints/iteration_N/log.md` (currently [iteration 2](docs/sprints/iteration_2/log.md)). Whenever something new is added or decided in the project, update the log of the current iteration in the same change. This includes:

- a new document, requirement change, design or screen
- a new ADR or any technical decision
- a new template, workflow, script, or change to the repository structure
- a new issue, milestone or change to the GitHub board
- code, features or fixes that land in `apps/`

How to write an entry:

- Add it under the right date heading (`### YYYY-MM-DD: Topic`), newest at the bottom. Use the real date, never a guess.
- Say what was done and, for decisions, why and what was rejected.
- Link the evidence with relative links: the commit hash (and the PR or issue number when there is one), the files or ADRs, and the assets (screenshots, diagrams, Figma link). Example: `` `6120659` `` for a commit, `[ADR-0001](../../ADRs/0001-choose-tech-stack.md)` for a document.
- A commit hash is only known after committing, so add the entry in the commit itself without it, or add the hash in a follow-up `docs:` commit.
- Keep the **Status** table and **Next steps** list of the log current: move finished items out of "Next steps" and update the state of each area.
- Do not duplicate what the log links to. Summarise in a line or two and point to the source.

The log is the day-to-day history. The `release_notes.md` of the iteration is the summary written at the end.

## Tag every test file with its requirement

The first line of each test file names the requirements it checks, using the IDs in [docs/requirements/features_priority.md](docs/requirements/features_priority.md):

```ts
// @req F-LIB-04 F-LIB-03
```

`make traceability` builds the tests-per-requirement report from these tags. Infrastructure tests (health check, CORS, 404 page) have no tag.

## Keep the LLM log up to date

Every major change in content and major code generation performed with AI must be logged in the current iteration's LLM log at `docs/sprints/iteration_N/LLM_LOG.md` (currently [iteration 2](docs/sprints/iteration_2/LLM_LOG.md)), determined by the context of the conversation.

Follow the template defined at the top of the respective `LLM_LOG.md` file:

- Date (`YYYY-MM-DD`)
- Author, Model, and Tool used
- Domain of the change (e.g., docs, database, architecture, frontend, backend, testing)
- Prompt used to generate the content (fenced in a code block)
- Brief explanation of what was changed, generated, or decided

## Design color palette

Use these colors for any UI work. They are also listed in [docs/design/README.md](docs/design/README.md); if the palette changes, update both files.

| Hex | Name |
|---|---|
| `#6f1d1b` | Burgundy |
| `#bb9457` | Gold |
| `#432818` | Dark brown |
| `#99582a` | Copper |
| `#ffe6a7` | Cream |
