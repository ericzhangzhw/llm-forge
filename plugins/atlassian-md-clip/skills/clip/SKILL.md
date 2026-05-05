---
name: clip
description: Clip Jira tickets or Confluence wiki pages to local markdown files
argument-hint: --base https://site.atlassian.net [--out DIR] [--force] TICKET-ID|WIKI-URL [...]
allowed-tools: Bash, Read, Glob
---

# Clip Atlassian Content

Fetch Jira tickets or Confluence wiki pages and save them as markdown.

## Detecting the type

Classify each argument (after extracting `--base` and `--out`):
- **Jira ticket**: matches `[A-Z]+-\d+` (e.g., `PROJECT-123`, `TEAM-456`)
- **Confluence page**: contains `/wiki/` in the URL, or is a bare numeric page ID

## Steps

1. Parse arguments from `$ARGUMENTS`:
   - Extract `--base URL` (required unless `ATLASSIAN_BASE_URL` env var is set)
   - Extract `--out DIR` if present (default: `raw`, or `ATLASSIAN_CLIP_OUT` env var)
   - Extract `--force` if present (re-clip even if local file is up to date)
   - Remaining args are ticket IDs and/or wiki URLs (can mix both)

2. Do NOT remove existing files — the script handles updates automatically.
   It always fetches the latest data, renders the full markdown, and compares
   against the local file by content hash. Only writes if something changed
   (new comments, child issues, linked tickets, status, description, etc.).

3. Run the clip script:
   ```bash
   node ${CLAUDE_SKILL_DIR}/scripts/clip.mjs [--base URL] [--out DIR] [--force] ARGS...
   ```
   The script auto-classifies each arg as Jira (`PROJECT-123`) or Confluence (wiki URL / numeric page ID).

4. Report results:
   - How many tickets/pages were clipped (new), updated, or skipped (up to date)
   - Children found per ticket, child pages and images per wiki page
   - Any failures

## Requirements

- `cookies.txt` must exist in the project root (Netscape cookie format from the target Atlassian instance)
- For non-default domains, ensure cookies cover that domain
- Run `npm install` inside the plugin directory to install dependencies (playwright, defuddle, linkedom)

## Examples

- `/clip --base https://mycompany.atlassian.net PROJECT-123` — clip a Jira ticket (or update if stale)
- `/clip --base https://mycompany.atlassian.net --force PROJECT-123` — re-clip regardless of staleness
- `/clip --base https://mycompany.atlassian.net --out docs PROJECT-123` — clip to `docs/`
- `/clip --base https://mycompany.atlassian.net PROJECT-123 PROJECT-456` — clip multiple
- `/clip --base https://mycompany.atlassian.net https://mycompany.atlassian.net/wiki/spaces/TEAM/pages/12345/Page+Title` — clip a Confluence page
- `/clip --base https://mycompany.atlassian.net 12345` — clip a Confluence page by ID
- `/clip --base https://mycompany.atlassian.net PROJECT-123 12345` — mix Jira and Confluence
