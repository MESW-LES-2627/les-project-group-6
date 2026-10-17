# LES: Database tables UML (v1.0)

Derived from `LES-UML.drawio` (17 skeleton classes, no relationships) and the product requirements v1.1.

**Drawio classes kept:** Book, User, Club, Review, Challenge, Conversation, List, ReadingStatus, Post, Leaderboard, LeaderboardEntry, ChallengeStatus, Genre, Author, Publisher, Category, ReadingSession.

**Added** to cover the requirements: friendships, library entries, read-throughs, folders/tags, streaks, goals, group members, anti-cheat, voting, badges, XP, notifications, retrospectives, etc.

**Mapping decisions**
- `ReadingStatus` is a lookup table of statuses (`not_started`, `in_progress`, `finished`, `dnf`). The per-user status lives in `user_books.status_id`.
- `Club` and `Challenge` are subtypes of a shared `groups` table (1:1 each), because both share membership, chat and leaderboard (F-GRP-01).
- `ChallengeStatus` is a lookup table (`draft`, `scheduled`, `active`, `finished`), from the lifecycle in F-GRP-04.
- `List` is the folder/shelf (F-LIB-03) and also the public curated list (F-EXP-05). Both are the same table with a visibility flag.
- `Category` is the parent of `Genre` (e.g. Category "Fiction", Genre "Action").
- `Conversation` is the group chat (1:1 with a group). `Post` is a chat message with optional media.

Legend: `PK` primary key, `FK` foreign key, `UK` unique. Cardinality uses crow's foot notation (`||` exactly one, `o|` zero or one, `}o` zero or many, `}|` one or many).

---

## 0. Overview (entities and relationships only)

```mermaid
erDiagram
    USER ||--|| USER_SETTINGS : has
    USER ||--o{ FRIENDSHIP : "requests/receives"
    USER ||--o{ USER_BOOK : "has in library"
    BOOK ||--o{ USER_BOOK : "saved as"
    READING_STATUS ||--o{ USER_BOOK : "current status"
    USER_BOOK ||--o{ READ_THROUGH : "re-reads"
    READ_THROUGH ||--o{ READING_SESSION : contains
    USER ||--o{ READING_SESSION : starts
    READING_SESSION ||--o{ SESSION_GROUP_SCORE : "counts in"
    GROUP ||--o{ SESSION_GROUP_SCORE : scores
    USER ||--o{ REVIEW : writes
    BOOK ||--o{ REVIEW : receives
    BOOK }o--o{ AUTHOR : "written by"
    BOOK }o--|| PUBLISHER : "published by"
    BOOK }o--o{ GENRE : "classified as"
    CATEGORY ||--o{ GENRE : groups
    USER ||--o{ LIST : owns
    LIST }o--o{ BOOK : contains
    USER ||--o{ GROUP_MEMBER : joins
    GROUP ||--o{ GROUP_MEMBER : has
    GROUP ||--o| CHALLENGE : "is a"
    GROUP ||--o| CLUB : "is a"
    CHALLENGE }o--|| CHALLENGE_STATUS : "in state"
    CLUB ||--o{ CLUB_ROUND : runs
    BOOK ||--o{ CLUB_ROUND : "selected for"
    GROUP ||--|| CONVERSATION : has
    CONVERSATION ||--o{ POST : contains
    GROUP ||--o{ LEADERBOARD : ranks
    LEADERBOARD ||--o{ LEADERBOARD_ENTRY : lists
    USER ||--o{ LEADERBOARD_ENTRY : scores
    USER ||--o{ USER_BADGE : earns
    BADGE ||--o{ USER_BADGE : "awarded as"
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ RETROSPECTIVE : gets
```

---

## 1. Identity, settings and social graph

