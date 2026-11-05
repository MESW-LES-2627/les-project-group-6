# LLM Usage Log - Iteration 1

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

### 2026-11-04: Friendship domain, service, repository and REST endpoints (#33)

- **Date:** 2026-11-05
- **Author:** Vasco Gonçalves
- **Model:** Gemini 2.5 Pro
- **Tool:** Antigravity
- **Domain:** backend, database, testing

#### Prompt
```text
Can you build the friendship domain and friend service with request(requesterId, targetUserId), accept(byUserId, id), decline(byUserId, id), pendingRequestsFor(userId), and removeFriend(userId, friendUserId)? then add the rest endpoints for POST /friend-requests, GET /user/:userId/friend-requests, POST /friend-requests/:id/accept, POST /friend-requests/:id/decline, DELETE /friends/:userId, and GET /user/:userId/friends, regarding those specific attributes being the return values the ones specified by issue and also regarding the constraints previously specified.

Before this implementation, generate the functions for the friendship domain to be able to retireve and manipulate the values to be used by the endpoints. It's there that the constraints are checked to then access database values.
```

#### Explanation of Changes
Implemented the backend friend requests and friendship management for Issue #33 (PR #114):
- **Domain Aggregate:** Added `Friendship` aggregate root with `request()`, `reconstitute()`, `accept()`, `decline()`, and typed `FriendshipId` value object, enforcing mutual friendship rules and domain error definitions (`CannotFriendSelfError`, `FriendshipNotFoundError`, `FriendshipNotPendingError`, `UnauthorizedFriendshipActionError` mapping safely to 404).
- **Repository:** Extended `IFriendRepository` and `DrizzleFriendRepository` supporting `findById`, `findBetween`, `pendingFor`, `save`, and `delete`, while preserving compatibility with `areFriends` and `friendsOf`.
- **Application Service:** Implemented `FriendService` orchestrating `request(requesterId, targetUserId)`, `accept(byUserId, targetOrFriendshipId)`, `decline(byUserId, targetOrFriendshipId)`, `pendingRequestsFor(userId)`, `removeFriend(userId, friendUserId)`, `friendsOf`, and `areFriends`.
- **API & DTOs:** Created `FriendshipDto` and mounted Express routes in `friend-routes.ts`:
  - `POST /friend-requests` (creates pending request or returns existing)
  - `GET /user/:userId/friend-requests` (lists incoming pending requests)
  - `POST /friend-requests/:id/accept` (accepts request)
  - `POST /friend-requests/:id/decline` (declines/removes request)
  - `DELETE /friends/:userId` (removes friend)
  - `GET /user/:userId/friends` (lists accepted friends)
- **Tests:** Added comprehensive unit tests (`friend-service.test.ts`) and integration tests (`friend-api.test.ts`) verifying all endpoints, status transitions, and error codes against PostgreSQL.


