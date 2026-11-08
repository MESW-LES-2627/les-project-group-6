# Change analysis: adding book clubs

A change scenario for Bookmarked, analysed for coupling and cohesion, with the design decision it led to. The scenario is written from the start of iteration 1, using the first [class diagram](class_diagram_iteration_0.png) and [component diagram](component_diagram_iteration_0.png). The code at the end of iteration 1 shows how the decision was carried out.

## 1. Scenario

> The product needs a second kind of group: the **book club**. A challenge is competitive: friends race to read the most within a time window. A book club is cooperative: everyone reads the same book in **rounds** with a deadline, members **propose and vote** on the next book in a poll, and the club shows each member's **progress** on the current book.

Why it is plausible: book clubs were in the [Vision](../iterations/0/Vision.md) from the start, and the database schema already had `book_clubs` and `book_club_rounds` tables when challenges were built (`fd29f4b`).

What the design looked like before the change:

- **Component diagram.** One *Challenge Management Service* owned the members, the group chat, and the link to the leaderboard. The *Reading Session Service* triggered the *Leaderboard Sync Service* when a session ended.
- **Code at `fd29f4b` (2026-10-31).** A group *was* a challenge. `GroupId`, `GroupName`, `MemberRole`, `Membership`, `isMember` and the admin rule all lived inside the `ChallengeGroup` aggregate in `features/challenge-group/challenge-group.ts`.

## 2. Coupling analysis