```mermaid
erDiagram
    USER {
        uuid id PK
        string email UK
        string password_hash
        string display_name
        string username UK
        string photo_url
        string bio
        string role "user | admin (Q10)"
        string profile_visibility "private (default) | public"
        string preferences_label "F-PROF-04, e.g. Fiction / Action"
        string persona_label "F-PROF-05"
        bool persona_hidden
        int total_xp
        int level
        int books_read_count
        int counted_minutes
        int estimated_minutes "imports, never competitive"
        int challenges_won
        datetime onboarding_completed_at
        datetime created_at
    }
    USER_SETTINGS {
        uuid user_id PK, FK
        bool show_now_reading "F-SOC-04, default false"
        string streak_type "daily | weekly"
        int weekly_target_days
        int streak_min_minutes "default 5"
        string language
    }
    PASSWORD_RESET_TOKEN {
        uuid id PK
        uuid user_id FK
        string token_hash UK
        datetime expires_at "default +1h"
        datetime used_at
    }
    FRIENDSHIP {
        uuid id PK
        uuid requester_id FK
        uuid addressee_id FK
        string status "pending | accepted | declined"
        datetime created_at
        datetime responded_at
    }
    EMAIL_INVITATION {
        uuid id PK
        uuid inviter_id FK
        string email
        uuid accepted_user_id FK "set on sign up"
        datetime created_at
    }
    USER_GENRE_PREFERENCE {
        uuid user_id PK, FK
        uuid genre_id PK, FK
    }
    USER_GOAL {
        uuid id PK
        uuid user_id FK
        int year
        int target_books
        int target_minutes
        datetime achieved_at
    }
    USER_STREAK {
        uuid user_id PK, FK
        int current_streak
        int longest_streak
        date last_counted_day
        int freezes_available "max 2"
    }
    STREAK_FREEZE_EVENT {
        uuid id PK
        uuid user_id FK
        string kind "earned | used"
        date day
    }

    USER ||--|| USER_SETTINGS : has
    USER ||--o{ PASSWORD_RESET_TOKEN : requests
    USER ||--o{ FRIENDSHIP : "requester"
    USER ||--o{ FRIENDSHIP : "addressee"
    USER ||--o{ EMAIL_INVITATION : sends
    USER ||--o{ USER_GENRE_PREFERENCE : likes
    USER ||--o{ USER_GOAL : sets
    USER ||--|| USER_STREAK : has
    USER ||--o{ STREAK_FREEZE_EVENT : logs
```

Notes
- `FRIENDSHIP` is unique on the unordered pair (requester, addressee). Only `accepted` rows make a mutual friendship.
- `books_read_count`, `counted_minutes`, `estimated_minutes`, `total_xp`, `level` are denormalized profile counters (F-PROF-01, F-GAM-03).

---

## 2. Catalog (Book, Author, Publisher, Genre, Category)

```mermaid
erDiagram
    BOOK {
        uuid id PK
        string title
        string isbn10 UK
        string isbn13 UK
        string description
        int page_count
        int publication_year
        string cover_url "default cover if null"
        uuid publisher_id FK
        uuid created_by_user_id FK "null = imported catalog"
        bool is_community_added
        float avg_rating "derived, public only"
        int ratings_count
        datetime created_at
    }
    AUTHOR {
        uuid id PK
        string name
    }
    BOOK_AUTHOR {
        uuid book_id PK, FK
        uuid author_id PK, FK
        int position
    }
    PUBLISHER {
        uuid id PK
        string name
    }
    CATEGORY {
        uuid id PK
        string name UK "e.g. Fiction"
    }
    GENRE {
        uuid id PK
        uuid category_id FK
        string name UK "e.g. Action"
    }
    BOOK_GENRE {
        uuid book_id PK, FK
        uuid genre_id PK, FK
    }

    PUBLISHER ||--o{ BOOK : publishes
    BOOK ||--o{ BOOK_AUTHOR : ""
    AUTHOR ||--o{ BOOK_AUTHOR : ""
    CATEGORY ||--o{ GENRE : groups
    BOOK ||--o{ BOOK_GENRE : ""
    GENRE ||--o{ BOOK_GENRE : ""
```

Notes
- `BOOK_AUTHOR` and `BOOK_GENRE` resolve the many-to-many relations (a book has several authors/genres).
- Only `title` is required (F-BOOK-02). The duplicate warning is application logic on title plus author similarity.

---

## 3. Library, reviews, folders and tags

