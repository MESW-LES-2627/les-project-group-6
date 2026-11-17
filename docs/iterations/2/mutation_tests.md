# Mutation Tests — Iteration 2 (Backend)

Source: [CI run 44075941740 / job 134013865138](https://github.com/MESW-LES-2627/les-project-group-6/actions/runs/44075941740/job/134013865138) — StrykerJS on `apps/backend`, run on 2026-11-17 (took 69 min 44 s).

## Summary

| Metric | Value |
|---|---:|
| Mutation score | **74.48%** |
| Mutants killed | 1407 |
| Mutants survived | 482 |
| Timeouts | 0 |
| No coverage | 0 |
| Errors | 0 |

Every mutant was reached by at least one test, so the score equals the covered score. The 482 surviving mutants are behaviour changes that the tests run but do not detect.

## Results per feature

| Feature | Score | Killed | Survived |
|---|---:|---:|---:|
| explore | 97.14% | 34 | 1 |
| review | 88.54% | 85 | 11 |
| reading-session | 85.53% | 65 | 11 |
| library-tag | 84.91% | 45 | 8 |
| utils | 82.14% | 23 | 5 |
| group-chat | 78.15% | 118 | 33 |
| library-folder | 77.63% | 59 | 17 |
| challenge-group | 74.05% | 97 | 34 |
| book-club | 73.25% | 241 | 88 |
| friend | 72.88% | 86 | 32 |
| reading-status | 71.65% | 187 | 74 |
| book | 70.93% | 122 | 50 |
| user | 70.34% | 166 | 70 |
| group | 62.75% | 32 | 19 |
| group-invite | 61.84% | 47 | 29 |

## Results per file (lowest score first)

| File | Score | Killed | Survived |
|---|---:|---:|---:|
| group-invite/group-invite.ts | 55.81% | 24 | 19 |
| group/group.ts | 62.75% | 32 | 19 |
| book-club/book-poll-service.ts | 63.64% | 21 | 12 |
| library-folder/folder.ts | 65.00% | 26 | 14 |
| book/book-service.ts | 65.15% | 43 | 23 |
| friend/friend.ts | 67.24% | 39 | 19 |
| challenge-group/challenge-group-service.ts | 67.86% | 19 | 9 |
| user/user.ts | 68.38% | 80 | 37 |
| reading-status/reading-state.ts | 68.42% | 52 | 24 |
| book-club/book-club-service.ts | 68.66% | 46 | 21 |
| group-invite/group-invite-service.ts | 69.70% | 23 | 10 |
| user/user-service.ts | 72.27% | 86 | 33 |
| reading-status/reading-status.ts | 72.04% | 67 | 26 |
| reading-status/reading-status-service.ts | 73.91% | 68 | 24 |
| book/book.ts | 74.53% | 79 | 27 |
| group-chat/chat-message.ts | 74.65% | 53 | 18 |
| book-club/book-poll.ts | 75.00% | 84 | 28 |
| challenge-group/challenge-group.ts | 75.73% | 78 | 25 |
| book-club/book-club.ts | 76.92% | 90 | 27 |
| friend/friend-service.ts | 78.33% | 47 | 13 |
| group-chat/chat-service.ts | 81.25% | 65 | 15 |
| library-tag/tag.ts | 81.82% | 27 | 6 |
| utils/calendar.ts | 82.14% | 23 | 5 |
| review/review-service.ts | 86.49% | 32 | 5 |
| reading-session/reading-session.ts | 88.89% | 40 | 5 |
| library-tag/library-tag-service.ts | 90.00% | 18 | 2 |
| library-folder/library-folder-service.ts | 91.67% | 33 | 3 |
| explore/explore-service.ts | 97.14% | 34 | 1 |

## Findings

- **Weakest areas:** `group-invite` (61.8%) and `group` (62.8%). `group-invite.ts` is the only file below 60%, which suggests its invite-state rules and validations are not fully asserted.
- **Most surviving mutants:** `book-club` (88), `reading-status` (74), `user` (70) and `book` (50). Together they account for about 59% of all surviving mutants, so they are where the most mutants can be killed.
- **Domain entities score lower than services in several features** (`folder.ts`, `friend.ts`, `user.ts`, `reading-state.ts`). Tests exercise these entities but rarely assert their guard clauses and boundary conditions.
- **Strong areas:** `explore`, `library-folder-service`, `library-tag-service`, `review` and `reading-session` are all at or above about 86%.
- **No timeouts, no uncovered code and no errors.** All of the missing score comes from weak assertions, not from missing tests.

## Next steps

1. Add assertions for edge cases and invalid transitions in `group-invite.ts`, `group.ts` and `folder.ts`.
2. Target the surviving mutants in `book-club`, `reading-status` and `user` first, because they hold the most survivors.
3. Use the HTML report (the `backend-mutation` artifact of the run) to inspect each surviving mutant.