The analysis uses the **Balanced Coupling** model by Vlad Khononov, as packaged in the [modularity skill](https://github.com/vladikk/modularity). It rates each connection between two components on three dimensions:

- **[Integration strength](https://coupling.dev/posts/dimensions-of-coupling/integration-strength/):** how much knowledge they share. From strongest to weakest: *intrusive* (one reads the other's private data), *functional* (they share business rules), *model* (they share a domain model) and *contract* (they share only a small published interface).
- **[Distance](https://coupling.dev/posts/dimensions-of-coupling/distance/):** how expensive it is to change both sides together.
- **[Volatility](https://coupling.dev/posts/dimensions-of-coupling/volatility/):** how likely the shared knowledge is to change. It is judged by DDD subdomain: core (high), supporting, or generic (low).

A connection is **[balanced](https://coupling.dev/posts/core-concepts/balance/)** when `(STRENGTH XOR DISTANCE) OR NOT VOLATILITY`. In words: share a lot only with things close by, keep far things to a small contract, and accept imbalance only where nothing changes.

**How the analysis is set up**

- **Level.** The unit is a feature module inside the one backend service (`apps/backend/src/features/*`). At this level, a sibling feature module is *high* distance and code inside the same module is *low* distance.
- **Strength as high or low.** *Contract* is low. *Model*, *functional* and *intrusive* are high.
- **Volatility** comes from the Vision, where challenges and clubs are the product's edge:
  - **Core (high):** `challenge-group`, `book-club`, and the rule for which reading minutes count.
  - **Supporting (low):** group membership, `reading-status`, `friend`, `book`.
  - **Generic (low):** `user` and auth (Supabase), and the chat transport (Socket.IO).

### 2.1 Before: adding a book club to the first design

| Naive option | Knowledge shared | Strength | Distance | Volatility | Balance |
|---|---|---|---|---|---|
| **A.** `book-club` imports membership from `challenge-group` | The challenge aggregate's model: ids, roles, members, the admin check | Model | Sibling (high) | High. Challenges were changing that same week (`a180c7b` ScoreStrategy). | **Unbalanced.** Every challenge refactor puts book clubs at risk. |
| **B.** `book-club` copies the membership code | The same business rules, written twice | Functional (duplicated) | Sibling (high) | Medium. Invites and chat must work "for any group". | **Unbalanced.** A membership rule changes in two places, and invites and chat need two code paths. |
| **C.** One `ChallengeGroup` class with a `type` flag, holding rounds and polls too | Rounds and polls share almost nothing with win metrics | Low between the two halves | Same class (low) | High | **Unbalanced: low cohesion.** Unrelated things are forced together. |
| **D.** First design: the club's chat goes through Challenge Management | The club depends on the challenge service to talk | Functional | Separate service (high) | High | **Unbalanced.** A core, volatile service becomes a gateway for something unrelated to challenges. |
| **E.** First design: Reading Session triggers the leaderboard | Reading Session knows that leaderboards exist and when to refresh them | Functional (control coupling) | Separate service (high) | High | **Unbalanced.** Club progress would need a second trigger, so Reading Session would change for every new kind of group. |

Every cheap way of adding book clubs to the first design creates unbalanced coupling in the most volatile part of the product.

### 2.2 After: the code at the end of iteration 1

The shared kernel was moved to `features/group/group.ts` (`7a919bd`): `GroupId`, `GroupName`, `MemberRole`, `Membership`, `GroupRoster`, and the `MemberJoined` event with its listener interface. `book-club` (`2f8830c`) and `challenge-group` both build on it.

| # | From → To | Knowledge shared | Strength | Distance | Volatility | Balance |
|---|---|---|---|---|---|---|
| 1 | book-club → group | `GroupId`, `GroupName`, `Membership`, `MemberRole`, the not-admin and not-member errors | Model (shared kernel) | Sibling | Low | Balanced, because volatility is low |
| 2 | challenge-group → group | The same kernel types | Model (shared kernel) | Sibling | Low | Balanced, because volatility is low |
| 3 | group-invite → group | `GroupRoster` (`isAdmin`, `isMember`), the `MemberJoined` listeners | Model | Sibling | Low | Balanced, because volatility is low |
| 4 | group-invite → friend | `areFriends()` | Contract | Sibling | Low | Balanced |
| 5 | book-club, challenge-group → group-chat | `SystemMessages.postSystem(groupId, text)`, an optional port | Contract | Sibling | Medium | Balanced (loose coupling) |
| 6 | group-chat and book-club ← `MemberJoined` event | Observer on a three-field event. On join, chat posts "X joined" and the club adds the round book to the member's library. | Contract | Sibling | Low to medium | Balanced |
| 7 | reading-session, reading-status → any group module | Nothing. They no longer know groups exist. | None | n/a | n/a | Balanced. This removes option E. |
| 8 | Inside book-club: `BookClub`, `Round`, `BookPoll` | Rules about rounds, deadlines, proposals and votes | Functional | Same module (low) | High | Balanced: **high cohesion** |
| 9 | group and group-invite → `book_clubs` table | The kind of a group is found by checking whether a `book_clubs` row exists, so the kernel knows about one of its own subtypes | Intrusive | Sibling | **High.** The set of group kinds is exactly what this scenario changes. | **Unbalanced (significant)** |
| 10 | book-club → reading-status | `ReadingStatus`, the `'finished'` value, and `updatedAt` read as "finished at" | Model, plus a hidden meaning | Sibling | Medium | **Unbalanced (minor)** |
| 11 | book-club `ClubProgressQuery` and challenge-group `standings-query` → `reading_sessions` table | Each query repeats the rule for counted minutes: the session ended, falls inside the period, and is summed from `counted_minutes` | **Intrusive**, plus a duplicated rule | Sibling | **High** (core gamification rule) | **Unbalanced (critical)** |
| 12 | book-club and challenge-group repositories → `groups` and `member` tables | Each category writes the kernel's rows itself, so three modules write `member` | Intrusive | Sibling | Low | Tolerable debt |

**About the two read queries (row 11).** Both files are written as CQRS read models, and reading across tables to build a view is a valid pattern. The model still counts it as *intrusive*, because what is shared is the *meaning* of a counted session, not only the column names. That meaning lives in `reading-session.ts` and is repeated in two places. If the rule changed (for example, discarding sessions or a pages metric), the reading-session module would change alone, and both group features would silently show wrong numbers.

## 3. Cohesion analysis

In the Balanced Coupling model, cohesion is the same rule seen from inside one component. *High cohesion* means high strength at low distance: things that share a lot of knowledge live together. *Low cohesion* means low strength at low distance: unrelated things are put together, and the module slowly turns into a big ball of mud.

**Before.** *Challenge Management* had two jobs: **being a group** (members, roles, admin, invites, chat) and **being a competition** (period, win metric, goal, leaderboard). A book club needs the first job but not the second. Putting clubs into it (option C) would have mixed rounds and polls with win metrics in one class. The *Reading Session Service* also had a job that wasn't its own: refreshing leaderboards.

**After.**

- **`group`** holds only what every group shares: identity, membership, roles, and the join event.
- **`challenge-group`** holds only the competition: the period, the win metric and its scoring strategy, and the standings.
- **`book-club`** holds only the cooperative reading: rounds, polls, proposals, votes and progress. Those classes share a lot of rules, and they all sit in one module (row 8).
- **`group-invite`** and **`group-chat`** are separate modules that work for any group, so neither has to change when a new kind of group is added.
- **`reading-session`** is back to one job: timing reading. It doesn't know groups exist (row 7).

One weak spot remains: the rule for which minutes count belongs to `reading-session`, but it is written out again in two group modules (row 11). That is low cohesion for the rule itself.

## 4. Options considered

| Option | Description | Coupling and cohesion | Verdict |
|---|---|---|---|
| **1. Copy** | A new `book-club` module that copies membership, invites and chat from challenges | Duplicated functional coupling at high distance. Every membership rule changes in two places. | Rejected |
| **2. Type flag** | One `Group`/`Challenge` class with `type: 'challenge' \| 'club'` and `if` statements on the type | Low cohesion. Every new kind adds more branches to the same class. | Rejected |
| **3. Club depends on challenges** | `book-club` reuses `challenge-group`'s membership | Model coupling to a core, volatile module | Rejected |
| **4. Shared group kernel + one module per kind** | Extract `Group` (abstract in the domain model) with membership, roles and the join event. `ChallengeGroup` and `BookClub` specialise it. Invites and chat work on any group. Cross-module calls go through small ports and events. | High coupling only to a small, stable kernel. Contracts everywhere else. High cohesion inside each module. | **Chosen** |

## 5. Decision

**Model a group as an abstract `Group` with a shared kernel (identity, membership, roles, the `MemberJoined` event), and model each kind of group (`ChallengeGroup`, `BookClub`) as a specialisation in its own module. Invites and chat depend only on the kernel. Other modules react to a member joining through the `MemberJoined` observer, and post to the chat through the `SystemMessages` port, instead of calling each other directly.**

Why:

- The only knowledge every group shares is membership. It is a *supporting* subdomain and rarely changes, so high-strength coupling to it is balanced (rows 1–3).
- The volatile, core rules (scoring a challenge, running rounds and polls) each stay inside one module, which gives high cohesion and keeps each module independent of the other kind.
- Cross-module side effects (posting "X joined", adding the round book to the library) use contract-level coupling (rows 4–6). A new kind of group, or a new reaction to a join, means adding a class, not editing the existing ones (open/closed principle).
- Reading Session no longer drives leaderboards. Standings and progress are worked out when they are read, which also follows the "computed on read" decision in [infra.md](../architecture/infra.md).

How it was carried out:

| Commit | Date | What it did |
|---|---|---|
| `fd29f4b` | 2026-10-31 | Challenge groups and reading sessions. At this point a group is only a challenge. |
| `090fb28` | 2026-11-02 (PR #111) | The group chat, with the `SystemMessages` port and the Socket.IO notifier |
| `7a919bd` | 2026-11-04 (PR #112) | "Share the group kernel between challenges and book clubs": membership moves to `features/group/` |
| `2f8830c` | 2026-11-04 (PR #112) | Book clubs and group invites, built on the kernel |

The kernel refactor and the book clubs were committed seconds apart on the same branch. It was one planned change, with the kernel extracted first so that book clubs could be added without touching challenges.

### Consequences and follow-ups

The decision leaves three imbalances. They are recorded here as known debt, ordered by severity.

1. **Critical: activity read from another module's table (row 11).** `reading-session` should publish a query contract, such as `countedMinutes(userIds, from, to)`, and `reading-status` should publish `progressOf(userIds, bookId)`. The standings and club progress queries then call these contracts instead of re-implementing the rule, which lowers the strength to *contract*.
2. **Significant: the kernel knows its subtypes (row 9).** Add an explicit `kind` column on `groups`, owned by the kernel. Then a third kind of group doesn't need changes in `group/` or `group-invite/`.
3. **Minor: hidden meaning and shared writes (rows 10 and 12).** `ReadingStatus` should expose `finishedAt` directly. Only `group` should write the `member` table.

The shared kernel must stay small. If roles grow (moderators, co-admins), membership becomes volatile, and rows 1–3 would become unbalanced.