```mermaid
erDiagram
    READING_STATUS {
        smallint id PK
        string code UK "not_started | in_progress | finished | dnf"
        string label
    }
    USER_BOOK {
        uuid id PK
        uuid user_id FK
        uuid book_id FK
        smallint status_id FK
        string dnf_reason "Not for me | Too slow | Will try later | Other | free text"
        int progress_percent
        int current_page
        bool is_imported "added via F-PROF-03"
        int estimated_minutes "page_count / pace, imports only"
        datetime added_at
    }
    READ_THROUGH {
        uuid id PK
        uuid user_book_id FK
        int sequence_no "1, 2, 3..."
        smallint status_id FK
        date started_on
        date finished_on
        int progress_percent
    }
    REVIEW {
        uuid id PK
        uuid user_id FK
        uuid book_id FK
        smallint rating "1 to 5"
        string comment
        int helpful_count
        datetime created_at
        datetime updated_at
    }
    LIST {
        uuid id PK
        uuid owner_id FK
        string name
        string description "public lists"
        string cover_url
        string visibility "private | public"
        uuid copied_from_list_id FK
        int followers_count
        datetime created_at
    }
    LIST_BOOK {
        uuid list_id PK, FK
        uuid book_id PK, FK
        int position
        datetime added_at
    }
    LIST_FOLLOW {
        uuid list_id PK, FK
        uuid user_id PK, FK
        datetime followed_at
    }
    TAG {
        uuid id PK
        uuid user_id FK
        string name "borrowed, audiobook, reread"
    }
    USER_BOOK_TAG {
        uuid user_book_id PK, FK
        uuid tag_id PK, FK
    }
    BOOK_RECOMMENDATION {
        uuid id PK
        uuid sender_id FK
        uuid receiver_id FK
        uuid book_id FK
        string note
        datetime created_at
    }

    USER ||--o{ USER_BOOK : owns
    BOOK ||--o{ USER_BOOK : "saved in"
    READING_STATUS ||--o{ USER_BOOK : "current status"
    READING_STATUS ||--o{ READ_THROUGH : "status"
    USER_BOOK ||--o{ READ_THROUGH : "re-reads"
    USER ||--o{ REVIEW : writes
    BOOK ||--o{ REVIEW : receives
    USER ||--o{ LIST : owns
    LIST ||--o{ LIST_BOOK : contains
    BOOK ||--o{ LIST_BOOK : "listed in"
    LIST ||--o{ LIST_FOLLOW : "followed by"
    USER ||--o{ LIST_FOLLOW : follows
    LIST o|--o{ LIST : "copied as"
    USER ||--o{ TAG : defines
    USER_BOOK ||--o{ USER_BOOK_TAG : ""
    TAG ||--o{ USER_BOOK_TAG : ""
    USER ||--o{ BOOK_RECOMMENDATION : sends
    USER ||--o{ BOOK_RECOMMENDATION : receives
    BOOK ||--o{ BOOK_RECOMMENDATION : "is sent"
```

Notes
- Unique constraints: `USER_BOOK (user_id, book_id)` ("exactly one current status per user", F-LIB-01), `REVIEW (user_id, book_id)`, `READ_THROUGH (user_book_id, sequence_no)`.
- "Books read" counts each finished `READ_THROUGH` (F-LIB-05). The book page shows "Read N times" from the same table.
- A review counts in the public average only if the author's profile is public (Q4). This is a query filter, not a column.
- Folders (F-LIB-03) and public curated lists (F-EXP-05) share `LIST`. Copy sets `copied_from_list_id` (F-LIB-07).

---

## 4. Reading sessions, progress and anti-cheat scoring

```mermaid
erDiagram
    READING_SESSION {
        uuid id PK
        uuid user_id FK
        uuid book_id FK
        uuid read_through_id FK
        datetime started_at
        datetime ended_at "null while running"
        string state "running | paused | stopped"
        int duration_seconds
        int counted_minutes "profile value, lowest across groups"
        int pages_read
        int end_page
        bool is_manual "profile only, never in groups (Q7)"
        datetime created_at
    }
    SESSION_PAUSE {
        uuid id PK
        uuid session_id FK
        datetime paused_at
        datetime resumed_at
        string reason "user | inactivity | no_confirmation"
    }
    SESSION_GROUP_SCORE {
        uuid session_id PK, FK
        uuid group_id PK, FK
        int counted_minutes "after anti-cheat rules"
        int points "per group win metric"
        datetime created_at
    }
    PROGRESS_LOG {
        uuid id PK
        uuid user_book_id FK
        uuid session_id FK "optional"
        int page
        int percent
        datetime logged_at
    }
    USER_READING_PACE {
        uuid user_id PK, FK
        float pages_per_minute
        int sample_sessions "needs 5+"
        datetime updated_at
    }

    USER ||--o{ READING_SESSION : starts
    BOOK ||--o{ READING_SESSION : "read in"
    READ_THROUGH ||--o{ READING_SESSION : contains
    READING_SESSION ||--o{ SESSION_PAUSE : has
    READING_SESSION ||--o{ SESSION_GROUP_SCORE : "counts in"
    GROUP ||--o{ SESSION_GROUP_SCORE : scores
    USER_BOOK ||--o{ PROGRESS_LOG : tracks
    READING_SESSION o|--o{ PROGRESS_LOG : "logged at end of"
    USER ||--o| USER_READING_PACE : has
```

