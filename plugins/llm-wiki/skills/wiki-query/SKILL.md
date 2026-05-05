---
name: wiki-query
description: Query the LLM Wiki — synthesize answers from wiki pages, optionally file new pages
argument-hint: <question>
allowed-tools: Read, Glob, Grep, Write, Edit
---

# Query the Wiki

Answer a question by reading and synthesizing wiki pages.

## Steps

1. Read `wiki-schema.md` for domain context.

2. Read `wiki/index.md` to identify relevant pages. Use the one-line summaries to pick the most relevant 5-10 pages.

3. Read those pages. If they reference other pages that seem relevant, follow the links.

4. Synthesize an answer:
   - Cite specific pages using `[[wikilinks]]`
   - Note any gaps where the wiki lacks information
   - Flag contradictions if found

5. **Optionally file the answer**: If the answer reveals a synthesis that would be valuable as a standing wiki page (a new concept, a comparison, an analysis), ask the user if they'd like to file it. If yes:
   - Create `wiki/concepts/<topic>.md` with proper frontmatter
   - Add cross-references to related pages
   - Update `wiki/index.md`
   - Append to `wiki/log.md`

## Guidelines

- Prefer wiki pages over raw sources — the wiki is the compiled knowledge
- If the wiki doesn't cover the topic, say so — don't hallucinate from training data
- When the answer spans multiple concepts, structure it with headings
- Keep filed pages focused — one concept per page
