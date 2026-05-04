# llm-forge

A collection of [Claude Code](https://docs.anthropic.com/en/docs/claude-code) plugins for documentation and knowledge management.

## Plugins

### [atlassian-md-clip](plugins/atlassian-md-clip)

Clip Jira tickets and Confluence wiki pages to local markdown files. Fetches content via the Atlassian REST API using browser cookies and saves structured markdown with YAML frontmatter.

- `/clip` — export Jira tickets and Confluence pages as markdown
- Auto-detects Jira vs Confluence content
- Smart change detection — only overwrites when content changes
- Supports child issues, linked issues, comments, wiki images, and child pages

### [llm-wiki](plugins/llm-wiki)

LLM-maintained, cross-referenced knowledge wiki built from raw source documents. Based on the [LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) by Andrej Karpathy — compiles knowledge during ingestion instead of traditional RAG.

- `/wiki-init` — scaffold wiki structure and schema
- `/wiki-ingest` — ingest raw sources into cross-referenced wiki pages
- `/wiki-query` — query the wiki and synthesize answers with citations
- `/wiki-lint` — audit wiki health (orphan pages, broken links, missing cross-references)

## Installation

Add the marketplace and install the plugins you need:

```
/plugin marketplace add ericzhangzhw/llm-forge
/plugin install atlassian-md-clip@llm-forge
/plugin install llm-wiki@llm-forge
```

See each plugin's README for setup and usage details.

## License

MIT
