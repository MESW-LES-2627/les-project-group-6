# ADR-0001: Choose the Technology Stack (TypeScript + Vue, TypeScript Backend)

- **Status:** Accepted
- **Date:** 2026-10-17
- **Deciders:** Group 6
- **Context area:** Whole system (`apps/frontend`, `apps/backend`)

## Context

Bookmarked is a web app for building a reading habit (session timer, streaks, goals, library, friends, challenges and book clubs). It is built by a group of five students for the Software Engineering Lab (LES) classes. The same codebase is also used for the OOP class deliverables.

The constraints that shape the stack choice are:

1. **Team skills.** Two of the five members already know TypeScript and Vue. A third knows TypeScript and wants to learn Vue. The others have no strong experience in a web stack, so a shared language across the whole project lowers the learning cost.
2. **OOP deliverables.** The backend has to show object-oriented design: classes, encapsulation, polymorphism and design patterns. The OOP documents (domain model, component diagrams, patterns used, refactored code) are written against this code. The backend language and tooling must make these patterns natural to express and visible in the code.
3. **Visibility of the design.** Highly opinionated frameworks hide wiring, dependency injection and persistence behind conventions and decorators. That makes it harder to show and defend our own design decisions in an academic setting.
4. **Short timeline and small team.** We need one language, one toolchain and one package manager, so any member can work on any part of the system.

## Decision

We will use **TypeScript across the whole system**.

- **Frontend:** TypeScript + **Vue** (single-page application). The Vue Composition API is used with `<script setup lang="ts">`.
- **Backend:** TypeScript on Node.js, **designed around OOP**: domain entities, services, repositories and strategies are explicit classes and interfaces. We will use a **minimal HTTP layer**, not a full-stack framework that generates or hides the architecture. We will wire dependencies by hand (constructor injection, composition root).

The exact libraries (HTTP layer, ORM or query builder, test runner, validation) are deliberately left to follow-up ADRs, so this record only fixes the language and the framework family.

## Decision drivers

| Driver | Weight | How the decision answers it |
|---|---|---|
| Skills already in the team | High | 3 of 5 know TypeScript; 2 know Vue; 1 wants to learn Vue |
| Support for OOP patterns | High | TypeScript has classes, interfaces, abstract classes, generics and access modifiers |
| Design stays visible | High | A minimal backend layer keeps architecture in our code, not in framework magic |
| One language everywhere | Medium | Shared types, validation rules and tooling between frontend and backend |
| Learning value | Medium | Vue is a low-barrier framework for the member who wants to learn it |

## Considered options

### Option A: TypeScript + Vue (frontend), TypeScript on Node (backend) — **chosen**

- **Pros**
    - One language and toolchain for all five members.
    - Types and DTO contracts can be shared between frontend and backend, which reduces integration bugs.
    - TypeScript supports the OOP concepts taught in class (classes, interfaces, abstract classes, polymorphism, generics).
    - No framework hides the architecture, so patterns such as Strategy, Observer, Factory and Repository are easy to show.
    - Vue has a gentle learning curve and good documentation; two members can mentor the others.
- **Cons**
    - TypeScript's type system is structural and erased at runtime, so it is less strict than Java or C# for OOP. Runtime validation of external input must be done separately.
    - A minimal backend means we write more structure ourselves (module layout, dependency wiring, error handling). This needs team conventions.
    - Only two members know Vue today, so frontend reviews depend on them at first.

### Option B: TypeScript + Vue (frontend), backend with an opinionated framework (e.g. NestJS)

- **Pros:** Ready-made structure, built-in dependency injection and modules, good OOP fit on the surface.
- **Cons:** Decorators, modules and DI conventions hide much of the design. This makes it harder to show our own pattern choices in the OOP deliverables. It adds a learning curve for members who do not know it, on top of Vue.
- **Rejected because** the abstraction level is higher than what we want for the OOP work.

### Option C: Vue frontend with a backend in Java or C#

- **Pros:** Stronger OOP language semantics.
- **Cons:** A second language and toolchain; only part of the team knows it; types cannot be shared with the frontend.
- **Rejected because** it breaks the "one language" driver and most members have no experience in it.

### Option D: React frontend + TypeScript backend

- **Pros:** Larger ecosystem and job market.
- **Cons:** Only a minority of the team knows React; the team already has Vue skills to build on.
- **Rejected because** it does not use the skills the team already has.

## Consequences

### Positive

- A single language lowers onboarding cost and lets members move between frontend and backend.
- Shared types can be kept in one place and used by both apps.
- The backend design is entirely ours, so it can be documented and defended in the OOP deliverables.

### Negative / risks

- **Runtime type safety.** TypeScript types are removed at runtime. *Mitigation:* validate every external input (HTTP requests, third-party responses) at the boundary.
- **Self-built structure.** Without a framework, consistency depends on discipline. *Mitigation:* agree on a backend layering and folder convention, and record it in a follow-up ADR.
- **Vue knowledge is unevenly spread.** *Mitigation:* pair the member who is learning Vue with one of the two who know it, and review frontend PRs together.
- **OOP idioms in TypeScript.** Overusing classes where plain functions suffice makes code heavier. *Mitigation:* use classes for domain concepts and where a pattern needs them, as the OOP deliverables require.

## Follow-up decisions

These are not decided by this ADR and each should get its own record:

- Backend HTTP layer and project layering (e.g. Express, Fastify or Hono; folder layout).
- Database and persistence approach (ORM vs. query builder).
- Validation and shared-types strategy between frontend and backend.
- Testing tools for frontend and backend.
- Authentication approach (see requirement F-AUTH-01).

## References

- [Product requirements](../product/requirements.md)
- [Iteration 0 vision](../sprints/iteration_0/vision.md)
- [OOP documents](../OOP_documents/)
