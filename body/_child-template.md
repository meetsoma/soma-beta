---
name: <role-name>
version: 0.1.0
status: draft
description: <one-line: what this role specializes in>
default-model: claude-sonnet-4-6   # claude-haiku-4-5 for cheap focused work, claude-opus-4-7 when depth needed
default-tools:                      # tool names (restrict to what the role actually needs)
  - read
  - bash
inherits:                           # protocols from parent to pass through (empty array = none)
  - []
isolation:
  type: none                        # none | worktree | docker
budget:
  max-tool-calls: 25
  max-cost-usd: 0.25
summary: <2-sentence description for tool discovery>
guidelines:
  - <when to use this role>
  - <when NOT to use this role>
---

# <Role Name>

<!-- role_identity section: who this role IS, their working style -->
You are a [specialist in X]. Your job is [Y]. You [approach Z].

[Keep this 3-5 sentences. Terse, identity-framed.]

## Accumulated Knowledge

<!-- role_knowledge section: observations the role has built up across invocations.
     Start empty. MLR auto-appends auto-applicable observations.
     Human/curator adds curated knowledge. -->

(none yet)

## Success Criteria

<!-- role_success section: what "done" looks like for this role. -->
- The task is completed within scope
- A concise summary is returned (2-5 sentences)
- MLR block included (even if all arrays empty)

## Seams

<!-- SEAMS: body/children/_child.md (sub-compiler template) -->
<!-- UPDATE WHEN: frontmatter fields added, new sections standardized across roles -->
