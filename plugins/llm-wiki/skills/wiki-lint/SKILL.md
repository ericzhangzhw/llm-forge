---
name: wiki-lint
description: Audit wiki health — find orphans, contradictions, missing cross-references, and gaps
allowed-tools: Read, Glob, Grep, Write, Edit
---

# Lint the Wiki

Perform a health check on the wiki and report issues.

## Steps

1. Read `wiki-schema.md` for conventions and expected structure.

2. Read `wiki/index.md` for the page catalog.

3. Scan all wiki pages:
   ```
   wiki/overview.md
   wiki/sources/*.md
   wiki/entities/*.md
   wiki/concepts/*.md
   ```

4. Check for these issues:

### Orphan pages
Pages with **no inbound links** from other pages. Every page should be reachable via at least one `[[wikilink]]` from another page.

### Broken links
`[[wikilinks]]` that point to pages that don't exist. These indicate either a missing page that should be created or a typo in the link.

### Missing from index
Pages that exist on disk but aren't listed in `wiki/index.md`.

### Unprocessed sources
Raw files in the source directory that have no corresponding `wiki/sources/` page.

### Sparse pages
Pages with very little content (under 5 lines of body text) that may need expansion.

### Missing cross-references
Entity or concept names that appear in page text but aren't linked with `[[wikilinks]]`. Use the list of existing entity and concept page names to detect these.

### Stale frontmatter
Pages missing required frontmatter fields (`title`, `type`, `tags`, `sources`).

### Tag inconsistency
Tags used on pages that aren't in the schema's tag vocabulary (may indicate the vocabulary needs updating).

5. Report findings as a checklist grouped by severity:
   - **Errors** — broken links, missing frontmatter
   - **Warnings** — orphans, unprocessed sources, missing cross-refs
   - **Info** — sparse pages, tag inconsistencies

6. Ask the user if they'd like to fix any issues. For each fixable issue:
   - **Broken links**: create stub pages or fix typos
   - **Missing from index**: add entries
   - **Missing cross-references**: add `[[wikilinks]]`
   - **Stale frontmatter**: add missing fields
   - After fixes, update `wiki/log.md`

## Guidelines

- Read every page — lint needs full coverage
- Don't auto-fix without asking — some "issues" may be intentional
- Group related issues (e.g., if 10 pages are missing the same tag, report it once)
