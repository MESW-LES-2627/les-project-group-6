# MVP

The MVP has 6 features. All of them must be delivered by the end of the project. Each feature is broken down into user stories in the table below.

## MVP features

| # | Feature | What the user gets |
| --- | --- | --- |
| 1 | User authentication | Create an account, log in and log out. |
| 2 | Book clubs and reading challenges | Create and join clubs and challenges, chat in real time with text messages, and follow a leaderboard. |
| 3 | Library | Store the books read and the books saved to read later, with a 1 to 5 rating, comments and descriptions that can be public or private. |
| 4 | Search | Find books and users by name and by serial number (ISBN), and open a book page with its metadata, rating and public comments. |
| 5 | Gamification | Reading day streak, achievements and badges, and the number of challenges won. |
| 6 | Friends | Send friendship requests, and see the public comments and read books of other users. |

## User stories

| ID | Feature | Story | Minimum scope |
| --- | --- | --- | --- |
| MVP-01 | User authentication | As a visitor, I want to create an account so that my reading data is saved. | Sign up with username, email and password through Supabase Auth; unique username and email. |
| MVP-02 | User authentication | As a user, I want to log in and out so that I can access my profile and data. | Log in and log out with email and password; session kept between visits. |
| MVP-03 | Book clubs and reading challenges | As a user, I want to create a book club or a reading challenge so that a group can read together. | Create with name, description and dates (challenges); choose public or invite only; list members. |
| MVP-04 | Book clubs and reading challenges | As a user, I want to join a club or a challenge so that I can take part in it. | Join an open club or challenge, or accept an invitation; leave it. |
| MVP-05 | Book clubs and reading challenges | As a member, I want a real-time chat so that I can talk with the group. | Text messages delivered in real time to every member; message history. Images and videos are out for now. |
| MVP-06 | Book clubs and reading challenges | As a member, I want a leaderboard so that I can compare my progress with the group. | Ranking of the members of a club or challenge by books or pages read; the winner of a challenge is recorded. |
| MVP-07 | Library | As a reader, I want to save books to read later and to mark the ones I read so that my reading history is complete. | Add a book to my library as "want to read" or "read", with the finish date for read books. |
| MVP-08 | Library | As a reader, I want to rate and comment on a book so that I remember and share my opinion. | Rating from 1 to 5, a comment and a description, each public or private; edit and delete my own. |
| MVP-09 | Search | As a user, I want to search books and users by name or serial number so that I can find what I am looking for. | One search box for books (title, author, ISBN) and users (username); open the result page. |
| MVP-10 | Search | As a user, I want to open a book to see its metadata so that I can decide if I want to read it. | Book page with publisher, author, pages and other metadata, the average rating and the public comments of other users. |
| MVP-11 | Gamification | As a reader, I want a reading streak so that I stay motivated to read every day. | A day counts when I log reading that day; show the current and the longest streak. |
| MVP-12 | Gamification | As a reader, I want achievements and badges so that reading feels rewarding. | A fixed set of achievements (e.g. first book, 7 day streak, 10 books) unlocked automatically; badges and the number of challenges won shown on the profile. |
| MVP-13 | Friends | As a user, I want to send friendship requests so that I can follow other readers. | Send, accept and reject requests; remove a friend. |
| MVP-14 | Friends | As a user, I want to see the public comments and the books read by other users so that I can see their reading. | Another user's profile shows their read books and their public comments; private ones are never shown. |

## Out of scope for the MVP

These items are left out of the MVP because we are not sure we can deliver them in time. They can move back in if there is time.

- Photos and videos in the chat (the chat is text only).
- Book recommendation system.
- User onboarding to the app.
- Email notifications about the streak and about losing positions in the leaderboard.
- Native mobile app (the MVP is a responsive web app).
