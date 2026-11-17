# Vision — Bookmarked

Structured as a product vision board: vision, target group, needs, product and business goals, plus stakeholders, horizon and non-goals.

## Vision

Make reading a social habit: readers keep coming back because their friends, clubs and streaks keep them going.

**Statement.** For readers who want to read more and share it, **Bookmarked** is a web app that turns reading into a trackable, social habit. Unlike a plain reading list, it combines a personal library, streaks, achievements, book clubs and reading challenges, so readers stay motivated by progress and by each other.

## Target group

- **Casual readers** who want to build a habit and see their progress.
- **Avid readers** who log many books, write reviews and chase challenges.
- **Social readers** who read with friends or in a club and want to talk about it.

## Needs

- Readers lose their habit because nothing reminds or rewards them for reading regularly.
- Reading lists and spreadsheets record books but are not social: readers cannot see what friends read or discuss it with them.
- Book clubs are spread over chat apps with no shared progress, so members fall behind and drop out.
- Readers want one place to keep what they read, what they thought of it, and what to read next.

## Product

The MVP (see [mvp.md](mvp.md)) delivers six features:

1. **Accounts:** sign up, log in and log out.
2. **Library:** want-to-read and read books, ratings, comments, shelves and tags, public or private.
3. **Search:** books (title, author, ISBN) and users, with a book page showing metadata, ratings and public comments.
4. **Book clubs and reading challenges:** create and join, text chat in real time, leaderboard.
5. **Gamification:** reading streak, achievements and badges, monthly recap.
6. **Friends:** friendship requests and other readers' public profiles.

It is a responsive web app, so it works on desktop and mobile browsers.

## Business goals

Measured on the deployed app at the end of the semester:

- **Engagement:** at least 20 test users log reading on 3 or more days in a week.
- **Social use:** at least 3 active clubs or challenges with 3 or more members.
- **Retention:** at least half of test users come back in the week after sign-up.
- **Course goal:** all six MVP features in production, built with the process required by LES (iterations, CI/CD, tests, reviews).

## Stakeholders

- **Readers:** the users above.
- **Development team:** Group 6, who build and run the app.
- **Course staff (LES, MESW):** product owner proxy and evaluators of each iteration.

## Horizon

- **Now to the end of the semester:** the MVP in production.
- **After the semester:** the items in [Beyond the MVP](#beyond-the-mvp), if the project continues.

## Non-goals

- No native mobile app.
- No selling, lending or hosting of books, and no e-book reader.
- No book recommendation engine in the MVP.
- No images or videos in chat in the MVP.
- No email or push notifications in the MVP.

## Beyond the MVP

| Feature | Description |
| --- | --- |
| Media in chat | Images and videos in club and challenge chats. |
| Recommendations | Suggest books based on similar readers, friends' reading, ratings and genres. |
| Reading sessions | Time each session, measure reading speed and remember the page where the reader stopped. |
| Club discussions | Lasting discussion threads inside a club, separate from the chat. |
| Custom challenges | Users design their own challenge rules for friendly competitions. |
| Secret achievements and yearly recap | Hidden missions (e.g. read 1000 minutes) and a recap of the whole year. |
| Notifications | Reminders before a streak is lost and alerts when dropping in a leaderboard. |
