# Vision

**Product:** Bookmarked (working name)

## Vision statement

A place where readers build a lasting reading habit, and where friends and groups keep each other reading. Bookmarked should feel like a tracker app for books: it measures real reading time, rewards consistency, and makes reading a shared activity.

## Problem

Reading is a solitary activity that is easy to drop. Readers have no simple way to see how much they really read, to keep a daily habit, or to share the experience with friends. Existing book apps focus on cataloguing and reviews, not on the habit of reading itself.

## Target users

- **Habit builders:** people who want to read more and need a streak, a goal and a reminder to keep going.
- **Social readers:** people who want to read with friends, in a book club or in friendly competition.
- **Collectors and trackers:** people who want to organize their library, rate what they read and see their stats.

## What the product does

- **Tracks real reading time** with a session timer linked to a book, plus optional pages and progress. Personal pace is learned over time.
- **Builds the habit** with daily or weekly streaks (with streak freezes) and personal yearly goals.
- **Organizes a library** with statuses (not started, in progress, finished, did not finish), ratings, comments, folders, tags and re-reads. Missing books can be added by the user.
- **Makes reading social** with friends, an activity feed and optional friend presence ("now reading").
- **Connects readers in groups**, in two categories: *challenges* (who reads the most in a period) and *book clubs* (everyone reads the same book by a deadline). Groups have a chat with images and videos, a leaderboard and configurable anti-cheat.
- **Rewards progress** with badges (visible and secret), XP and levels.
- **Helps discovery** with search, public ratings and reviews, "friends who read this" and trending lists.
- **Looks back** with monthly and yearly retrospectives and in-app and email notifications.
- **Avoids the cold start**: new users import the books they already read, with estimated minutes kept apart from real reading time (estimates never count in competitions).

## Value proposition

| For | Bookmarked gives |
| --- | --- |
| The reader | A clear picture of their reading life and a reason to open a book today |
| Friends | A shared, light-pressure way to read together and compete fairly |
| Groups | Challenges and book clubs with leaderboards, chat and fair play rules |

## Principles

1. **Real reading time first.** Time comes from the timer, not from guesses. Imported estimates stay on the profile only.
2. **Fair competition.** Group admins choose how strict the tracking is.
3. **Private by default.** Profiles are private until the user decides otherwise.
4. **Nobody gets stuck.** Every onboarding step can be skipped, and any missing book can be added.
5. **Gentle motivation.** Streak freezes, "did not finish" without guilt, and nudges with limits.

## Scope and priorities

Features follow MoSCoW priorities (see [requirements](../../product/requirements.md)):

- **Must** (first deliverable): authentication, onboarding, Home, book pages, library statuses, ratings, folders, DNF, reading timer, streaks, profile and privacy, import of past reads, friends, groups (challenge and book club), group chat and leaderboard, search, public reviews, badges and notifications.
- **Should:** ISBN search, pages and progress, anti-cheat, yearly goals, tags, re-reads, genre label, activity feed, voting, trending, XP and levels, retrospectives.
- **Could:** webcam barcode scan, folder copy and follow, reader persona, friend presence, send a book, team challenges, live reading rooms, nudges, public lists, suggestions, badge rarity.

## Platform

A web application. There are no push notifications; notifications are in-app and by email.
