# Feature scope and sprint plan

Draft v0.1 · 2026-10-17

The [requirements](requirements.md) describe the full product. That is too much for 4 sprints (about 2 months) with 5 developers. This file cuts it into three tiers so we build a small app that works end to end first, then grow it.

| Tier | What it is | When |
|---|---|---|
| **1. Core** | The smallest app that delivers the product idea: *track your reading and compete with friends*. If we only finish this, we still have a working product. | Sprints 1 and 2 |
| **2. Extras** | Features that make the app feel complete. Built only on top of a working Core. | Sprints 3 and 4 |
| **3. Optional** | Nice ideas we keep in the backlog. Only if a sprint finishes early. | Not planned |

Each item keeps its requirement ID (`F-XXX-NN`) so issues can link back to [requirements.md](requirements.md). When an item is only part of a requirement, the cut is written next to it.

---

## The core loop

Everything in Core serves one loop. If a feature does not help this loop, it is not Core.

```
sign up → find or add a book → put it in my library → read with the timer
        → my minutes and streak grow → I compete with friends in a challenge → I see the leaderboard
```

---

## Tier 1: Core (sprints 1 and 2)

### Access

| ID | Feature | Scope in Core |
|---|---|---|
| F-AUTH-01 | Sign up, log in, log out | Email, password, display name, unique username. Every page needs login. Uses Supabase Auth ([ADR-0002](../ADRs/0002-external-dependencies.md)). |
| F-AUTH-02 | Password reset by email | Supabase Auth gives this almost for free, so it stays in Core. |

### Books and library

| ID | Feature | Scope in Core |
|---|---|---|
| F-EXP-01 | Search books | Search by title or author through Open Library. **Cut:** user search moves to Extras, ISBN search to Extras. |
| F-BOOK-01 | Book page | Cover, title, author, pages, description, my status, my rating. **Cut:** public reviews, friends who read it, send to friend. |
| F-BOOK-02 | Add a missing book | Title required, other fields optional, default cover with the title. **Cut:** duplicate warning. |
| F-LIB-01 | Library with status | Not started, In progress, Finished, DNF. Several books in progress at once. Starting a session moves a book to In progress. Finishing records the date. |
| F-LIB-06 | Did not finish | Mark as DNF with an optional reason from a fixed list. |
| F-LIB-02 | Rate and comment | 1 to 5 stars and an optional comment, editable. Visible on my profile only. |

### Reading

| ID | Feature | Scope in Core |
|---|---|---|
| F-READ-01 | Reading session timer | Start and stop a session for a library book. Only one active session per user. The session survives closing the tab (start time is stored on the server). Summary at the end. Minutes go to the profile and to active challenges. **Cut:** pause and resume can wait until Extras if time is short. |
| F-READ-04 | Daily streak | Current and longest streak, computed from sessions (one session of at least 5 minutes per day). **Cut:** freeze and weekly streak move to Extras. |

### Profile and friends

| ID | Feature | Scope in Core |
|---|---|---|
| F-PROF-01 | Profile | Display name, username, books finished and in progress with ratings, books read, total minutes, current and longest streak, challenges won. **Cut:** badges, level, genre label, folders. |
| F-PROF-02 | Privacy | One simple rule for Core: **my profile is visible to my friends only**. The public/private switch moves to Extras. |
| F-SOC-01 | Friends | Send a request by exact username, accept or decline, remove a friend. **Cut:** invite by email. |

### Groups (challenge only)

| ID | Feature | Scope in Core |
|---|---|---|
| F-GRP-01 | Create a group | Name, category fixed to Challenge. The creator is admin and invites friends, who accept or decline. Members can leave. **Cut:** picture, remove member, admin transfer. |
| F-GRP-04 | Challenge | Start date and end date. Only sessions inside the period count. When it ends, the leaderboard freezes and the first place wins (ties all win). **Cut:** rematch, system chat messages. |
| F-GRP-03 | Leaderboard | Ranked by counted minutes, ties share the rank, computed from the sessions (no cached table needed yet). |

### Home

| ID | Feature | Scope in Core |
|---|---|---|
| F-HOME-01 | Home page | Currently reading with a one-click "Start session", current streak, my active challenges with my rank, pending friend and group invites, empty state for new users. **Cut:** goal ring, feed, friends reading now, trending. |

