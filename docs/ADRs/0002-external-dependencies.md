# ADR-0002: External Dependencies (Supabase, Open Library, Resend)

- **Status:** Accepted
- **Date:** 2026-10-17
- **Deciders:** Group 6
- **Context area:** Authentication, book data, notifications (`apps/frontend`, `apps/backend`)

## Context

Bookmarked needs three capabilities that are not the core of the product and that a five-person student team should not build from scratch:

1. **Authentication.** Nothing in the app is reachable without logging in, and users can reset a forgotten password by email (F-AUTH-01, F-AUTH-02).
2. **Book data.** Book pages show metadata (cover, title, author, genre, pages, ISBN, description). Books can be found by ISBN or by barcode scan (F-BOOK-01, F-BOOK-03, F-BOOK-04).
3. **Email notifications.** Not required for the first versions, but likely wanted later.

The constraints are the same as in [ADR-0001](0001-choose-tech-stack.md): a small team, a short timeline, a TypeScript stack, and a backend whose design must stay visible for the OOP deliverables. We also have no budget, so each service needs a free tier or a free API.

Using external services creates two risks we must manage: **availability** (their outage becomes ours) and **coupling** (their SDKs and data shapes spreading through our code).

## Decision

We will use the following external services.

| Capability | Service | Status |
|---|---|---|
| Authentication (login, sign-up, password reset) | **Supabase Auth** | Decided, used from the start |
| Book metadata and search | **Open Library API** | Decided, used from the start |
| Transactional email notifications | **Resend** | Decided, but only if we add notifications later |
| Local copy of book data as a fallback | Our own database, filled from Open Library | Optional, only if there is time |

### Rules for using them

- **Isolate each service behind an interface that we own.** For example, the backend defines a `BookCatalog` interface and an `AuthProvider` interface; `OpenLibraryBookCatalog` and `SupabaseAuthProvider` are the classes that implement them. Domain and application code depend only on the interfaces. This keeps the design visible, makes the services replaceable, and lets tests use fake implementations. It also fits the OOP deliverables (Adapter and Dependency Inversion).
- **Map external data into our own domain model.** Open Library response shapes and Supabase user objects must not leak outside their adapter classes.
- **Keep secrets out of the repository.** API keys and Supabase keys are read from environment variables.
- **Validate everything we receive** from these services at the adapter boundary, since TypeScript types are erased at runtime (see ADR-0001).

### Notes per service

- **Supabase** is chosen for the login page and its authentication features only. Using Supabase for the database or other features is **not** decided here and needs its own ADR.
- **Open Library** is a free, public API with no key, which fits our budget. Its data quality is uneven (missing covers, descriptions or page counts), which is already covered by the "add a book manually" requirement (F-BOOK-02). We should send a clear `User-Agent` and cache responses to stay within its usage guidelines.
- **Resend** will only be integrated if email notifications become a requirement. Behind a `Notifier` interface, adding it later should not change domain code. Supabase's own emails (password reset) are separate from this.

### Possible later improvement: local copy of book data

If time allows, we will fetch book data from Open Library and **store it in our database**, so the app keeps working when the API is slow, rate limited or down, and so it does not call the API for every page view. The design would be: look in our database first, call Open Library on a miss, and save the result. This is a "nice to have" and is **not** part of the committed scope. Designing the `BookCatalog` interface now makes it possible to add this later without touching its callers.

## Considered options

### Authentication

- **Supabase Auth — chosen.** Ready-made email/password sign-up, login, sessions and password reset, with a free tier. Saves the most time on a feature that carries security risk.
- **Build our own auth.** Full control and good OOP material, but password storage, sessions and reset flows are easy to get wrong. Rejected because the risk is high and the learning value is low.
- **Other hosted auth (Auth0, Clerk, Firebase Auth).** Comparable, but no one in the team has asked for them, and Supabase's free tier and open-source nature are enough for us. Not chosen.

### Book data

- **Open Library — chosen.** Free, no API key, supports lookup by ISBN and search, and provides cover images.
- **Google Books API.** Richer data, but needs an API key and has quotas. Not chosen for the first version; it could be added as another `BookCatalog` implementation later.
- **Own book database only.** Would need us to collect and maintain the data. Rejected as out of scope.

### Email

- **Resend — chosen (for later).** Simple API, a TypeScript SDK and a free tier.
- **SMTP through a general provider or a self-hosted server.** More setup and deliverability work for little benefit. Not chosen.
- **No email.** Valid for now, and it is the current plan until notifications are required.

## Consequences

### Positive

- Authentication, the highest-risk feature, is handled by a maintained service.
- Book data comes for free, so we spend our time on the reading, social and gamification features.
- Interfaces owned by us keep each service replaceable and make the adapters good examples for the OOP documents.
- Every service has a free tier, so there is no cost for the project.

### Negative / risks

- **Dependency on third parties.** If Supabase is down, nobody can log in; if Open Library is down, book search and details fail. *Mitigation:* handle failures explicitly, show clear error messages, and consider the local data copy above for books.
- **Open Library data quality and limits.** *Mitigation:* manual book creation (F-BOOK-02), caching, and the optional local copy.
- **Vendor lock-in for authentication.** User accounts live in Supabase. *Mitigation:* keep our own user ID and profile data in our model, referenced by the Supabase user ID, and access Supabase only through `AuthProvider`.
- **Free tier changes.** Limits or terms may change. *Mitigation:* the adapter boundary limits the cost of switching.
- **Extra setup for the team.** Each member needs the environment variables and a Supabase project to run the app locally. *Mitigation:* document this in the README and provide an `.env.example` file.

## Follow-up decisions

- Whether to use Supabase for the database, or another database (ties in with the persistence decision left open in ADR-0001).
- How the backend verifies Supabase sessions or tokens.
- Caching and local-copy strategy for book data, if we have time.
- Email notification design, when notifications become a requirement.

## References

- [ADR-0001: Choose the technology stack](0001-choose-tech-stack.md)
- [Product requirements](../product/requirements.md): F-AUTH-01, F-AUTH-02, F-BOOK-01 to F-BOOK-04
- Supabase Auth: https://supabase.com/docs/guides/auth
- Open Library API: https://openlibrary.org/developers/api
- Resend: https://resend.com/docs
