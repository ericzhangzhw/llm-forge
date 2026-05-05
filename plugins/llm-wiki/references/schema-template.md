# Wiki Schema

This file defines the structure, conventions, and domain context for your LLM-maintained wiki.
The LLM reads this file before every wiki operation. Fill in the sections below to match your project.

## Project

- **Name**: <!-- e.g., "Acme Auth Migration" -->
- **Description**: <!-- 1-2 sentences on what this project/initiative is about -->
- **Scope**: <!-- What topics belong in this wiki? What's out of scope? -->

## Directories

- **Source directory**: `raw/` <!-- Where raw/immutable source documents live -->
- **Wiki directory**: `wiki/` <!-- Where LLM-generated wiki pages live -->

## Page types

The wiki has four page types. Each lives in its own subdirectory.

### Overview (`wiki/overview.md`)
Single page synthesizing the entire initiative. Updated when the big picture changes.

### Sources (`wiki/sources/`)
One page per raw source document. Named by source ID (e.g., ticket ID, document slug).
- **Naming**: `<source-id>.md` <!-- e.g., PROJ-123.md, meeting-2026-03-15.md -->
- **Purpose**: Structured summary of a raw source — not a copy, a synthesis

### Entities (`wiki/entities/`)
Pages for systems, services, teams, people, or other "nouns" in the domain.
- **Naming**: `<entity-name>.md` in lowercase kebab-case <!-- e.g., auth-service.md, jane-doe.md -->
- **Examples**: <!-- List the key entities you expect to track -->
  <!-- - auth-service — The main authentication backend -->
  <!-- - billing-api — Payment processing service -->
  <!-- - platform-team — Core infrastructure team -->

### Concepts (`wiki/concepts/`)
Pages for topics, workflows, decisions, patterns, or other "verbs/ideas" in the domain.
- **Naming**: `<concept-name>.md` in lowercase kebab-case <!-- e.g., oauth-flow.md, rate-limiting.md -->
- **Examples**: <!-- List the key concepts you expect to track -->
  <!-- - oauth-flow — How authentication works end-to-end -->
  <!-- - data-migration — Strategy for moving from legacy to new schema -->

## Frontmatter

Every wiki page has YAML frontmatter:

```yaml
---
title: "Human-readable page title"
type: source | entity | concept | overview
tags:
  - tag-one
  - tag-two
sources:
  - SOURCE-ID-1
  - SOURCE-ID-2
---
```

- `title`: Descriptive, human-readable
- `type`: One of the four page types
- `tags`: Lowercase kebab-case, from the vocabulary below
- `sources`: List of raw source IDs referenced by this page

## Tag vocabulary

<!-- Define your domain's tag taxonomy. Start with 10-20 tags, add more as needed. -->
<!-- Group by category for clarity. -->

### Domain
<!-- - authentication -->
<!-- - billing -->
<!-- - onboarding -->

### Technical
<!-- - api -->
<!-- - database -->
<!-- - infrastructure -->

### Process
<!-- - decision -->
<!-- - spike -->
<!-- - roadmap -->

## Cross-references

- **Style**: `[[wikilinks]]` <!-- Obsidian-compatible; change to [links](path.md) if you prefer standard markdown -->
- **Rules**:
  - Link entity and concept names on first mention in a page
  - Maintain bidirectional links (if A links to B, B should link to A)
  - Use `[[name|display text]]` when the link text should differ from the page name

## Domain context

<!-- This section gives the LLM background knowledge about your domain. -->
<!-- Include key terms, acronyms, relationships, and any context that helps -->
<!-- the LLM make good decisions about categorization, tagging, and cross-referencing. -->

<!-- Example: -->
<!-- - **ACME**: Our company name, Acme Corp -->
<!-- - **Auth Service**: The main authentication backend, built on Keycloak -->
<!-- - **Platform Team**: Owns infrastructure and shared services -->
<!-- - **Project Phoenix**: The migration initiative this wiki tracks -->

## Source identification

<!-- How should the LLM derive a source page name from a raw document? -->
<!-- Examples: -->
<!-- - Jira tickets: use the ticket ID (PROJ-123) -->
<!-- - Meeting notes: use the date (meeting-2026-03-15) -->
<!-- - Documents: use a kebab-case slug of the title -->
