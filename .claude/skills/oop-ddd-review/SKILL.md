---
name: oop-ddd-review
description: Review the backend (apps/backend) for raw OOP, DDD and design-pattern usage, and recommend which OOP/DDD/GoF pattern to add or substitute. Use when reviewing backend code or PRs, adding a domain entity, repository, use case or endpoint, or when asked "is this OOP/DDD?", "which pattern fits here?", "review the domain model" or "check for ORM leaks".
---

# OOP & DDD Review (backend)

This project is graded on **OOP, Domain-Driven Design and design patterns implemented by us**, not delegated to frameworks. The teacher's guidance: avoid frameworks and libraries that take design decisions away from us; avoid ORMs (and JPA-style annotations) because they shape the domain model.

Your job has two parts:

1. **Review**: find violations of the rules below and explain why each matters.
2. **Recommend**: for every problem and every new piece of code, propose the OOP, DDD or GoF pattern that fits, with a short TypeScript sketch adapted to our code. Also point out where a pattern could replace existing code to make it more expressive.

## Project context

- Stack: Node.js + TypeScript + Express 5, PostgreSQL via `pg`, Drizzle used **only as a typed query builder**.
- Layout under `apps/backend/src/`:
  - `domain/`: entities, value objects, aggregates, repository interfaces, domain events, domain services. **Pure TypeScript.**
  - `application/`: use cases / application services that orchestrate the domain. (Create it if missing.)
  - `infrastructure/`: database schema, Drizzle repositories, mappers, external services.
  - `app.ts` / HTTP layer: controllers only translate HTTP ⇄ use case calls.
- Dependency direction: `HTTP → application → domain ← infrastructure`. The domain depends on nothing.

## How to run a review

1. Determine scope: the diff (`git diff main...HEAD -- apps/backend`) or the files the user named. If none, review all of `apps/backend/src`.
2. Run the mechanical checks below (grep) to find hard violations fast.
3. Read each domain file and each repository and apply the checklist.
4. For each finding, pick a recommendation from the pattern catalog.
5. Report using the output format at the end. Do not edit code unless the user asks.

### Mechanical checks

Run from the repo root:

```bash
# Drizzle / pg / express must not leak into domain or application
grep -rnE "from ['\"](drizzle-orm|pg|express)" apps/backend/src/domain apps/backend/src/application

# Relational (ORM-mode) Drizzle API is forbidden
grep -rnE "db\.query\.|with: *\{|relations\(" apps/backend/src

# Generated row types must stay inside mappers/repositories
grep -rnE "\\\$infer(Select|Insert)" apps/backend/src | grep -v infrastructure/

# Forbidden dependencies
grep -nE "\"(prisma|@prisma/client|typeorm|sequelize|mikro-orm|@mikro-orm/[a-z-]+|@nestjs/[a-z-]+|class-transformer|typedi|inversify|tsyringe)\"" apps/backend/package.json

# Decorators in the domain (annotation-driven design)
grep -rn "^\s*@[A-Za-z]" apps/backend/src/domain
```

Any hit is a **Blocker** unless the user justifies it.

## Rules

### R1. Persistence ignorance (anti-ORM)

- No ORM or framework that owns entities: Prisma, TypeORM, Sequelize, MikroORM, NestJS, DI containers with decorators. Express is allowed only as the HTTP transport.
- Drizzle is allowed **only** inside `infrastructure/`, **only** as a query builder (`select/insert/update/delete`, `innerJoin`, `sql\`\``).
- **Forbidden:** `relations.ts`, `db.query.*`, `with: {...}`. Load related data with explicit SQL joins inside the repository, and only what the aggregate needs.
- Rows (`typeof table.$inferSelect`) never leave the repository. Conversion happens in a **Data Mapper** written by us (`toDomain(row)` / `toPersistence(entity)`).
- Migrations are plain SQL or drizzle-kit output. They are schema only and never generate domain classes.

### R2. Rich domain model (no anemic entities)

An entity that only holds data while its rules live in services, controllers or nowhere is the **Anemic Domain Model** anti-pattern. Check for:

- **Private constructor + named factories**: `static create(...)` for new objects (validates and generates identity), `static reconstitute(...)` for the mapper (no validation side effects, no new id).
- **Invariants enforced inside the object**: an invalid instance must be impossible to build.
- **Behaviour methods named in the ubiquitous language** (`startReading()`, `updateProgress(page)`, `finish()`), not generic setters (`setStatus`).
- **Encapsulated state**: private fields, `readonly` where immutable, getters only when needed. No public mutable fields.
- **Tell, don't ask**: callers ask the object to act instead of reading its fields to decide.

