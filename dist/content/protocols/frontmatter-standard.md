---
name: frontmatter-standard
type: protocol
status: active
description: "Every .md file needs frontmatter: type, status, created, updated. Protocols get TL;DR; muscles get digest."
heat-default: warm
tags: [structure, metadata, organization]
applies-to: [always]
scope: bundled
tier: core
created: 2026-03-09
updated: 2026-03-10
version: 1.1.0
author: Curtis Mercier
license: CC BY 4.0
upstream: core
upstream-version: 1.1.0
spec-ref: curtismercier/protocols/atlas (v0.1)
---

# Frontmatter Standard Protocol

## TL;DR
Every `.md` file needs YAML frontmatter: `type`, `status`, `created`, `updated`. Protocols get `## TL;DR`; muscles get `<!-- digest:start/end -->`.

## Rule

Every Markdown document in an agent-managed workspace MUST have YAML frontmatter.

### Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `type` | string | Document type (see below) |
| `status` | string | Lifecycle state (see below) |
| `created` | date | ISO date of creation |
| `updated` | date | ISO date of last meaningful update |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `tags` | string[] | Searchable keywords |
| `related` | string[] | Links to related docs |
| `owner` | string | Who owns this doc |
| `priority` | string | high/medium/low |
| `scope` | string | `internal` = workspace only, never push to public repos |

### Scope: Internal

Files with `scope: internal` must never be pushed to agent, community, or any public repo. This protects workspace-specific content (private paths, internal workflows, project-specific protocols) from leaking.

The `soma-channel-guard.sh` pre-push hook should check for this. Scripts like `soma-repos.sh drift sync push` should refuse to copy files marked `scope: internal`.

### Valid Types (13)

`plan` · `spec` · `note` · `index` · `memory` · `muscle` · `protocol` · `decision` · `log` · `template` · `identity` · `config` · `map`

### Valid Statuses (8)

`draft` · `active` · `stable` · `stale` · `archived` · `deprecated` · `blocked` · `review`

## When to Apply

- Creating any new `.md` file → add frontmatter
- Editing a file missing frontmatter → add it
- Updating content → bump `updated` date
- Reviewing docs → check for `stale` status (not updated in 30+ days)

## When NOT to Apply

- README.md in public repos (conventional format, no frontmatter expected)
- Third-party docs or generated files
- Files explicitly marked as frontmatter-exempt
