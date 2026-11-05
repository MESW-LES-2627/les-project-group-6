# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Readers who want to build a lasting reading habit, and their friends. They open the app to start a timed reading session, check where they are in a book, keep their library in order, and see how their groups are doing.

## Product Purpose

Bookmarked (temporary name) is a tracker for books. It measures real reading time with a session timer, rewards consistency with streaks, goals, badges and levels, and makes reading shared through friends, challenges and book clubs. Success is a reader who keeps coming back to read, not one who scrolls the app.

## Positioning

Reading time is earned, not estimated: the server times each session, and only finished sessions count towards streaks, challenges and clubs. Imported past reads never earn XP or count in a group.

## Operating Context

University project (Group 6, Software Engineering Lab, master's degree), built as a Vue 3 + Vite client against an Express + PostgreSQL API. Several pages still run on mock data until their endpoints exist. Requirements live in `docs/product/requirements.md`; the product vision in `docs/sprints/iteration_0/vision.md`.

## Capabilities and Constraints

- Reading sessions: start, finish or cancel a server-timed session on a book; no pause.
- Library: books with one current status each (not started, in progress, finished, did not finish), page progress, ratings, folders and tags. Rereads are separate read-throughs. Books can live in several folders; deleting a folder never deletes its books.
- Groups: challenges (any book counts, ranked by a win metric over a period, tied leaders share a rank) and book clubs (one shared book per round with a deadline; the round succeeds only if every member finishes; members propose and vote on the next book, the admin confirms it). Invites go to friends. Each group has a chat.
- Profile: bookplate with name and bio, currently reading, shelf of finished books, chapter (level) and XP, streak, reading time, folders and monthly recap.
- Undecided: authentication (Supabase skeleton only), real cover images for every book, badges.

## Brand Commitments

- The Profile page is the reference for the app's look; Library and Groups follow it.
- Color palette (AGENTS.md, `docs/design/README.md`): Burgundy `#6f1d1b`, Gold `#bb9457`, Dark brown `#432818`, Copper `#99582a`, Cream `#ffe6a7`.
- Page and section titles use Inter; book titles keep Lora.
- The team does not want boxed card layouts, dense pages, or a generic "AI-generated" look.

## Evidence on Hand

Mock content only: books, members and groups in `apps/frontend/src/mocks/`. Design screens in `docs/design/screens/` and the Figma link in `docs/design/`. No real users, testimonials or usage data.

## Product Principles

- Reading first: every page should make it one step to get back to a book.
- Honest numbers: show counted time and real progress, never estimates dressed up as achievements.
- Calm and personal: a private reading space shared with friends, not a feed.
- One look across pages: the same vocabulary for books, progress, people and actions everywhere.
