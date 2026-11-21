# Iteration 3 log

A running record of what the team did and decided in iteration 3. The [release notes](release_notes.md) are the summary written at the end; this file is the day-to-day history. Newest entries go at the bottom. Earlier iterations are in their own logs ([iteration 2](../2/log.md)).

**Traceability chain:** requirement ID (`F-XXX-NN`) → GitHub issue (Iteration 3 on the board) → PR → release notes.

## Status

| Area | State |
|---|---|
| Planning | 24 user stories (#178 to #201) from the 2026-11-20 app review, in Iteration 3 on the [board](https://github.com/orgs/MESW-LES-2627/projects/23). Not assigned or estimated yet |
| Reading pet (#199) | On Home below the goals: cat, dog, fox or rabbit (picker, saved in the browser), walks sideways with a 4-frame walk cycle and plays idle actions, heart on click, mood from the streak's last reading day. Preview at `/dev/pets` (dev only). No backend yet: the pet choice is not saved on the account and minutes read don't feed it yet |

## Next steps

- Prioritise, estimate and assign the 24 new stories.
- Reading pet: save the chosen pet on the account and feed it with minutes read (capped at 60 a day).

## Log

### 2026-11-21: User stories from the app review

- The team reviewed the app on 2026-11-20 and wrote down bugs and ideas. Each became a user story with Gherkin acceptance criteria: [#178](https://github.com/MESW-LES-2627/les-project-group-6/issues/178) to [#201](https://github.com/MESW-LES-2627/les-project-group-6/issues/201), all in Iteration 3 on the board, labelled `user story` plus area, and `bug` where something is broken.
- **Decision: manually added books have three levels of visibility.** A new book is visible only to its creator (others get "not found"), a group admin can approve it for the group, and a platform admin for everyone (#178, #179, #180). Reading a pending book still counts minutes in groups. An AI check only flags books for the admin and never decides alone (#181). The per-user upload limit is still to be decided.
- No assignees, sizes or estimates yet.

### 2026-11-21: Reading pet art (#199)

- Four original kawaii pixel pets with reading accessories, drawn on a 32×32 grid: a grey cat with a cream beanie, a puppy with gold reading glasses, a fox with a burgundy ribbon scarf, and a rabbit holding a book with one ear folded like a dog-eared page.
- Faces: happy, neutral, sad (ears down, tear), starving (ears down, faded colours, "grumbling stomach" marks) and love (shown after a click, with a heart).
- Art lives as editable character grids in [`components/pet/sprites/`](../../../apps/frontend/src/components/pet/sprites/); [`PetSprite.vue`](../../../apps/frontend/src/components/pet/PetSprite.vue) draws them as a crisp inline SVG. Temporary review page [`PetPreviewView.vue`](../../../apps/frontend/src/views/PetPreviewView.vue) at `/dev/pets`, only registered in dev builds.
- **Decision: plain SVG and CSS, no Rive.** Rive needs hand-made `.riv` files built in its editor, and the React runtime doesn't fit the Vue app. *Rejected:* a paid sprite pack, because its characters can't be redistributed in a public repo.
- The style takes ideas from a kawaii pixel pet pack, but the characters and accessories are our own.

### 2026-11-21: Reading pet on Home (#199)

- [`ReadingPet.vue`](../../../apps/frontend/src/components/pet/ReadingPet.vue) sits in Home's glance column below "Your goals". It walks left and right and plays random idle actions (look around, hop, wiggle, nap), and shows a heart and the love face when clicked.
- **Decision: the mood comes from the streak's `lastReadDate`** that Home already loads, so no new endpoint is needed. Read today: happy. 1 day away: neutral. 2 to 6 days: sad, walking slower. 7 or more days: starving, no walking. Before the first reading the pet is neutral, so new readers are not greeted by a starving pet. Rules are in [`mood.ts`](../../../apps/frontend/src/components/pet/mood.ts).
- The reader picks the cat (Miso), dog (Biscuit), fox (Maple) or rabbit (Clover); the choice is stored in the browser for now.
- Walking first reused the front sprite with a bob; replaced the same day by a side-view walk cycle (see below).
- No requirement ID for the pet, as decided by the team, so its tests carry no `@req` tag.

### 2026-11-21: Side-view walk cycle for the pets (#199)

- The pets "hopped" with their front face while walking. Each pet now has a side view walking right in 4 frames (contact, passing, contact, passing), mirrored when walking left, with ears up and ears down (sad walk). Drawn with the same generator and style rules as the front sprites; the side faces (happy, neutral, sad) are in [`side-faces.ts`](../../../apps/frontend/src/components/pet/sprites/side-faces.ts), the frames in each animal's file.
- [`ReadingPet.vue`](../../../apps/frontend/src/components/pet/ReadingPet.vue) steps the frames while walking (faster when happy, slower when sad). Clicking a walking pet stops it where it is and turns it to the front with the love face.
- The `/dev/pets` page also shows every walk frame for review, and has mood buttons beside each live pet (dev builds only).
