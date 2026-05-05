---
name: wiki-init
description: Initialize an LLM Wiki in the current project — creates directories, schema, and starter pages
argument-hint: [project-name]
allowed-tools: Bash, Read, Write, Glob, Edit
---

# Initialize LLM Wiki

Set up the directory structure, schema file, and starter pages for an LLM-maintained wiki.

## Steps

1. Read `$ARGUMENTS` for an optional project name (used in the overview title).

2. Read the schema template from `${CLAUDE_SKILL_DIR}/../references/schema-template.md` — this is the starting point for the user's schema.

3. Check if `wiki-schema.md` already exists in the project root. If it does, **stop and warn** — don't overwrite an existing wiki.

4. Create the directory structure:
   ```
   wiki/
   wiki/sources/
   wiki/entities/
   wiki/concepts/
   ```

5. Create `wiki-schema.md` in the project root by copying the schema template. If a project name was provided, fill it into the `project.name` field.

6. Create starter pages:

   **wiki/overview.md**:
   ```markdown
   ---
   title: "Project Overview"
   type: overview
   tags: [overview]
   sources: []
   ---

   # Overview

   *This page will be updated automatically as sources are ingested.*
   ```

   **wiki/index.md**:
   ```markdown
   # Wiki Index

   Content catalog — one line per page, grouped by type.

   ## Overview
   - [[overview]] — High-level project synthesis

   ## Sources

   ## Entities

   ## Concepts
   ```

   **wiki/log.md**:
   ```markdown
   # Activity Log

   Append-only record of wiki changes.

   | Date | Action | Pages | Summary |
   | ---- | ------ | ----- | ------- |
   ```

7. Check if a `CLAUDE.md` exists in the project root:
   - If yes: append a `## Wiki` section pointing to `wiki-schema.md` and explaining the LLM owns `wiki/`
   - If no: create a minimal `CLAUDE.md` with the wiki section

   The section to add:
   ```markdown
   ## Wiki

   This project uses the LLM Wiki pattern. The LLM owns the `wiki/` directory entirely.
   Humans read it; the LLM writes and maintains it.

   See `wiki-schema.md` for the full schema: directory layout, page types, naming
   conventions, tags, and domain context. Always read `wiki-schema.md` before
   creating or updating wiki pages.
   ```

8. Report what was created and remind the user to fill in `wiki-schema.md` with their domain context.

## Important

- Never overwrite existing files — check first
- The schema template is a starting point; the user customizes it for their domain
- All wiki pages use YAML frontmatter with `title`, `type`, `tags`, `sources`
- Cross-references use `[[wikilinks]]` by default (configurable in schema)