Notes
- One active session per user: partial unique index on `READING_SESSION (user_id)` where `state in ('running','paused')`.
- `SESSION_GROUP_SCORE` is what lets one session count in several groups (Q8) while the profile receives it **once** (F-GRP-03 rule 4). Profile minutes use `READING_SESSION.counted_minutes`.
- Estimated minutes live on `USER_BOOK.estimated_minutes` and are never joined into `SESSION_GROUP_SCORE`.

---

## 5. Groups: challenges, book clubs, chat and leaderboards

```mermaid
erDiagram
    GROUP {
        uuid id PK
        string name
        string picture_url
        string category "challenge | book_club"
        uuid admin_id FK
        int max_members "default 50 (Q11)"
        bool anti_cheat_still_reading
        int still_reading_interval_min
        bool anti_cheat_auto_pause
        int inactivity_timeout_min
        int daily_cap_minutes
        bool anti_cheat_page_required
        string win_metric "minutes | pages | books | streak"
        datetime created_at
    }
    GROUP_MEMBER {
        uuid group_id PK, FK
        uuid user_id PK, FK
        string role "admin | member"
        string status "invited | active | declined | left | removed"
        uuid team_id FK "team vs team"
        datetime joined_at
        datetime left_at
    }
    GROUP_INVITE {
        uuid id PK
        uuid group_id FK
        uuid inviter_id FK
        uuid invitee_id FK
        string status "pending | accepted | declined"
        datetime created_at
    }
    TEAM {
        uuid id PK
        uuid challenge_id FK
        string name
    }
    CHALLENGE_STATUS {
        smallint id PK
        string code UK "draft | scheduled | active | finished"
    }
    CHALLENGE {
        uuid group_id PK, FK
        smallint status_id FK
        date start_date
        date end_date
        int duration_days
        uuid rematch_of_group_id FK
        datetime finished_at
    }
    CHALLENGE_WINNER {
        uuid challenge_id PK, FK
        uuid user_id PK, FK
        int final_score
    }
    CLUB {
        uuid group_id PK, FK
        uuid current_round_id FK
        bool anonymous_proposals
        int max_proposals_per_member "default 1"
    }
    CLUB_ROUND {
        uuid id PK
        uuid club_id FK
        uuid book_id FK
        int round_no
        date deadline
        string status "active | completed | not_completed"
        datetime completed_at
    }
    CLUB_ROUND_PROGRESS {
        uuid round_id PK, FK
        uuid user_id PK, FK
        int progress_percent
        datetime finished_at
    }
    CONVERSATION {
        uuid id PK
        uuid group_id FK, UK
        datetime created_at
    }
    POST {
        uuid id PK
        uuid conversation_id FK
        uuid author_id FK "null for system messages"
        string kind "text | image | video | system"
        string body
        datetime created_at
        datetime deleted_at
        uuid deleted_by FK
    }
    POST_MEDIA {
        uuid id PK
        uuid post_id FK
        string media_type "image | video"
        string url
        string mime_type
        bigint size_bytes
    }
    LEADERBOARD {
        uuid id PK
        uuid group_id FK
        uuid round_id FK "club round, optional"
        string metric
        bool is_frozen
        datetime updated_at
    }
    LEADERBOARD_ENTRY {
        uuid leaderboard_id PK, FK
        uuid user_id PK, FK
        int score
        int rank "ties share a rank"
        datetime updated_at
    }
    LIVE_ROOM {
        uuid id PK
        uuid group_id FK
        uuid opened_by FK
        datetime opened_at
        datetime closed_at
    }
    LIVE_ROOM_PARTICIPANT {
        uuid room_id PK, FK
        uuid user_id PK, FK
        datetime joined_at
        datetime left_at
    }
    NUDGE {
        uuid id PK
        uuid group_id FK
        uuid sender_id FK
        uuid receiver_id FK
        date sent_on
    }

    USER ||--o{ GROUP : administers
    GROUP ||--o{ GROUP_MEMBER : has
    USER ||--o{ GROUP_MEMBER : joins
    GROUP ||--o{ GROUP_INVITE : sends
    GROUP ||--o| CHALLENGE : "is a"
    GROUP ||--o| CLUB : "is a"
    CHALLENGE }o--|| CHALLENGE_STATUS : "in state"
    CHALLENGE ||--o{ TEAM : "split into"
    TEAM ||--o{ GROUP_MEMBER : "includes"
    CHALLENGE ||--o{ CHALLENGE_WINNER : "won by"
    USER ||--o{ CHALLENGE_WINNER : wins
    CLUB ||--o{ CLUB_ROUND : runs
    BOOK ||--o{ CLUB_ROUND : "selected for"
    CLUB_ROUND ||--o{ CLUB_ROUND_PROGRESS : tracks
    USER ||--o{ CLUB_ROUND_PROGRESS : reads
    GROUP ||--|| CONVERSATION : has
    CONVERSATION ||--o{ POST : contains
    USER ||--o{ POST : writes
    POST ||--o{ POST_MEDIA : attaches
    GROUP ||--o{ LEADERBOARD : ranks
    CLUB_ROUND o|--o{ LEADERBOARD : "per round"
    LEADERBOARD ||--o{ LEADERBOARD_ENTRY : lists
    USER ||--o{ LEADERBOARD_ENTRY : scores
    GROUP ||--o{ LIVE_ROOM : hosts
    LIVE_ROOM ||--o{ LIVE_ROOM_PARTICIPANT : has
    USER ||--o{ LIVE_ROOM_PARTICIPANT : joins
    GROUP ||--o{ NUDGE : in
    USER ||--o{ NUDGE : sends
    USER ||--o{ NUDGE : receives
```

