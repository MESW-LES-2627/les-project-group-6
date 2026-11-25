# LLM Usage Log - Iteration 3

## Template

````markdown
### YYYY-MM-DD: [Short Topic / Task Description]

- **Date:** YYYY-MM-DD
- **Author:** [Name]
- **Model:** [e.g. Gemini 3.8 Flash, Claude Sonnet 4.6, GPT-4o]
- **Tool:** [e.g. Antigravity, ChatGPT, Cursor, GitHub Copilot]
- **Domain:** [e.g. docs, database, architecture, frontend, backend, testing]

#### Prompt
```text
[Insert prompt here]
```

#### Explanation of Changes
[Brief explanation of what was changed, generated, or decided.]
````

---

## Logs

### 2026-11-24: Invite friends to an existing group, including pending invites

- **Date:** 2026-11-24
- **Author:** Nimot Imran
- **Model:** DeepSeek V4.1 Flash Free
- **Tool:** OpenCode
- **Domain:** backend, frontend, testing, docs

#### Prompt
```text
Implement inviting friends to an existing group (admin only), while ensuring invites work both during group creation and after creation.
Scenario: group admin of an existing group invites friend Ana -> Ana receives a group invite.
Scenario: if Ana is already a member or has a pending invite -> admin cannot invite her again.
Scenario: a non-admin member must not see the invite option.
Make sure both the invite while creating the group and an existing group invite is working.
```

#### Explanation of Changes
Added `GET /groups/:id/invites` (admin only) through `IGroupInviteRepository.pendingForGroup`, `GroupInviteService.pendingForGroup` and `groupInviteRoutes`, so the invite list knows which friends already have an unanswered invite. `InviteFriends.vue` now loads friends and pending invites together and shows a pending friend as a disabled **Invited** row instead of letting the admin click and get a server error. Kept the existing creation-time invite flow in `CreateGroupView.vue` unchanged. Added backend unit and repository tests for the admin-only list, a component test for the disabled state, an API client case, and challenge-page tests for the admin invite, the pending-invite block and the non-admin view. The challenge creation test now also asserts that the selected friend is invited. Updated `docs/architecture/api_routes.md`, the iteration log and this LLM log.


### 2026-11-24: Fix the empty invite list and the groups page after a failed request

- **Date:** 2026-11-24
- **Author:** Nimot Imran
- **Model:** DeepSeek V4.1 Flash Free
- **Tool:** OpenCode
- **Domain:** frontend, testing, docs

#### Prompt
```text
the group does not appear on the invited user's page, and there is no button to add user to existing group

this is the message I got
Admin & settings
Invite friends
All your friends are already here.
```

#### Explanation of Changes
Found that `InviteFriends.vue` loaded friends and the admin-only pending-invite list with one `Promise.all`, so a failing pending request emptied the friend list and left the "All your friends are already here" message; `GroupsView.vue` used the same pattern for the reader's groups and invites, so a failing invite request hid the groups. Both now load the two requests independently, with separate empty states ("You have no friends to invite yet" with a link to Explore, or "All your friends are already in this group") and an error that replaces the empty state when friends cannot load. Added a component test for a failed pending request and a groups-page test for a failed invite request, and updated the book club error test. Updated the iteration log.


