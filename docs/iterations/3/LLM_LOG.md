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


### 2026-11-21: User stories from the app review

- **Date:** 2026-11-21
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** docs, planning

#### Prompt
```text
all of these will be user stories. I want to create them in the iteration 3 of the https://github.com/orgs/MESW-LES-2627/projects/23/views/11. Create the user storeis in gherkin format. If you have doubts on them, ask me, Dont assign anything and don't estimate nothing yet
```

#### Explanation of Changes
Turned the team's review notes into 24 user stories with Gherkin acceptance criteria (#178 to #201) and placed them in Iteration 3 on the board, without assignees or estimates.

### 2026-11-21: Reading pet art

- **Date:** 2026-11-21
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** frontend, design, testing

#### Prompt
```text
get inspiration of the sprites I sent to you, just create the dog, the fox, the rabbit and the cat. They must: walk and do random actions when iddle / interact if you click on them with a little heart and a happy face / Be sad (sad state) if you are away to many time / Be happe (happy state) if you read in the last x time / Be startving (starving state) if you dont read for too many time
nice, so, create them and the states
```

#### Explanation of Changes
Generated four original 32×32 pixel pets (cat, dog, fox, rabbit) in five faces as editable character grids, a `PetSprite` SVG component, a dev-only preview page at `/dev/pets`, and unit/component tests. Walking, idle actions and Home placement are the next step.

### 2026-11-21: Reading pet on Home

- **Date:** 2026-11-21
- **Author:** Robert Gleison
- **Model:** Claude Opus 5.5
- **Tool:** Claude Code
- **Domain:** frontend, testing

#### Prompt
```text
keep these mood time limits, add to home page, no need to rquirement
```

#### Explanation of Changes
Added the `ReadingPet` component to Home: mood from the streak's last reading day, walking and idle actions, a heart on click, a pet picker, and reduced-motion support. Added a sleep face, live pets on `/dev/pets`, and tests.