Notes
- `GROUP` is the shared supertype. `CHALLENGE` and `CLUB` use `group_id` as both PK and FK (1:1 subtype). The `category` column decides which subtype row must exist.
- Anti-cheat and win metric are set at creation and frozen after start (F-GRP-01 rule 4, F-READ-03). Enforce this in the application.
- `LEADERBOARD_ENTRY.score` is the sum of `SESSION_GROUP_SCORE.points` for the user within the challenge period or club round.
- Challenge lifecycle (`CHALLENGE_STATUS`): draft, scheduled, active, finished, and rematch back to draft (a new challenge pointing to `rematch_of_group_id`).
- `NUDGE` limits (1 per sender/receiver/day, max 3 received per day) come from a unique `(sender_id, receiver_id, sent_on)` plus a count query.

---

## 6. Book club voting

```mermaid
erDiagram
    CLUB_VOTE {
        uuid id PK
        uuid club_id FK
        uuid opened_by FK
        datetime closes_at
        string status "open | closed"
        uuid selected_proposal_id FK "admin's final choice"
    }
    BOOK_PROPOSAL {
        uuid id PK
        uuid vote_id FK
        uuid book_id FK
        uuid proposed_by FK "hidden in UI if anonymous"
        datetime created_at
    }
    BOOK_VOTE {
        uuid proposal_id PK, FK
        uuid voter_id PK, FK
        datetime voted_at
    }

    CLUB ||--o{ CLUB_VOTE : opens
    CLUB_VOTE ||--o{ BOOK_PROPOSAL : "has options"
    BOOK ||--o{ BOOK_PROPOSAL : "proposed as"
    USER ||--o{ BOOK_PROPOSAL : proposes
    BOOK_PROPOSAL ||--o{ BOOK_VOTE : receives
    USER ||--o{ BOOK_VOTE : casts
```

Note: `proposed_by` is always stored. Anonymity is a display rule driven by `CLUB.anonymous_proposals`.

---

