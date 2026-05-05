# llm-wiki

A [Claude Code](https://docs.anthropic.com/en/docs/claude-code) plugin that implements the [LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — an LLM-maintained, cross-referenced knowledge wiki built from raw source documents.

Instead of traditional RAG, this pattern compiles knowledge once during ingestion and keeps it current as new sources arrive. The LLM owns the wiki directory; humans read it and curate sources.

## How it works

```
raw/              Immutable source documents (you add these)
wiki/             LLM-generated markdown pages (the LLM maintains these)
  overview.md     High-level synthesis of the entire project
  sources/        One summary per raw source
  entities/       Pages for systems, services, teams, people
  concepts/       Pages for topics, workflows, decisions
  index.md        Content catalog with links and summaries
  log.md          Append-only activity record
wiki-schema.md    Your project's wiki configuration (you customize this)
```

## Installation

```
/plugin marketplace add ericzhangzhw/llm-forge
/plugin install llm-wiki@llm-forge
```

## Skills

### `/wiki-init [project-name]`

Scaffold the wiki structure in your project:
- Creates `wiki/` directories (sources, entities, concepts)
- Creates starter pages (overview, index, log)
- Generates `wiki-schema.md` from a template — fill this in with your domain context

### `/wiki-ingest [file-or-glob]`

Ingest raw source documents into the wiki:
- Reads `wiki-schema.md` for your conventions
- Creates structured source summaries in `wiki/sources/`
- Creates or updates entity and concept pages with cross-references
- Updates the overview, index, and log
- Without arguments, finds all unprocessed sources automatically

### `/wiki-query <question>`

Ask a question and get a synthesized answer from the wiki:
- Finds relevant pages via the index
- Synthesizes an answer with citations
- Optionally files valuable answers as new concept pages

### `/wiki-lint`

Audit wiki health:
- Orphan pages with no inbound links
- Broken `[[wikilinks]]`
- Unprocessed raw sources
- Missing cross-references
- Sparse or incomplete pages
- Offers to fix issues with your confirmation

## Getting started

1. Install the plugin
2. Run `/wiki-init my-project` in your project
3. Edit `wiki-schema.md` to add your domain context, entity types, and tag vocabulary
4. Drop source documents into `raw/`
5. Run `/wiki-ingest` to build the wiki

## Schema

The `wiki-schema.md` file is the brain of your wiki. It tells the LLM:

- **What your project is about** — domain context, key terms, acronyms
- **How to organize pages** — naming conventions, tag vocabulary
- **What entities and concepts to track** — systems, services, workflows
- **How to identify sources** — mapping raw filenames to source page names

The schema template has comments explaining each section. Fill it in and the wiki skills will follow your conventions.

## Page format

All wiki pages use YAML frontmatter:

```yaml
---
title: "Human-readable title"
type: source | entity | concept | overview
tags: [lowercase-kebab-case-tags]
sources: [list-of-raw-source-ids]
---
```

Cross-references use Obsidian-style `[[wikilinks]]` by default (configurable in the schema).

## Credits

Based on the [LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) by Andrej Karpathy.

## License

MIT