Plain data structures are fine for DTOs, request/response shapes, query results for read screens and database rows. Do not flag those.

### R3. Value Objects instead of primitives

Flag **Primitive Obsession**: `string`/`number` used for concepts with rules or meaning. Candidates in this project: `BookId`, `UserId`, `Isbn13`, `Email`, `Username`, `PageCount`, `PageProgress`, `ReadingStatusType`, `Rating`, `DateRange`.

A Value Object is immutable, validated at creation, has no identity and compares by value (`equals`).

### R4. Aggregates and boundaries

- One **Aggregate Root** per cluster. Outside code changes the cluster only through the root.
- Aggregates reference other aggregates **by ID**, never by object (`readingStatus.bookId: BookId`, not `book: Book`).
- One repository per aggregate root, not per table.
- One transaction modifies one aggregate. Cross-aggregate effects use **Domain Events** or an application service.
- Repository `save()` persists the whole aggregate (root + children) in one transaction.

### R5. Layering and dependency inversion

- Repository **interfaces** live in `domain/`. Implementations (`Drizzle*Repository`, `InMemory*Repository`) live in `infrastructure/`.
- Use cases receive dependencies through the **constructor** (manual DI). Wire them in a composition root (`server.ts` / `app.ts`), not with a container.
- Controllers contain no business rules. They parse input, call a use case and map the result or error to HTTP.
- Domain errors are domain classes (`InvalidIsbnError extends DomainError`), mapped to HTTP status codes in the HTTP layer.

### R6. SOLID and general OOP

- **SRP**: one reason to change per class. Flag god classes and very long `app.ts` route handlers.
- **OCP**: adding a variant should mean adding a class, not editing a `switch`. A `switch` on a type or status is a smell → Strategy or State.
- **LSP**: subclasses must honour the base contract. Prefer composition over inheritance.
- **ISP**: small, focused interfaces (a read-side query interface is separate from the write repository).
- **DIP**: depend on abstractions you own.
- Prefer polymorphism over type checks (`instanceof`, `typeof`, `kind ===` chains).

## Pattern catalog: what to recommend

When you recommend a pattern, name it, say **why it fits this code**, and give a 5–20 line TypeScript sketch using our real names. Prefer the simplest pattern that solves the problem; do not stack patterns for the sake of it.

### DDD tactical patterns

| Pattern | Recommend when | Example here |
|---|---|---|
| Entity | Object has identity and a lifecycle | `User`, `Book`, `Review` |
| Value Object | Concept defined by its value and rules | `Isbn13`, `Email`, `PageProgress` |
| Aggregate / Aggregate Root | Several objects must stay consistent together | `Group` with its `Member`s; `BookClub` with `BookClubRound`s |
| Repository | Loading or saving an aggregate | `IBookRepository` + `DrizzleBookRepository` |
| Factory | Creation is complex or has several valid paths | `Book.create`, `ReadingSessionFactory` |
| Domain Service | Rule involves several aggregates and fits none | `StreakCalculator`, `ChallengeProgressService` |
| Application Service / Use Case | Orchestrating one user action | `UpdateReadingProgressUseCase` |
| Domain Event | Something happened that others react to | `BookFinished` → update goals, leaderboard, streak |
| Specification | Reusable or combinable business rule or filter | `CompletedChallengeSpecification` |
| Bounded Context | Same word means different things | "Book" in Catalog vs Library contexts |
| Anti-Corruption Layer | Integrating an external API | Open Library adapter mapping into our `Book` |

### Enterprise patterns (Fowler, PoEAA)

| Pattern | Recommend when |
|---|---|
| Data Mapper | Always, between rows and domain objects (`BookMapper`) |
| Unit of Work | One use case must save several aggregates or tables atomically |
| Identity Map | The same aggregate is loaded twice in one request |
| Query Object / CQRS read model | Read screens need joins that do not fit an aggregate (e.g. library page) |
| DTO | Crossing the HTTP boundary |

### GoF patterns

