---
name: wiki-ingest
description: Ingest raw source documents into the LLM Wiki — create source summaries, update entities, concepts, overview, and index
argument-hint: [file-or-glob]
allowed-tools: Bash, Read, Write, Glob, Grep, Edit
---

# Ingest Sources into Wiki

Read raw source documents and integrate them into the wiki as structured, cross-referenced pages.

## Prerequisites

Before ingesting, read these files to understand the wiki's conventions:
1. **`wiki-schema.md`** — the project's wiki schema (page types, naming, tags, domain context)
2. **`wiki/index.md`** — current catalog of all pages (to avoid duplicates)
3. **`wiki/overview.md`** — current big picture (to know if it needs updating)

If `wiki-schema.md` does not exist, tell the user to run `/wiki-init` first.

## Determine what to ingest

Parse `$ARGUMENTS`:
- If arguments are provided, treat them as file paths or glob patterns (e.g., `raw/PROJ-123.md` or `raw/*.md`)
- If no arguments, scan the source directory (defined in `wiki-schema.md`, default `raw/`) and find all files that do **not** have a corresponding page in `wiki/sources/`

To check if a source has been ingested:
- For files named like `PROJ-123.md`, check if `wiki/sources/PROJ-123.md` exists
- For other files, derive the source page name from the filename

Report how many new sources were found before proceeding.

## For each new source

### Step 1: Create source page

Read the raw document and create `wiki/sources/<id>.md` with:

```yaml
---
title: "<descriptive title from the source>"
type: source
tags: [<relevant lowercase kebab-case tags from the schema's vocabulary>]
sources: [<source-id>]
---
```

Content structure (adapt based on source type):
- **Summary** — 2-3 sentence overview
- **Key Details** — bullet points of important information
- **Decisions / Outcomes** — if the source contains decisions
- **Cross-References** — `[[wikilinks]]` to related entities and concepts

### Step 2: Update entity pages

Identify systems, services, teams, or people mentioned in the source:
- If an entity page exists in `wiki/entities/`, update it with new information and add the source to its `sources:` frontmatter
- If an entity is significant but has no page, create `wiki/entities/<name>.md`

Entity page structure:
```yaml
---
title: "<Entity Name>"
type: entity
tags: [<tags>]
sources: [<all source IDs that reference this entity>]
---
```

### Step 3: Update concept pages

Identify topics, workflows, or design patterns discussed in the source:
- If a concept page exists in `wiki/concepts/`, update it with new information
- If a concept is significant but has no page, create `wiki/concepts/<name>.md`

Concept page structure:
```yaml
---
title: "<Concept Name>"
type: concept
tags: [<tags>]
sources: [<all source IDs that reference this concept>]
---
```

### Step 4: Cross-reference

Ensure bidirectional links:
- Source pages link to entities and concepts they discuss
- Entity and concept pages link back to the sources
- Related concepts link to each other
- Use `[[wikilinks]]` syntax (or as configured in schema)

### Step 5: Update overview

If the new source materially changes the big picture (new initiative, major decision, architectural shift), update `wiki/overview.md`. Otherwise, skip.

### Step 6: Update index

Add new pages to `wiki/index.md` under the appropriate section:
```markdown
- [[page-name]] — one-line summary
```

### Step 7: Update log

Append an entry to `wiki/log.md`:
```markdown
| YYYY-MM-DD | ingest | source-id, entity-pages, concept-pages | Brief summary of what was learned |
```

## Batch behavior

When ingesting multiple sources:
- Process them one at a time, building context as you go
- Later sources benefit from entities/concepts created by earlier ones
- Update index and log after each source (not in a batch at the end)
- Give a brief progress update after each source

## Quality guidelines

- **Summaries over transcription** — wiki pages synthesize; they don't copy
- **Cross-reference aggressively** — if a concept is mentioned, link it
- **Tags from the vocabulary** — use the schema's tag list; add new tags sparingly
- **Naming conventions** — follow the schema's naming rules for files
- **No orphans** — every new page should have at least one inbound link
