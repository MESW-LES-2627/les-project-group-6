# Bookmarked

Bookmarked (temporary name) is a web app where readers build a lasting reading habit, and where friends and groups keep each other reading. It works like a tracker app for books: it measures real reading time with a session timer, rewards consistency with streaks, goals, badges and levels, and makes reading a shared activity through friends, challenges and book clubs.

> **University project.** This repository is the group project (Group 6) for the **Software Engineering Lab (LES)** classes of a master's degree. It is also used for the deliverables of the OOP classes.

## Main features

- Reading session timer linked to a book, with streaks and yearly goals
- Personal library with statuses, ratings, folders and tags
- Friends, activity feed and public or private profiles
- Groups: reading **challenges** and **book clubs**, with chat and leaderboards
- Badges, XP and levels
- Search, reviews, trending books and monthly or yearly retrospectives

See the [product vision](docs/sprints/iteration_0/vision.md) and the full [requirements](docs/product/requirements.md).

## Repository structure

```
.
├── apps/
│   ├── frontend/
│   └── backend/
├── docs/
│   ├── ADRs/
│   ├── architecture/
│   ├── design/
│   ├── OOP_documents/
│   ├── product/
│   └── sprints/
├── infra/
├── scripts/
├── .github/
├── .agents/
└── AGENTS.md
```

### `apps/`

The application source code.

- `apps/frontend/`: the web client.
- `apps/backend/`: the server, API and business logic.

### `docs/`

All project documentation. See [docs/README.md](docs/README.md) for an index that explains each folder and file.

- `docs/ADRs/`: Architecture Decision Records. The technical decisions the team makes, with their context and consequences.
- `docs/architecture/`: technical models of the system, such as the [database tables UML](docs/architecture/table_UML.md).
- `docs/design/`: UI design (Figma link, screen snapshots and the color palette).
- `docs/OOP_documents/`: deliverables for the OOP classes (domain model, component diagrams, event storming, coupling analysis, patterns used, refactored code), organized by iteration (`iteration_0` to `iteration_4`).
- `docs/product/`: documents about the business rules and design of the product, such as the [requirements](docs/product/requirements.md).
- `docs/sprints/`: deliverables for the Software Engineering Lab classes (vision, MVP, vertical prototype, claims, release notes), organized by iteration (`iteration_0` to `iteration_4`). Each iteration can also have a `log.md`: a running record of what the team did and decided (see [iteration 0](docs/sprints/iteration_0/log.md)).

### `infra/`

Infrastructure and deployment configuration.

### `scripts/`

Helper scripts for development and automation.

### `.github/`

GitHub configuration: the pull request template and the issue templates (`ISSUE_TEMPLATE/`: feature, bug, refactor and tests). Work is tracked on the org GitHub Project board (columns: To do, Doing, In review, QA, Done).

### `.agents/` and `AGENTS.md`

Configuration and instructions for AI coding agents working on this repository.

## Status

Early stage: the repository is set up and the product is being defined (iteration 0).