| Pattern | Typical signal in our code | Example |
|---|---|---|
| **State** | Behaviour depends on a status with allowed transitions | `ReadingStatus`: `NotStarted → InProgress → Finished`, `Abandoned` |
| **Strategy** | Interchangeable algorithms or a `switch` on type | Challenge/goal targets (by genre, author, category); leaderboard scoring |
| **Observer** | Several reactions to one event | Domain event dispatcher, notifications |
| **Factory Method / Abstract Factory** | Creating families or variants of objects | Notifications by channel, challenge types |
| **Builder** | Many optional params, complex test fixtures | `BookBuilder` for tests |
| **Template Method** | Same algorithm skeleton, varying steps | Base repository flow, report generation |
| **Composite** | Tree structures | Nested lists or categories |
| **Decorator** | Adding behaviour without changing a class | Caching or logging around a repository |
| **Adapter** | Wrapping an external API or library | Open Library client, auth provider |
| **Facade** | Simplifying a subsystem for the HTTP layer | `LibraryFacade` |
| **Command** | Encapsulating an action (undo, queue, audit) | Use case inputs as command objects |
| **Chain of Responsibility** | Sequential validation or middleware | Request validation pipeline |
| **Null Object** | Repeated `if (x === null)` checks | `NoReadingGoal` |
| **Singleton** | Recommend **sparingly** (DB pool only), and say why | `pool.ts` |

### Substitution guidance

Also look for code that **works but could be expressed better** with a pattern, and propose the swap:

- `switch`/`if` chain on a status → **State**
- `switch`/`if` chain on a kind or type → **Strategy** or polymorphism
- Service method full of entity field checks → move into the **Entity** (rich model)
- Raw `string`/`number` passed around with repeated validation → **Value Object**
- Use case calling five other services after saving → **Domain Event + Observer**
- Constructor with many optional params → **Factory** or **Builder**
- Repeated filter logic in repositories → **Specification**
- External API response used directly in the domain → **Adapter / Anti-Corruption Layer**
- Several saves that must succeed together → **Unit of Work**

For each substitution, state the trade-off (extra classes vs clarity and extensibility). If the current code is simple and stable, say "no pattern needed". Over-engineering is also a finding.

## Example: what a good entity looks like

```ts
// domain/book/isbn13.ts
export class Isbn13 {
  private constructor(readonly value: string) {}
  static of(raw: string): Isbn13 {
    const digits = raw.replace(/-/g, '');
    if (!/^\d{13}$/.test(digits)) throw new InvalidIsbnError(raw);
    return new Isbn13(digits);
  }
  equals(other: Isbn13): boolean { return this.value === other.value; }
}

// domain/book/book.ts
export class Book {
  private constructor(
    readonly id: BookId,
    private _title: BookTitle,
    private _isbn: Isbn13 | null,
  ) {}

  static create(props: { title: string; isbn?: string }): Book {
    return new Book(BookId.generate(), BookTitle.of(props.title), props.isbn ? Isbn13.of(props.isbn) : null);
  }

  static reconstitute(id: BookId, title: BookTitle, isbn: Isbn13 | null): Book {
    return new Book(id, title, isbn);
  }

  rename(title: string): void { this._title = BookTitle.of(title); }
  get title(): BookTitle { return this._title; }
}

// infrastructure/persistence/book-mapper.ts: the only place that knows both worlds
export const BookMapper = {
  toDomain: (row: typeof books.$inferSelect) =>
    Book.reconstitute(BookId.of(row.id), BookTitle.of(row.title), row.isbn13 ? Isbn13.of(row.isbn13) : null),
  toPersistence: (book: Book) => ({ id: book.id.value, title: book.title.value /* ... */ }),
};
```

## Output format

```markdown
## OOP/DDD review: <scope>

### Summary
<2–3 lines: overall state, biggest risk, best thing already done>

### Findings
| # | Severity | Rule | File:line | Problem |
|---|---|---|---|---|
| 1 | Blocker | R1 | src/... | ... |

Severity: **Blocker** (ORM or framework leak, domain depends on infra), **Major** (anemic entity, missing aggregate boundary, primitive obsession on a key concept), **Minor** (naming, small SOLID smell), **Suggestion** (optional pattern upgrade).

### Recommendations
For each finding (and each pattern opportunity):
- **Pattern:** <name> (DDD / PoEAA / GoF)
- **Why here:** <one or two lines tied to this code>
- **Sketch:** <short TS snippet using our names>
- **Trade-off:** <cost vs benefit>

### What is already good
<patterns correctly applied, so the team keeps them and can cite them in reports>
```

Write in English. Be concrete: cite files and lines, use the project's real class names, and never recommend a library that implements the pattern for us.
