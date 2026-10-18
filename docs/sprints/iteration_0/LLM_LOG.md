# LLM Usage Log - Iteration 0

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

### 2026-10-18: Database UML and table specification refactor

- **Date:** 2026-10-18
- **Author:** Vasco
- **Model:** Gemini 3.8 Flash
- **Tool:** Antigravity
- **Domain:** database, architecture, docs

#### Prompt
```text
You have the image in docs/imgs, I want the file to be structured in the following way
1. The UML image should be the first item
2. The tables for the User and Friendship and that are separate from any module, directly below the UML
3. Divide the rest of the modules tables with titles in the markdown in the following order (Book Data, Book Actions, Groups, User Statistics, Notifications)

Each table should be structured in the following way
1. Name of the table with a quick explanation
2. Each attribute with a quick word explaining after
-> All this should be done with md tables except the name and explanation that should be outside
```

#### Explanation of Changes
Completely restructured and unbloated `docs/architecture/table_UML.md`. Replaced the previous 720-line bloated Mermaid diagrams with a clean specification referencing `docs/imgs/uml-diagram.png`. Placed core entities (`User`, `Friendship`) directly below the diagram, followed by the modules in exact requested order: Book Data, Book Actions, Groups, User Statistics, and Notifications. Every entity now has an explanatory summary and a Markdown table to be filled with data types, and concise notes.