**Core is done when** a new user can sign up, add two friends, create a one-week challenge, read with the timer for a few days, and see the streak, profile stats and leaderboard update correctly.

---

## Tier 2: Extras (sprints 3 and 4)

Ordered by value. Sprint 3 takes the top of the list, sprint 4 continues down. What does not fit stays in the backlog.

| # | ID | Feature | Notes |
|---|---|---|---|
| 1 | F-GRP-07 | **Book club** | One book, a deadline, each member's progress, round completed or not. The second group type, central to the product. Needs page tracking (#2). |
| 2 | F-READ-02 | Page and progress tracking | Log current page or percent at the end of a session. Progress bar on Home, library, book page. Personal pace can come later. |
| 3 | F-GRP-02 | Group chat, text only | Text messages, delete own message, new messages appear without refresh (Supabase Realtime or polling). Images and videos are Optional. |
| 4 | F-READ-05 | Yearly goal | Goal in books and/or minutes, progress ring on Home. |
| 5 | F-GAM-01 | Badges, small catalog | About 6 visible badges that are easy to check: Thousand Minutes, Week Warrior (7-day streak), Month Master (30), Marathon (3-hour session), Group Reader, Goal Getter. Secret badges are Optional. |
| 6 | F-PROF-03 | Import books already read | Add finished books in bulk, estimated minutes = pages ÷ 1 page per minute (300 pages if unknown), shown separately and never counted in groups. |
| 7 | F-ONB-01 | Onboarding, short | Welcome, add current book, import past reads (#6), set goal (#4). Every step skippable. **Cut:** genres, invite friends, tour. |
| 8 | F-NOT-01 | In-app notifications | Notification center with unread count for friend requests, group invites, challenge results, badges. **Cut:** emails. |
| 9 | F-READ-04 | Streak freeze | Earn 1 freeze per 7-day streak, max 2, used automatically on a missed day. |
| 10 | F-PROF-02 + F-SOC-02 + F-EXP-01 | Public profiles and user search | Public/private switch, search users, open a public profile, send a friend request from it. |
| 11 | F-EXP-02 | Public ratings on the book page | Average rating and public reviews (public profiles only). |
| 12 | F-SOC-03 | Activity feed | Friends' and groups' events (finished a book, finished a session, earned a badge, won a challenge). **Cut:** reactions. |
| 13 | F-LIB-03 | Folders | Create, rename, delete folders, a book in several folders. All private. |
| 14 | F-GRP-05 | Challenge win metrics | Add Most pages and Most books finished. Longest streak is Optional. |
| 15 | F-BOOK-03 | Find a book by ISBN | Typing an ISBN opens the book or the "add missing book" form pre-filled. |
| 16 | F-GAM-03 | XP and levels | XP from minutes, finished books, badges, challenges won. Level shown on the profile. |
| 17 | F-READ-03 | Anti-cheat, daily cap only | One group setting: max counted minutes per day. Other checks are Optional. |

---

## Tier 3: Optional (backlog)

Kept for after Extras, or for a future version. We do not plan them in any sprint.

| ID | Feature |
|---|---|
| F-GRP-02 | Images and videos in the group chat |
| F-GRP-08 | Book club voting and proposals |
| F-GRP-04 | Challenge rematch, system messages in chat |
| F-GRP-06 | Team vs team |
| F-GRP-09 | Live "read together now" rooms |
| F-GRP-10 | Nudges and "streak at risk" reminders |
| F-READ-03 | Other anti-cheat checks ("still reading?", auto-pause, page required) |
| F-READ-04 | Weekly streak |
| F-READ-02 | Personal reading pace in import estimates |
| F-SOC-01 | Invite friends by email (needs Resend) |
| F-SOC-03 | Reactions on feed events |
| F-SOC-04 | Friends reading now |
| F-SOC-05 | Send a book to a friend |
| F-NOT-01 | Email notifications and email preferences |
| F-BOOK-02 | Duplicate warning when adding a book |
| F-BOOK-04 | Barcode scan with the webcam |
| F-LIB-04 | Tags and library filters |
| F-LIB-05 | Re-reads |
| F-LIB-07 | Copy or follow a public folder |
| F-PROF-04 | Genre preference label |
| F-PROF-05 | Reader persona |
| F-EXP-03 | Friends who read this |
| F-EXP-04 | Trending lists |
| F-EXP-05 | Curated public reading lists |
| F-EXP-06 | Personalized suggestions |
| F-GAM-01 | Secret badges and the full badge catalog |
| F-GAM-02 | Badge rarity tiers |
| F-RET-01 | Monthly and yearly retrospective |

---

## Requirements that change priority

These are marked **Must** in [requirements.md](requirements.md) but this plan moves them down. If the team agrees, update the MoSCoW tags in the requirements to match.

| ID | Was | Now | Why |
|---|---|---|---|
| F-ONB-01 Onboarding | Must | Extra (short version) | The app works without it. It mostly reuses other features (import, goal). |
| F-PROF-03 Import past reads | Must | Extra | Nice for new users but not part of the core loop. |
| F-LIB-03 Folders | Must | Extra | Statuses already organize the library. |
| F-GRP-07 Book club | Must | Extra (first in line) | Challenge already proves groups and leaderboards. Book club reuses them in sprint 3. |
| F-GRP-02 Group chat | Must | Extra (text only), media Optional | Real-time chat and file upload are a lot of work and not in the core loop. |
| F-GAM-01 Badges | Must | Extra (small catalog) | Needs stable sessions, streaks and goals first. |
| F-NOT-01 Notifications | Must | Extra (in-app only), email Optional | Pending invites on Home cover Core. |
| F-EXP-02 Public ratings | Must | Extra | Depends on public profiles. |
| F-SOC-02 Find other users | Must | Extra | In Core, friends are added by exact username. |

---

## Sprint plan

Assumes 4 sprints of about 2 weeks and 5 developers. The streams are a suggestion for splitting issues so people do not block each other.

### Sprint 1: walking skeleton

Goal: a user can log in, find or add a book, put it in the library and run a timer. Rough UI is fine.

| Stream | Work |
|---|---|
| Setup | Frontend and backend projects, database, migrations for the Core tables, CI, deploy of a first version. |
| Auth | F-AUTH-01, F-AUTH-02, route guard, user table with username. |
| Books | `BookCatalog` interface + Open Library adapter, search, book page, F-BOOK-02. |
| Library | F-LIB-01, F-LIB-06, library page. |
| Reading | F-READ-01 timer (start, stop, one active session, survives tab close). |

### Sprint 2: Core complete

Goal: the full core loop works. End of sprint 2 = **tiny product delivered**.

| Stream | Work |
|---|---|
| Friends | F-SOC-01 requests by username, friend list. |
| Challenge | F-GRP-01, F-GRP-04: create, invite, accept, period rules, winner at the end. |
| Leaderboard | F-GRP-03 ranking, session minutes counted in the right challenges. |
| Profile and streak | F-PROF-01, F-READ-04 daily streak, F-LIB-02 rating. |
| Home | F-HOME-01 Core version, empty state, polishing the UI with the palette. |

### Sprint 3: Extras, first half

Goal: the second group type and the features that keep people coming back.

Book club (Extras #1) · page tracking (#2) · text chat (#3) · yearly goal (#4) · badges (#5) · import and onboarding (#6, #7).

### Sprint 4: Extras, second half and hardening

Goal: social layer, then stop adding features in the last days to fix bugs, test and prepare the delivery.

Notifications (#8) · streak freeze (#9) · public profiles and user search (#10) · public ratings (#11) · feed (#12) · then #13 onwards if there is time.

**Rule for every sprint:** finish and merge what is started before taking the next item. A smaller app that works beats a big app that half works.

---

## Tables needed for Core

Only a subset of [table_UML.md](../architecture/table_UML.md) is needed for sprints 1 and 2. The rest is added when its feature is built.

`users`, `books`, `authors`, `book_authors`, `reading_status`, `user_books`, `reviews`, `reading_sessions`, `friendships`, `groups`, `group_members`, `group_invites`, `challenges`, `challenge_status`, `challenge_winners`.

Streak and leaderboard values can be computed from `reading_sessions` in Core. Cached tables (`user_streak`, `leaderboard_entry`) can come later if queries get slow.

---

## Open points to decide with the team

1. Is **Challenge** the right group type for Core, or should it be Book club?
2. Is sprint length really 2 weeks, and are there class deadlines that fix what must be shown at the end of each iteration?
3. Does the class require any specific feature (for example real-time chat) that would move it up from Extras?
