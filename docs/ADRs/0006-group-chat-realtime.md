# ADR-0006: Group Chat Delivery (REST for writes, Socket.IO for real-time push)

- **Status:** Proposed
- **Date:** 2026-10-27
- **Deciders:** Group 6
- **Context area:** Groups, chat (`apps/backend`, `apps/frontend`)

## Context

Every group has a chat visible only to its members (F-GRP-02). Messages must appear in real time for members who have the group open (rule 3), system messages are posted for key events (rule 5), and members can delete their own messages (rule 4). The first version supports **text only**. Images and videos (rule 2, TFR-04) come soon after and will be stored in a bucket.

Constraints:

- The backend is one Express 5 process ([ADR-0003](0003-backend-http-framework.md)) on a Render free web service, which sleeps after about 15 idle minutes.
- Data lives in PostgreSQL accessed with Drizzle, without Supabase RLS ([ADR-0004](0004-database-access-and-migrations.md)). Authorization is enforced by the backend.
- Users authenticate with Supabase Auth; the backend verifies the JWT ([ADR-0002](0002-external-dependencies.md), [infra.md](../architecture/infra.md)).
- Groups are small (friends only, typically under 10 members).

[infra.md](../architecture/infra.md) previously said "no WebSockets in Core; start with polling or SSE". This ADR replaces that line.

## Decision

1. **REST is the source of truth.** Sending and reading history go through the normal API, with the same auth middleware, membership checks and validation as every other endpoint:
   - `POST /groups/:groupId/messages` with `{ clientId, body }` saves a message and returns it.
   - `GET /groups/:groupId/messages?after=<seq>&limit=50` returns newer messages; `?before=<seq>` pages back through history.
   - `DELETE /groups/:groupId/messages/:messageId` soft-deletes (author or admin).
2. **Socket.IO only pushes.** After a message is saved (or deleted), the backend emits to the room `group:<groupId>`:
   - `message:new` with the saved message, and `message:deleted` with its id.
   - Clients never write through the socket. If the socket is down, the chat still works through REST.
3. **Socket authentication and rooms.** The client connects with its Supabase JWT in the Socket.IO `auth` payload. A connection middleware verifies it with the existing `SupabaseAuthProvider`. The client emits `group:join` with a group id and the server adds it to the room only if the user is a member. When the token expires, the client reconnects with a fresh one.
4. **Ordering, deduplication and catch-up** (adopted from the reference design in [1]):
   - Store first, then deliver: nothing is emitted before the row is committed.
   - Each message has a `seq` (`bigserial`), used for ordering and as the sync cursor instead of timestamps.
   - The client generates `clientId` (UUID). A unique constraint on `(author_id, client_id)` makes retries idempotent; the client also drops events whose id it already shows.
   - On (re)connect the client calls `GET …/messages?after=<last seq>` to fetch what it missed, then relies on pushes.
5. **Data model (text version):**

   ```text
   messages(id uuid, seq bigserial, group_id, author_id null, client_id null,
            kind 'text' | 'system', body text, created_at, deleted_at null)
   unique (author_id, client_id); index (group_id, seq)
   ```

   System messages have `kind = 'system'` and no author. A `ChatService` in the backend is the only place that writes messages and emits events; group events (member joined, challenge started, winner) call it.
6. **Hosting.** One Render instance with Socket.IO's in-memory adapter. Socket.IO's heartbeats and automatic reconnection cover Render restarts and sleep. If the backend ever runs more than one instance, add the Socket.IO Postgres adapter (no Redis needed).
7. **Media direction (decided in detail by a later ADR).** Files never go through the backend or the socket:
   - `POST /groups/:groupId/attachments` (type, size) checks membership and the TFR-04 limits and returns a **signed upload URL** for a private bucket (Supabase Storage, as [infra.md](../architecture/infra.md) plans).
   - The browser uploads directly, then sends the message with `attachmentIds`. A `message_attachments` table stores the key, MIME type, size and `pending | ready` status.
   - Reads return short-lived signed URLs, so only members can see media. The socket event carries the same message with attachment metadata.

## Considered options

| Option | Why not chosen |
|---|---|
| **Polling** (`GET ?after=` every few seconds) | Simplest and fully REST, but a delay of seconds and constant requests. It remains the fallback: the catch-up call is the same endpoint. |
| **Server-Sent Events** | Plain HTTP and enough for one-way push, but the team prefers WebSockets as the common choice for chat and for future two-way features (live reading rooms, F-GRP-09; typing indicators). |
| **Plain WebSockets (`ws`)** | Lighter, but rooms, heartbeats, reconnection and fallbacks would have to be written by hand. |
| **Supabase Realtime** | No connections on our server, but membership rules would have to be duplicated in RLS policies, and Supabase would become load-bearing beyond auth. |
| **Large-scale reference design** [1] (WebSocket gateways behind a load balancer, Redis connection routing, NoSQL store) | Built for millions of users. We take its store-then-deliver, sequence numbers, client message ids with dedupe, and catch-up on reconnect; the rest is unnecessary for one instance and small groups. |

## Consequences

### Positive

- Messages appear instantly for members with the group open (F-GRP-02 rule 3).
- All writes keep one code path (REST), tested with Supertest like the rest of the API.
- Retries never duplicate messages, and reconnecting never loses them.
- The same socket can later carry live reading rooms or typing indicators.
- Adding media changes the message payload, not the transport.

### Negative / risks

- **A second protocol to maintain.** Socket auth, room joins and token refresh are new code. *Mitigation:* the socket only pushes, authorization reuses `SupabaseAuthProvider` and the membership check from the groups service.
- **Two new dependencies** (`socket.io`, `socket.io-client`) with their own protocol. *Mitigation:* wrap them behind a small `ChatNotifier` (backend) and `chatSocket` (frontend) interface, following ADR-0002's rule.
- **In-memory rooms tie us to one instance.** *Mitigation:* Postgres adapter if we scale out.
- **Render sleep and restarts drop connections.** *Mitigation:* automatic reconnection plus the `after=<seq>` catch-up.
- **Removing a member** must also remove their socket from the room. *Mitigation:* the groups service calls `ChatNotifier.leave(userId, groupId)`.

## References

1. [How to design a real-time chat application](https://dev.to/ganesh_parella/how-to-design-a-real-time-chat-application-5go6), reference architecture at large scale.
- [Socket.IO documentation](https://socket.io/docs/v4/), including the [Postgres adapter](https://socket.io/docs/v4/postgres-adapter/)
- [Requirements: F-GRP-02](../product/requirements.md)
- [Infrastructure Specification](../architecture/infra.md)
- [ADR-0002](0002-external-dependencies.md), [ADR-0003](0003-backend-http-framework.md), [ADR-0004](0004-database-access-and-migrations.md)
