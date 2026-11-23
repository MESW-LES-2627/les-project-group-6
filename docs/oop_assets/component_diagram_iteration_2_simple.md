# Component diagram, iteration 2 (simple view)

A continuation of the draw.io [iteration 1 component diagram](component_diagram_iteration_1.png), in the same simple style. It keeps the same services and links as iteration 1 and highlights what changed in iteration 2. The full diagram is [`component_diagram_iteration_2.png`](component_diagram_iteration_2.png).

How to read it:

- **Green boxes and green arrows** are new in iteration 2. Everything else was already in iteration 1.
- **Dashed grey boxes** are planned, not built yet.
- **Dotted arrows** are events: the sender publishes them and does not know who listens.
- **Red arrows** are direct calls that the [change analysis](change_anaysis_iteration_2.md) accepts as tight coupling for now.
- As in iteration 1, every HTTP request from the frontend goes through the auth middleware, which passes it to the backend services.

```mermaid
flowchart LR
    FE["App frontend<br/>(Vue SPA static site)"]
    AUTH["Authentication service<br/>(Supabase auth)"]
    MW["Auth middleware<br/>(Supabase auth provider)"]
    DB[("Supabase DB<br/>postgres")]
    OL["Open Library API<br/>(external)"]
    BUCKET[/"Asset bucket<br/>(planned)"/]

    subgraph BE["Backend (one Express app)"]
        BM["Books management service<br/>(catalogue, search)"]
        LIB["Library service<br/>(reading status)"]
        ORG["Library organisation service<br/>(folders, tags)"]
        EXP["Explore service<br/>(trending, most read)"]
        FB["Feedback service"]
        RS["Reading session service"]
        UM["Users management service<br/>(profile, streak)"]
        SL["Social links service"]
        GM["Group management service"]
        CH["Chat service"]
        BC["Book club service"]
        BCH["Book challenge service"]
        BADGE["Badge service<br/>(planned)"]
        NOTIF["Notification and feed<br/>(planned)"]
    end

    FE -. "authentication" .-> AUTH
    FE -. "HTTP requests" .-> MW
    FE -. "live messages" .-> CH
    MW -. "routes requests" .-> BE
    MW -. "load profile" .-> UM

    LIB -. "find book" .-> BM
    FB -. "book" .-> BM
    BC -. "propose book" .-> BM
    EXP -. "books" .-> BM
    BM -. "find missing books" .-> OL

    ORG -. "is the book in my library?" .-> LIB
    FB -. "can I review?" .-> LIB
    FB -. "who sees it?" .-> SL
    EXP -. "most added" .-> LIB
    EXP -. "top books" .-> RS
    BC -. "member progress" .-> LIB
    BC -. "counted minutes" .-> RS
    BCH -. "counted minutes" .-> RS
    RS -. "ensure in progress" .-> LIB

    GM -. "check invite (friends only)" .-> SL
    BC -. "reuse group logic" .-> GM
    BCH -. "reuse group logic" .-> GM
    BC -. "have chat" .-> CH
    BCH -. "have chat" .-> CH
    CH -. "store assets" .-> BUCKET

    RS -- "count a reading day" --> UM
    LIB -- "count a reading day" --> UM

    GM -. "MemberJoined" .-> CH
    GM -. "MemberJoined" .-> BC
    GM -. "MemberJoined" .-> BADGE
    RS -. "SessionCompleted" .-> BADGE
    UM -. "StreakExtended" .-> BADGE
    BADGE -. "BadgeEarned" .-> NOTIF

    AUTH -. "check / create credentials" .-> DB
    BE -. "all services read / write" .-> DB

    classDef new fill:#e6f4ea,stroke:#2e7d32
    classDef planned fill:#fafafa,stroke:#999,stroke-dasharray:5 5
    class LIB,ORG,EXP,OL new
    class BADGE,NOTIF,BUCKET planned
    linkStyle 2,5,8,9,10,11,12,13,14,15,16,17,18 stroke:#2e7d32
    linkStyle 25,26 stroke:#c0392b,stroke-width:2px
    linkStyle 27,28,29,30,31,32 stroke:#2e7d32,stroke-dasharray:2 3
```

## What changed from iteration 1

- **Books management was split.** Books management now only keeps the catalogue (books, search, adding a missing book). The reading status of each book moved to the new **Library service**.
- **New services:** **Library organisation** (folders and tags), **Explore** (trending and most read) and the outside **Open Library API**, used when a search finds too few local books.
- **Services ask each other instead of reading the database.** In iteration 1, Book club, Book challenge and Reading session each had their own line to the database. Now Book club, Book challenge and Explore ask Reading session and the Library service for what they need. The database link is shown once.
- **Feedback** still uses Books management for the book, and now also asks the Library service whether the reader can review it (reading status) and Social links who can see the review.
- **Users management owns the streak.** Reading session and the Library service call it to count a reading day (red arrows).
- **Events.** Group management announces `MemberJoined` (to Chat, Book club and Badge), Reading session announces `SessionCompleted`, and Users management announces `StreakExtended`.
- **Planned:** the **Badge service** and **Notification and feed**, which only listen to events, so no existing service has to call them.
