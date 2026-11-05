# Iteration 1 log

A running record of what the team did and decided in iteration 1. The [release notes](release_notes.md) are the summary written at the end; this file is the day-to-day history. Newest entries go at the bottom.

**Traceability chain:** requirement ID (`F-XXX-NN`) → GitHub issue (milestone `Iteration 1`) → PR → release notes.

## Status

| Area | State |
|---|---|
| Friend request and friendship API (#33) | Done (PR [#114](../../../pull/114) closing [#33](../../../issues/33)) |
| Friends page (frontend) (#36) | Blocked by #33; ready to start |
| Core library reviews & rating (#26) | To do |
| Daily reading streak calculator (#31) | To do |
| User profile service & other profile access (#54, #58) | To do |
| Aggregated home endpoint (#44) | To do |

## Log

### 2026-11-05: Friendship domain, repository, service and API (#33)

PR [#114](../../../pull/114) closing issue [#33](../../../issues/33).

- Implemented the friendship domain and REST API for [F-SOC-01](../../product/requirements.md#f-soc-01--friends-requests-by-username--must):
  - Added pure domain aggregate root [`Friendship`](../../../apps/backend/src/features/friend/friend.ts) and value object `FriendshipId` with `request()`, `reconstitute()`, `accept()` and `decline()`. Invariant errors (`CannotFriendSelfError`, `FriendshipNotFoundError`, `FriendshipNotPendingError`, `UnauthorizedFriendshipActionError`) map to standard HTTP errors via [`error-handler.ts`](../../../apps/backend/src/middleware/error-handler.ts).
  - Extended [`friend-repository.ts`](../../../apps/backend/src/features/friend/friend-repository.ts) (`IFriendRepository` and `DrizzleFriendRepository`) with `findById`, `findBetween`, `pendingFor`, `save`, and `delete` on the `friendships` table, maintaining backwards compatibility with `areFriends` and `friendsOf`.
  - Added [`friend-service.ts`](../../../apps/backend/src/features/friend/friend-service.ts) with `request`, `accept`, `decline`, `pendingRequestsFor`, `removeFriend`, `friendsOf`, and `areFriends`. All methods operate strictly by IDs (`UserId`, `FriendshipId`).
  - Added [`friend-dto.ts`](../../../apps/backend/src/features/friend/friend-dto.ts) (`FriendshipDto`, `toFriendshipDto`).
  - Added [`friend-routes.ts`](../../../apps/backend/src/features/friend/friend-routes.ts) mounting:
    - `POST /friend-requests` (`requesterId`, `targetUserId`): sends request (`201` Created) or returns existing with status (`200` OK).
    - `GET /user/:userId/friend-requests`: returns incoming pending requests for the user.
    - `POST /friend-requests/:id/accept`: accepts a pending request.
    - `POST /friend-requests/:id/decline`: declines/deletes a pending request (`204` No Content).
    - `DELETE /friends/:userId`: removes mutual friendship (`204` No Content).
    - `GET /user/:userId/friends`: returns list of accepted friends.
  - Wired into [`apps/backend/src/api/router.ts`](../../../apps/backend/src/api/router.ts) via `FriendService`.
  - Added unit tests in [`friend-service.test.ts`](../../../apps/backend/tests/unit/friend-service.test.ts) and integration tests in [`friend-api.test.ts`](../../../apps/backend/tests/integration/friend-api.test.ts).
- **Decision: operate on UUIDs rather than usernames for friend operations.** *Why:* the frontend already has the target user's UUID from search or group member profiles; UUID-based operations avoid redundant username-to-id roundtrips and match the rest of the API.
- **Decision: decline friend request returns 404 when acting user is not the recipient.** *Why:* matches security best practice to prevent leaking friendship IDs to non-participants.

## Next steps

- Merge PR #114 into `main` after CI and review.
- Wire frontend Friends page ([#36](../../../issues/36)) to the new friend request endpoints.
- Implement review table and rating API ([#26](../../../issues/26)).
- Implement streak calculator ([#31](../../../issues/31)).
