# Documentation

Index of everything inside `docs/`: what each folder and file is for, and whether it has content yet. See the [root README](../README.md) for the project overview.

**Status legend:** ✅ has content · ⬜ empty placeholder, to be written in its iteration.

## Where things go

| If you are documenting... | Put it in |
|---|---|
| What the product must do | `product/` |
| How the UI looks | `design/` |
| A technical decision and its reasons | `ADRs/` |
| A technical model of the system (database tables, ...) | `architecture/` |
| What the team did, day by day | `sprints/iteration_N/log.md` |
| An LES class deliverable | `sprints/iteration_N/` |
| An OOP class deliverable | `OOP_documents/iteration_N/` |

Tasks and bugs are not documented here: they live in GitHub Issues and on the Project board.

## `product/`

| File | Purpose | Status |
|---|---|---|
| [`requirements.md`](product/requirements.md) | The feature list and detailed business requirements, each with a stable ID (`F-AUTH-01`, `F-READ-03`, ...), plus the open questions. Issues and PRs reference these IDs. | ✅ |
| [`features_priority.md`](product/features_priority.md) | Cuts the requirements into Core (sprints 1–2), Extras (sprints 3–4) and Optional, with a sprint plan for 5 developers. Used to create the issues. | ✅ (draft) |

## `design/`

| File | Purpose | Status |
|---|---|---|
| [`README.md`](design/README.md) | Link to the Figma file (source of truth), the color palette, and the screen snapshots with how to re-export them. | ✅ |
| `screens/*.png` | 18 desktop screen snapshots exported from Figma, numbered by flow (`01-authentication.png` to `18-retrospective.png`). They can be out of date: check Figma. | ✅ |

## `ADRs/`

Architecture Decision Records. One file per decision, numbered `NNNN-short-title.md`, with status, context, options considered and consequences. Never edit an accepted ADR to change the decision: write a new one that supersedes it.

| File | Purpose | Status |
|---|---|---|
| [`0001-choose-tech-stack.md`](ADRs/0001-choose-tech-stack.md) | TypeScript with Vue on the frontend and TypeScript on Node on the backend, and why other options were rejected. | ✅ |
| [`0002-external-dependencies.md`](ADRs/0002-external-dependencies.md) | Supabase Auth, Open Library API and Resend, and the rule of hiding each behind an interface we own. | ✅ |
| [`0003-backend-http-framework.md`](ADRs/0003-backend-http-framework.md) | Express 5 as the backend HTTP layer, chosen over Hono and Fastify for team familiarity and ecosystem. | ✅ |

## `architecture/`

Technical models of the system. They are not tied to an iteration: update them as the design changes.

| File | Purpose | Status |
|---|---|---|
| [`table_UML.md`](architecture/table_UML.md) | Database tables specification: detailed relational tables derived from the unified UML diagram (`docs/imgs/uml-diagram.png`), organized by domain module. | ✅ |
| [`infra.md`](architecture/infra.md) | Infrastructure for Core: database, backend server, frontend hosting, external services, environments, CI/CD and secrets. Also records the infra decisions (compute on read with no background jobs, user identity linked to Supabase Auth, user timezone) and the open ones. | ✅ (draft) |

## `sprints/`

Deliverables for the Software Engineering Lab (LES) classes, one folder per iteration (`iteration_0` to `iteration_4`).

| File | Purpose | Status |
|---|---|---|
| `iteration_N/log.md` | Running record of what the team did and decided in the iteration, with links to commits and assets. Kept up to date as required by [`AGENTS.md`](../AGENTS.md). | ✅ for [iteration 0](sprints/iteration_0/log.md), ⬜ for 1 to 4 |
| `iteration_N/LLM_LOG.md` | Log of LLM interactions and prompts used by the team during the iteration. | ✅ for [iteration 0](sprints/iteration_0/LLM_LOG.md) to 4 (templates set) |
| `iteration_N/release_notes.md` | Summary of the iteration, written at the end from the log and the closed issues. | ⬜ |
| `iteration_N/CLAIM.md` | The team's claim document for the iteration, delivered to the LES class. | ⬜ |
| [`iteration_0/vision.md`](sprints/iteration_0/vision.md) | Product vision. | ✅ |
| `iteration_0/mvp.md` | Definition of the MVP. | ⬜ |
| `iteration_0/vertical_prototype.md` | Plan for the vertical prototype (a thin slice through every layer). | ⬜ |

## `OOP_documents/`

Deliverables for the OOP classes, one folder per iteration (`iteration_0` to `iteration_4`). They describe the code in `apps/`.

| File | Purpose | Iterations | Status |
|---|---|---|---|
| `domain_model.md` | The domain classes, their attributes and relationships. | 0 to 4 | ⬜ |
| `component_diagram.md` | The components of the system and how they depend on each other. | 0 to 4 | ⬜ |
| `eventstorming.md` | Event storming result: domain events, commands and actors. | 0 | ⬜ |
| `change_scenario_coupling_analysis.md` | How a change scenario spreads through the design, and the coupling it reveals. | 1, 2 | ⬜ |
| `patterns_used.md` | The design patterns applied in the code and where. | 3, 4 | ⬜ |
| `refactored_code.md` | The refactorings done, with before and after. | 3, 4 | ⬜ |

## Keeping this index up to date

When you add, rename, move or fill in a file in `docs/`, update this page in the same change. Mark a placeholder as ✅ once it has content.
