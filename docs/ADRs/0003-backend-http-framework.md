# ADR-0003: Backend HTTP Framework (Express)

- **Status:** Accepted
- **Date:** 2026-10-18
- **Deciders:** Group 6
- **Context area:** HTTP layer (`apps/backend`)

## Context

[ADR-0001](0001-choose-tech-stack.md) fixed TypeScript on Node for the backend with a **minimal HTTP layer** and left the exact library to a follow-up decision, naming Express, Fastify and Hono as candidates. The backend skeleton (#62) started with Hono, but only for `GET /health`, so changing now costs almost nothing.

What matters for this choice:

1. **Team familiarity.** Only part of the team has strong web experience. The framework should be one that most members have used or can learn from the large amount of existing material.
2. **Design stays visible.** Per ADR-0001, the framework must not impose or hide the architecture. Layering, dependency wiring and error handling are ours.
3. **Performance is not a constraint.** A reading-tracker API used by a class project will not reach the limits of any of the candidates.
4. **Ecosystem.** We need standard middleware (CORS, JWT verification for Supabase tokens, validation) and libraries that document Express first.

## Decision

We will use **Express 5** with `@types/express` as the backend HTTP layer.

- `createApp()` in `src/app.ts` builds and returns the Express app. `src/server.ts` only calls `listen`. Keeping them apart lets tests call the app without opening a port.
- Express 5 passes errors from async handlers to the error middleware, so we do not need wrapper functions.
- Request validation, error handling and project layering are not decided here and get their own records.

## Decision drivers

| Driver | Weight | How the decision answers it |
|---|---|---|
| Team familiarity | High | Express is the most widely used Node framework, with the most tutorials and examples |
| Design stays visible | High | Express is a plain middleware chain with no structure imposed |
| Ecosystem and middleware | Medium | Most Node libraries and guides assume Express |
| TypeScript support | Medium | Provided by `@types/express`; weaker than Hono or Fastify but enough for our needs |
| Performance | Low | Slowest of the three, but not a limit for this project |

## Considered options

### Option A: Express 5 (chosen)

- **Pros**
    - Largest ecosystem and community: almost every library, tutorial and answer assumes it.
    - Most members already know it or can learn it quickly.
    - No structure imposed, which fits the "design stays visible" driver.
    - Async errors work as expected since Express 5.
- **Cons**
    - Slowest of the three candidates.
    - TypeScript types are added separately and handler typing is loose (`req.body` and `req.params` need validation or casting).
    - No built-in validation: we add a library (e.g. Zod).
    - Much of the material online still describes Express 4, which behaves differently in places.

### Option B: Hono

- **Pros:** Web-standard `Request` and `Response`, runs on Node, Bun, Deno and edge platforms, small, good type inference, and a typed RPC client.
- **Cons:** Smaller ecosystem and fewer tutorials, and some integrations are less mature. Its strengths (portability, edge runtimes) are not needs of ours.
- **Rejected because** familiarity and ecosystem matter more to this team than its portability and typing. It was used for the first skeleton only.

### Option C: Fastify

- **Pros:** Fast on Node, validation and serialization built in through JSON Schema, a mature plugin model, and a good logger.
- **Cons:** Node only, verbose JSON Schema, and a plugin and encapsulation model the team would have to learn first.
- **Rejected because** its extra structure and learning curve do not pay off at this scale.

## Consequences

### Positive

- New members can start from familiar patterns and find answers easily.
- Standard middleware for CORS, JWT and validation is available without adapters.
- The change from Hono touched only `app.ts`, `server.ts` and the dependencies.

### Negative / risks

- **Loose request typing.** Handler inputs are not checked by the compiler. *Mitigation:* validate every request at the boundary with a schema library and derive the types from it.
- **Outdated examples.** Express 4 snippets can mislead. *Mitigation:* check the Express 5 documentation, and note that async handlers need no wrapper.
- **Slower than the alternatives.** *Mitigation:* none needed now. If it becomes a problem, the HTTP layer is thin enough to replace.
- **No built-in structure.** Consistency depends on discipline. *Mitigation:* agree on the layering in a follow-up ADR.

## Follow-up decisions

- Request validation library and shared-types strategy.
- Backend layering and error-handling convention.
- Testing tools for the backend (HTTP-level tests need a library such as `supertest`).

## References

- [ADR-0001: Choose the Technology Stack](0001-choose-tech-stack.md)
- [Express 5 migration guide](https://expressjs.com/en/guide/migrating-5.html)