## 7. Social feed, gamification, retrospective and notifications

```mermaid
erDiagram
    ACTIVITY_EVENT {
        uuid id PK
        uuid actor_id FK
        uuid group_id FK "null = friends feed only"
        string event_type "session_done | progress | badge | challenge_won | book_finished"
        uuid book_id FK
        uuid session_id FK
        uuid badge_id FK
        json payload
        datetime created_at
    }
    EVENT_REACTION {
        uuid event_id PK, FK
        uuid user_id PK, FK
        string reaction "like | emoji code"
        datetime created_at
    }
    BADGE {
        uuid id PK
        string code UK
        string name
        string icon_url
        string description
        string unlock_condition "rule key + threshold"
        string visibility "visible | secret"
        string rarity "common | rare | legendary"
        int xp_reward "25 / 75 / 200"
    }
    USER_BADGE {
        uuid user_id PK, FK
        uuid badge_id PK, FK
        int progress "e.g. 6 of 10"
        datetime earned_at "null until earned"
    }
    XP_LEDGER {
        uuid id PK
        uuid user_id FK
        int xp
        string source "minutes | book | badge | challenge | club_round"
        uuid source_id
        datetime created_at
    }
    LEVEL_DEFINITION {
        int level PK
        string title "e.g. Bookworm"
        int xp_required
    }
    RETROSPECTIVE {
        uuid id PK
        uuid user_id FK
        string period_type "monthly | yearly"
        date period_start
        json stats "books, minutes, longest session, top genre..."
        bool shared_to_feed
        datetime generated_at
    }
    NOTIFICATION {
        uuid id PK
        uuid user_id FK
        string type "friend_request | group_invite | challenge_end | badge | nudge | book_sent | retro | streak_risk | vote_opened | club_book_chosen"
        json payload
        bool email_sent
        datetime read_at
        datetime created_at
    }
    NOTIFICATION_PREFERENCE {
        uuid user_id PK, FK
        string type PK
        bool email_enabled
    }

    USER ||--o{ ACTIVITY_EVENT : performs
    GROUP o|--o{ ACTIVITY_EVENT : "group feed"
    BOOK o|--o{ ACTIVITY_EVENT : about
    BADGE o|--o{ ACTIVITY_EVENT : about
    ACTIVITY_EVENT ||--o{ EVENT_REACTION : receives
    USER ||--o{ EVENT_REACTION : gives
    BADGE ||--o{ USER_BADGE : "awarded as"
    USER ||--o{ USER_BADGE : earns
    USER ||--o{ XP_LEDGER : accumulates
    XP_LEDGER }o--|| LEVEL_DEFINITION : "maps to level"
    USER ||--o{ RETROSPECTIVE : gets
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ NOTIFICATION_PREFERENCE : configures
```

Notes
- `USER_BADGE` rows exist for visible badges from the start (to show progress, F-GAM-01 rule 2). Secret badges get a row only when earned. Badges are permanent.
- Rarity percentage (F-GAM-02) is computed: `count(earned user_badge) / count(user)`.
- `XP_LEDGER` is the audit trail. `USER.total_xp` and `USER.level` are its denormalized sum. Estimated (imported) minutes never write to it.
- Trending lists (F-EXP-04) and suggestions (F-EXP-06) are queries over `READING_SESSION`, `USER_BOOK`, `REVIEW` and `FRIENDSHIP`. They need no tables of their own.

---

## 8. Open points to confirm

1. **`READ_THROUGH` vs `USER_BOOK.status`**: `USER_BOOK.status_id` holds the current status, and each read-through also has its own status. If you prefer a simpler model, drop `READ_THROUGH.status_id` and derive it from `finished_on`.
2. **`GROUP` table name**: `GROUP` is a reserved SQL word. In the physical schema use `groups` (and `users` for `USER`).
3. **Club and Challenge as subtypes vs two separate tables**: I used subtypes to share membership, chat and leaderboard. Two independent tables would duplicate `GROUP_MEMBER`, `CONVERSATION` and `LEADERBOARD` foreign keys.
4. **Denormalized counters** on `USER` and `BOOK` (minutes, books read, average rating) are for speed. Drop them if you prefer to compute from source tables.
5. **Language (Q9)** is stored as `USER_SETTINGS.language` but is not decided yet.
