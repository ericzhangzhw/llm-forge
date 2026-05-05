# atlassian-md-clip

A [Claude Code](https://docs.anthropic.com/en/docs/claude-code) plugin that clips Jira tickets and Confluence wiki pages into local markdown files.

It fetches content via the Atlassian REST API (authenticated with browser cookies) and saves structured markdown with YAML frontmatter. Supports child issues, linked issues, comments, wiki images, and child pages.

## Prerequisites

- Node.js 18+
- A logged-in session to your Atlassian instance (for cookie export)

## Installation

Add the marketplace and install the plugin in Claude Code:

```
/plugin marketplace add ericzhangzhw/llm-forge
/plugin install atlassian-md-clip@llm-forge
```

Then install dependencies inside the plugin directory:

```bash
cd ~/.claude/plugins/atlassian-md-clip  # or wherever Claude Code installs plugins
npm install
```

## Setup

### Cookie authentication

The plugin authenticates via browser cookies exported in Netscape format.

1. Install the [Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc) Chrome extension
2. Navigate to your Atlassian instance while logged in
3. Click the extension and export cookies
4. Save the file as `cookies.txt` in your project root (the directory where you run Claude Code)

### Base URL

Provide your Atlassian instance URL via either:

- The `--base` flag: `--base https://mycompany.atlassian.net`
- The `ATLASSIAN_BASE_URL` environment variable

### Output directory

By default, files are saved to `raw/` in the current directory. Override with:

- The `--out` flag: `--out docs/sources`
- The `ATLASSIAN_CLIP_OUT` environment variable

The directory is created automatically if it doesn't exist.

### Smart updates

Re-clipping an existing ticket or page automatically detects changes. The script always fetches the latest data from Atlassian, renders the full markdown, and compares it against the local file by content hash. It only overwrites when something actually changed — new comments, child issues, linked tickets, status updates, description edits, new wiki child pages, etc.

Use `--force` to always overwrite regardless:

```
/clip --base https://mycompany.atlassian.net --force PROJECT-123
```

## Usage

### Jira tickets

```
/clip --base https://mycompany.atlassian.net PROJECT-123
```

Saves to `PROJECT-123.md` in the output directory with:
- Summary, status, priority, labels, assignee, reporter
- Full description (rendered HTML or ADF)
- Child issues (via JQL)
- Linked issues
- Comments

### Confluence pages

```
/clip --base https://mycompany.atlassian.net https://mycompany.atlassian.net/wiki/spaces/TEAM/pages/12345/Page+Title
```

Or by page ID:

```
/clip --base https://mycompany.atlassian.net 12345
```

Saves to `<Page Title> - <Space Name>.md` in the output directory with:
- Page metadata (space, version, author, labels)
- Full content converted to markdown
- Images downloaded to `<out>/assets/<pageId>/`
- Child pages listed

### Mixed

```
/clip --base https://mycompany.atlassian.net PROJECT-123 12345 PROJECT-456
```

The script auto-detects whether each argument is a Jira ticket (`PROJECT-123` pattern) or a Confluence page (URL or numeric ID).

## Output format

All files are saved with YAML frontmatter:

```yaml
---
title: "PROJECT-123 - Fix login bug"
source: "https://mycompany.atlassian.net/browse/PROJECT-123"
clipped: 2026-04-18
updated: "2026-04-15"
tags:
  - "raw"
---
```

- `clipped` — when the file was last written locally
- `updated` — when the remote was last modified (used for smart update detection)

Confluence pages include additional fields: `space`, `page_id`, `last_modified`, `author`.

## License

MIT
