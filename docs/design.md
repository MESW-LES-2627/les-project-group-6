# Design

How Bookmarked is designed, and how that design changed from one iteration to the next. Each iteration has a class diagram and a component diagram, with the images in [`oop_assets/`](oop_assets/). A diagram shows the target architecture for the whole project, so it also includes components that are not built yet.

## Contents

- [Iteration 0](#iteration-0)
  - [Class diagram](#class-diagram)
  - [Component diagram](#component-diagram)
  - [Event storming](#event-storming)
- [Iteration 1](#iteration-1)
  - [Class diagram](#class-diagram-1)
  - [Component diagram](#component-diagram-1)
  - [Change analysis](#change-analysis)
- [Iteration 2](#iteration-2)
  - [Class diagram](#class-diagram-2)
  - [Component diagram](#component-diagram-2)
  - [Change analysis](#change-analysis-1)

## Iteration 0

### Class diagram

The domain model of the first plan, drawn from the [iteration 0 component diagram](#component-diagram). It shows the concepts the product talks about and how they relate, not the code. PNG: [`class_diagram_iteration_0.png`](oop_assets/class_diagram_iteration_0.png).

```mermaid
classDiagram
    class User {
        +id: UUID
        +email: String
        +username: String
        +photoUrl: String
    }
    class Book {
        +id: UUID
        +title: String
        +author: String
        +isbn: String
        +pageCount: Integer
        +coverUrl: String
    }
    class Review {
        +rating: Integer
        +text: String
        +createdAt: DateTime
    }
    class Comment {
        +text: String
        +createdAt: DateTime
    }
    class Label {
        +name: String
    }
    class Challenge {
        +id: UUID
        +name: String
        +startDate: Date
        +endDate: Date
        +join(user: User)
        +leave(user: User)
    }
    class ChatMessage {
        +text: String
        +sentAt: DateTime
    }
    class MediaAttachment {
        +url: String
        +type: MediaType
    }
    class MediaType {
        <<enumeration>>
        IMAGE
        VIDEO
    }
    class ReadingSession {
        +startedAt: DateTime
        +endedAt: DateTime
        +durationMinutes: Integer
        +currentPage: Integer
        +start()
        +finish()
    }
    class Leaderboard {
        +recalculate()
    }
    class LeaderboardEntry {
        +position: Integer
        +totalMinutes: Integer
    }
    class Streak {
        +currentDays: Integer
        +longestDays: Integer
        +lastReadDate: Date
    }
    class Achievement {
        +name: String
        +description: String
    }
    class Notification {
        +message: String
        +createdAt: DateTime
        +isRead: Boolean
        +send()
    }

    User "1" -- "0..*" Review : writes
    Book "1" -- "0..*" Review : receives
    User "1" -- "0..*" Comment : writes
    Book "1" -- "0..*" Comment : receives
    Book "0..*" -- "0..*" Label : tagged with
    Challenge "0..*" -- "1..*" User : members
    Challenge "0..*" --> "0..1" Book : chosen book
    Challenge "1" *-- "0..*" ChatMessage : chat
    User "1" -- "0..*" ChatMessage : sends
    ChatMessage "1" *-- "0..1" MediaAttachment
    MediaAttachment ..> MediaType
    User "1" -- "0..*" ReadingSession : reads
    ReadingSession "0..*" --> "1" Book
    Challenge "1" *-- "1" Leaderboard
    Leaderboard "1" *-- "0..*" LeaderboardEntry
    LeaderboardEntry "0..*" --> "1" User
    ReadingSession ..> Leaderboard : triggers recalculation
    User "1" *-- "1" Streak
    User "0..*" -- "0..*" Achievement : earns
    User "1" -- "0..*" Notification : receives
```

- A **Challenge** is the only kind of group. It holds its members, its chat and a stored **Leaderboard**.
- A **ReadingSession** stores the current page as well as the time, and finishing one triggers a leaderboard recalculation.
- **Streak**, **Achievement** and **Notification** are stored per user and kept up to date as the reader reads.
- **Review**, **Comment** and **Label** are the feedback on a book. A chat message can carry one photo or video.

### Component diagram

![Component diagram, iteration 0](oop_assets/component_diagram_iteration_0.png)

The first design, made in the first week of the project, before any code was written.

| Component | Responsibility |
|---|---|
| **App frontend** | The web app the reader uses. It calls the Authentication service on the login page and the backend services for everything else. |
| **Authentication service** | An external service, Supabase Auth. It creates user accounts, logs users in and authenticates every route that needs a signed-in user. |
| **Database** | One central PostgreSQL database hosted on Supabase. It holds the authentication tables and the application tables. |
| **Books management service** | CRUD for books: get a book from the external book API or the database, create a book when it is not in either (any reader), and update or delete book metadata (admin only). |
| **Search engine service** | Looks up books and user profiles. A result opens the book's details or the user's profile. Book searches go through the Books management service. |
| **Feedback service** | Saves book reviews, comments and labels. |
| **Challenge management service** | Creates reading challenges: friendly competitions where friends see who reads more within a time window. Each challenge has a group chat. |
| **Chat service** | Stores each group's message history. Photos and videos are uploaded to object storage (a bucket), and their link is saved with the message. |
| **Reading session service** | Times a reading session for the book the reader chose. When a session ends, it triggers the leaderboard update. |
| **Leaderboard sync service** | Recalculates the challenge leaderboard: the total minutes each member has read since the challenge started. |
| **Gamification component** | Takes the minutes of each reading session, records the days the reader read, and keeps the streaks, achievements and challenges won. |
| **Notification service** | Sends notifications for every component that needs one: joining a challenge, a leaderboard change, a broken streak or a completed achievement. |

### Event storming

![Event storming, iteration 0](oop_assets/eventstorming.png)

The event flow of the app: actors (small yellow), commands (blue), domain events (orange), policies (pink) and external systems (red), split into subdomains (red boxes). The large yellow stickies are the aggregates.

| Subdomain | Aggregates |
|---|---|
| **Authentication** | User Account |
| **Search engine** | Book |
| **Group Sessions** | Book Challenge, Reading Session |
| **Chat** | Chat Message |
| **Library** | Review, Reading Status |
| **Profile** | None yet (streaks and badges come from policies) |

## Iteration 1

### Class diagram

The domain model after the first release, following the [iteration 1 component diagram](#component-diagram-1). Classes marked «planned» are part of the design but not built yet. PNG: [`class_diagram_iteration_1.png`](oop_assets/class_diagram_iteration_1.png).

```mermaid
classDiagram
    class User {
        +id: UUID
        +email: Email
        +username: Username
        +displayName: String
        +bio: String
        +photoUrl: String
        +timezone: String
        +profileVisibility: ProfileVisibility
        +register()$ User
        +rename(displayName: String)
        +moveTo(timezone: String)
        +makeProfilePublic()
        +makeProfilePrivate()
    }
    class Friendship {
        +status: FriendshipStatus
        +createdAt: DateTime
        +respondedAt: DateTime
    }
    class Book {
        +id: UUID
        +title: BookTitle
        +isbn13: Isbn13
        +pageCount: PageCount
        +description: String
        +coverUrl: String
        +isCommunityAdded: Boolean
        +progressAt(page: Integer) PageProgress
    }
    class ReadingStatus {
        +progress: PageProgress
        +updatedAt: DateTime
        +startReading()
        +finish()
        +abandon()
        +moveBackToShelf()
        +updateProgress(progress: PageProgress)
    }
    class ReadingState {
        <<abstract>>
        +tracksProgress: Boolean
        +start() ReadingState
        +finish() ReadingState
        +abandon() ReadingState
        +moveBackToShelf() ReadingState
    }
    class NotStarted
    class InProgress
    class Finished
    class DidNotFinish
    class ReadingSession {
        +startedAt: DateTime
        +endedAt: DateTime
        +durationSeconds: Integer
        +countedMinutes: Integer
        +start()$ ReadingSession
        +finish(now: DateTime)
        +cancel()
        +isActive() Boolean
    }
    class Group {
        <<abstract>>
        +id: UUID
        +name: GroupName
        +description: String
        +createdAt: DateTime
        +isMember(user: User) Boolean
        +isAdmin(user: User) Boolean
    }
    class Membership {
        +role: MemberRole
        +joinedAt: DateTime
    }
    class ChallengeGroup {
        +period: ChallengePeriod
        +winMetric: WinMetric
        +metricGoal: Integer
        +/standings: Standing[*]
        +statusAt(now: DateTime) ChallengeStatus
    }
    class BookClub {
        +/currentRound: Round
        +/memberProgress: Progress[*]
        +startNextRound(book: Book, deadline: Date)
    }
    class Round {
        +number: Integer
        +startDate: Date
        +deadline: Date
        +outcome() RoundOutcome
    }
    class BookPoll {
        +closesAt: DateTime
        +anonymous: Boolean
        +propose(member: User, book: Book) Proposal
        +vote(member: User, proposal: Proposal)
        +close()
    }
    class Proposal {
        +createdAt: DateTime
    }
    class Vote {
        +castAt: DateTime
    }
    class GroupInvite {
        +status: InviteStatus
        +createdAt: DateTime
        +respondedAt: DateTime
        +send()$ GroupInvite
        +accept()
        +decline()
    }
    class ChatMessage {
        +seq: Integer
        +kind: MessageKind
        +body: MessageBody
        +createdAt: DateTime
        +deletedAt: DateTime
        +write()$ ChatMessage
        +system()$ ChatMessage
        +deleteBy(user: User)
    }
    class Attachment {
        <<planned>>
        +url: String
        +type: MediaType
    }
    class Review {
        <<planned>>
        +rating: Integer
        +text: String
    }
    class Badge {
        <<planned>>
        +name: String
    }
    class MemberRole {
        <<enumeration>>
        ADMIN
        MEMBER
    }
    class WinMetric {
        <<enumeration>>
        MINUTES
        PAGES
        BOOKS
        STREAK
    }
    class InviteStatus {
        <<enumeration>>
        PENDING
        ACCEPTED
        DECLINED
    }
    class MessageKind {
        <<enumeration>>
        TEXT
        SYSTEM
    }

    User "1" -- "0..*" Friendship : requests
    User "1" -- "0..*" Friendship : receives

    User "1" -- "0..*" ReadingStatus : library
    ReadingStatus "0..*" --> "1" Book
    ReadingStatus "1" --> "1" ReadingState : state
    ReadingState <|-- NotStarted
    ReadingState <|-- InProgress
    ReadingState <|-- Finished
    ReadingState <|-- DidNotFinish

    User "1" -- "0..*" ReadingSession : reads
    ReadingSession "0..*" --> "1" Book

    Group <|-- ChallengeGroup
    Group <|-- BookClub
    Group "1" *-- "1..*" Membership
    Membership "0..*" --> "1" User : member
    Membership ..> MemberRole
    ChallengeGroup ..> WinMetric
    ChallengeGroup ..> ReadingSession : ranks members from

    BookClub "1" *-- "1..*" Round
    Round "0..*" --> "1" Book
    BookClub "1" *-- "0..*" BookPoll
    BookPoll "1" *-- "0..*" Proposal
    BookPoll "1" *-- "0..*" Vote
    Proposal "0..*" --> "1" Book
    Proposal "0..*" --> "1" User : proposed by
    Vote "0..*" --> "1" Proposal
    Vote "0..*" --> "1" User : voter
    BookClub ..> ReadingStatus : member progress from

    Group "1" -- "0..*" GroupInvite
    GroupInvite "0..*" --> "1" User : inviter
    GroupInvite "0..*" --> "1" User : invitee
    GroupInvite ..> InviteStatus

    Group "1" *-- "0..*" ChatMessage : chat
    ChatMessage "0..*" --> "0..1" User : author
    ChatMessage ..> MessageKind
    ChatMessage "1" *-- "0..*" Attachment

    User "1" -- "0..*" Review : writes
    Book "1" -- "0..*" Review : receives
    User "0..*" -- "0..*" Badge : earns
```

#### What changed from iteration 0

- **Group is an abstract class with two subclasses (generalization).** **ChallengeGroup** (competitive: a period, a win metric and a goal) and **BookClub** (cooperative: rounds and polls) both inherit the name, description, members and admin rules from **Group**. Group also owns what both kinds share: the **Membership** list (with a role, admin or member), the **GroupInvite**s and the **ChatMessage**s.
- **Membership** replaces the direct link between User and Challenge, because a member now has a role and a join date.
- **The leaderboard is a derived attribute** (`/standings`), not a stored class. The challenge works it out from its members' reading sessions when it is read, so Leaderboard and LeaderboardEntry are gone. A book club's `/memberProgress` is derived the same way from reading statuses.
- **ReadingStatus (new)** is a reader's entry for one book in their library, with the current page. Its status uses the **State pattern**: the abstract **ReadingState** with the subclasses NotStarted, InProgress, Finished and DidNotFinish, each deciding which changes are allowed. The current page moved here from ReadingSession, which now only stores the time read.
- **BookClub** is composed of **Round**s (each with a book and a deadline) and **BookPoll**s, which are composed of **Proposal**s and **Vote**s.
- **Friendship (new)** links two users, the requester and the addressee. Groups use it to check that invites go only to friends.
- **ChatMessage** now has a kind (text or system), so the group can post messages such as "X joined the group".
- **Streak, Achievement and Notification were removed** from the model: streaks will be worked out from reading sessions when read ([infra.md](architecture/infra.md)), and Badge and Review stay as «planned».

### Component diagram

![Component diagram, iteration 1](oop_assets/component_diagram_iteration_1.png)

The design updated to what was learned while building the first release (`iter-1`).

#### What changed from iteration 0

- **Auth middleware (new).** The backend now has one entry point for authentication. Every HTTP request carries the reader's Supabase token (JWT). The middleware verifies it with Supabase's public keys (JWKS) and loads the reader's profile from the Users management service before the request reaches any other service. The frontend still signs up and logs in directly with Supabase Auth.
- **Users management service (new).** Owns the reader's profile: creating it after sign-up (username, display name, timezone), reading and updating it, and later the reader's stats and badges. Supabase Auth only knows the email and password; everything else about the user lives in our own `users` table, which uses the same id as the Supabase account.
- **Social links service (new).** Owns friendships: friend requests and each reader's list of friends. Groups use it to check that a reader only invites friends.
- **Group management service (new).** Holds what reading challenges and book clubs have in common: members, admins and invites. When an invite is accepted, the new member joins the group, the chat posts "X joined the group", and in a book club the current book is added to the member's library.
- **Book club service (new).** A second kind of group. A challenge is competitive: friends race to read the most. A book club is cooperative: everyone reads the same book. The club works in rounds, each with a book and a deadline, and members choose the next book with a poll (propose a book, then vote). The club page shows each member's progress on the current book.
- **Challenge management → Book challenge service.** Now only handles reading challenges: dates, the win metric, the goal and the leaderboard. Book clubs moved to their own service, and membership and invites moved to Group management.
- **Leaderboard sync service removed.** Nothing is recalculated when a session ends. The Book challenge service works out the leaderboard from the members' reading sessions each time someone opens the challenge, and the Book club service does the same for member progress. There is no stored leaderboard to keep in sync.
- **Search engine service removed.** Book search is part of the Books management service. User search will belong to the Users management service.
- **Books management service** also keeps each reader's library: the reading status of each book (not started, in progress, finished or did not finish) and the current page.
- **Chat service** is shared by both kinds of group. Messages are sent and loaded over HTTP, and new messages are pushed live to members who have the group open (Socket.IO). Group management, Book club and Book challenge post system messages in it, such as "X joined the group".
- **Reading session service** is shared too. It only stores when a session started and ended and how long it lasted, timed on the server so a session survives a closed tab. Book club and Book challenge read these sessions to rank or follow their members.
- **Gamification and Notification** are not in this diagram yet. Following the decision in [infra.md](architecture/infra.md), streaks and stats will be worked out from the reading sessions when they are read, not stored and updated by a background job.

### Change analysis

The change scenario for this iteration is **adding book clubs** next to reading challenges. The full analysis is in [`oop_assets/change_analysis_iteration_1.md`](oop_assets/change_analysis_iteration_1.md): the scenario, a coupling analysis using the Balanced Coupling model ([modularity skill](https://github.com/vladikk/modularity)), a cohesion analysis, the options considered, and the decision. The decision is a shared `Group` kernel (membership, roles, the member-joined event), with `ChallengeGroup` and `BookClub` as specialisations in their own modules.

## Iteration 2

### Class diagram

The domain model at the end of iteration 2 (`iter-2`), following the [iteration 2 component diagram](#component-diagram-2). Classes marked «planned» are part of the design but not built yet.

![Class diagram, iteration 2](oop_assets/class_diagram_iteration_2.png)

#### What changed from iteration 1

- **Library organisation (new).** A reader owns **Folder**s (private, name unique ignoring case, a book can be in several) and **Tag**s (free text, lower case, created on first use and deleted when no book has them). Both can only hold books that are already in the reader's library.
- **Review is built.** It leaves the «planned» list: a **Rating** from 1 to 5 plus an optional **ReviewComment**, one review per reader and book, allowed only when the book's `ReadingState` has `allowsReview` (In progress, Finished, Did not finish).
- **Book has Authors and an outside catalogue.** `Book` is linked to one or more **Author**s (unique ignoring case and accents). The **BookCatalog** interface, with the **OpenLibraryCatalog** adapter, is how books missing from our database are found and imported by ISBN-13.
- **ReadingStatus has dates.** `startedOn` and `finishedOn` are stored, and `setDates` edits them.
- **User has a streak.** `currentStreak`, `longestStreak` and `lastReadDate`, updated by `recordReadingDay`. A finished session of 5+ counted minutes, or 5+ pages of progress on a book in progress, or finishing a book counts as a reading day (the two dashed links from ReadingSession and ReadingStatus to User).
- **Group can be left.** `requireCanLeave` keeps the admin from leaving while others remain. `Group` also stores its `kind` (challenge or book club).
- **Domain events (Observer).** **SessionCompleted** is published when a session finishes and **MemberJoined** when an invite is accepted. SessionCompleted has no listener yet.
- **Badges (planned).** **Badge**, **BadgeAward** and a **BadgeRule** per badge (ThousandMinutes, WeekWarrior and Marathon first) react to SessionCompleted, MemberJoined and the new planned event **StreakExtended**, and publish **BadgeEarned**. This is the decision of the [change analysis](#change-analysis-1).

### Component diagram

![Component diagram, iteration 2](oop_assets/component_diagram_iteration_2.png)

The architecture at the end of iteration 2. The components are modules of **one Express backend** deployed together (the box in the picture); they are drawn as separate services because each one owns its rules and talks to the others through a small contract. Dashed boxes and lines are planned. **Red lines** are the links the [change analysis](#change-analysis-1) marks as unbalanced and accepted for now.

<details>
<summary>Mermaid source of the component diagram</summary>

```mermaid
---
config:
  layout: elk
---
flowchart TB
    FE["App frontend<br/>(Vue SPA, static site)"]
    SA["Authentication service<br/>(Supabase Auth)"]
    OL["Open Library API<br/>(external)"]
    DB[("Supabase DB<br/>Postgres")]
    BK[/"Asset bucket<br/>(planned)"/]

    subgraph BE["Backend API: one Express app, one module per component"]
        direction TB
        AM["Auth middleware<br/>(verifies JWT)"]
        UM["Users management<br/>profile, reading streak"]
        SE["Search engine service<br/>find books and users"]
        SL["Social links<br/>friend requests, friends"]
        BM["Books management<br/>catalogue, fuzzy search,<br/>add a missing book"]
        LS["Library service<br/>reading status, library view"]
        LO["Library organisation<br/>folders, tags"]
        FS["Feedback service<br/>ratings and reviews"]
        EX["Explore service<br/>trending, most read"]
        RS["Reading session service<br/>timer, counted minutes"]
        GM["Group management<br/>members, invites, leave"]
        BC["Book club service<br/>rounds, polls"]
        CH["Book challenge service<br/>competition rules"]
        CS["Chat service<br/>messages, live push"]
        ST["Statistics service<br/>stats, badges, achievements<br/>(planned)"]
        NF["Notification and feed<br/>(planned)"]
    end

    FE -->|"login, signup,<br/>password recovery"| SA
    FE -->|"HTTP + JWT"| AM
    FE <-->|"Socket.IO"| CS
    AM -->|"load profile"| UM
    SE -->|"find books"| BM
    SE -->|"find users"| UM

    BM -->|"BookCatalog port<br/>3 s timeout, 1 h cache"| OL
    LS -->|"find book"| BM
    LO -->|"LibraryMembership:<br/>is the book in my library?"| LS
    FS -->|"can I review?<br/>(reading status)"| LS
    FS -->|"who sees it?<br/>(friends, profile)"| SL
    FS -->|"book"| BM
    EX -->|"topBooks()"| RS
    EX -->|"mostAdded()"| LS
    EX -->|"books"| BM

    RS -->|"count a reading day"| UM
    LS -->|"count a reading day"| UM
    RS -->|"ensure in progress"| LS
    UM -->|"streak calendar,<br/>reading stats"| RS

    CH -->|"countedMinutes()"| RS
    BC -->|"countedMinutes()"| RS
    BC -->|"progressOf()"| LS
    BC -->|"propose a book"| BM
    CH -->|"reuse group logic"| GM
    BC -->|"reuse group logic"| GM
    CH -->|"postSystem()"| CS
    BC -->|"postSystem()"| CS
    GM -->|"invite only friends"| SL
    GM -.->|"MemberJoined:<br/>announce"| CS
    GM -.->|"MemberJoined:<br/>add book to library"| BC

    RS -.->|"SessionCompleted"| ST
    UM -.->|"StreakExtended"| ST
    GM -.->|"MemberJoined"| ST
    ST -.->|"BadgeEarned"| NF
    CS -.->|"store assets"| BK

    BE ==>|"all components read and write"| DB
    SA -->|"check or create credentials"| DB

    classDef planned stroke-dasharray: 5 5,fill:#f6f6f6,stroke:#888
    class ST,NF,BK planned
    classDef ext fill:#fff4e5,stroke:#b9770e
    class OL,SA ext
    linkStyle 15,16,18 stroke:#c0392b,stroke-width:2px
    style BE fill:#fafafa,stroke:#999
```

</details>

#### What changed from iteration 1

- **Books management** asks the outside **Open Library API** when a search finds fewer than 5 local books, through the `BookCatalog` port (3 s timeout, in-memory cache for 1 hour). Search is typo-tolerant (Postgres `pg_trgm`), and a reader can add a missing book by hand.
- **Library service (new).** Owns the reading status of each book and the library view. It publishes two read contracts: `LibraryMembership` (is this book in the reader's library?) and `ReadingProgressQuery` (`progressOf`, `mostAdded`).
- **Library organisation (new).** Folders and tags. It uses `LibraryMembership` and never reads the library's tables.
- **Feedback service** now exists: ratings and reviews, shown to the reader, their friends and (for public profiles) everyone.
- **Explore service (new).** Trending and most-read lists, built from `topBooks()` of the Reading session service and `mostAdded()` of the Library service.
- **Reading session service** publishes `ReadingActivityQuery` (`countedMinutes`, `topBooks`), which Book challenge, Book club and Explore use. They no longer read the sessions table. It also publishes `SessionCompleted`.
- **Users management** now owns the **reading streak**. Reading session and Library service call it to count a reading day (red lines).
- **Group management** also handles leaving a group and publishes `MemberJoined`, which Chat (announcement) and Book club (add the round book to the library) react to.
- **Search engine service (new).** One entry point for search: it finds books through Books management and users through Users management, so the frontend has a single search to call.
- **Statistics service and Notification and feed (planned).** The Statistics service holds reading stats, badges and achievements. Both subscribe to events only; nothing existing calls them.

### Change analysis

The change scenario for this iteration is **adding reader badges** (and, after them, notifications and the feed). The full analysis is in [`oop_assets/change_anaysis_iteration_2.md`](oop_assets/change_anaysis_iteration_2.md): the scenario and its context, the coupling and cohesion analysis with strength, distance and volatility, the options considered, and the decision. The decision is a **Badge module that subscribes to events** (`SessionCompleted`, `MemberJoined` and one new `StreakExtended`) and publishes `BadgeEarned`, while the streak stays a direct call for now. The analysis for the previous scenario (book clubs, iteration 1) is in [`oop_assets/change_analysis_iteration_1.md`](oop_assets/change_analysis_iteration_1.md).