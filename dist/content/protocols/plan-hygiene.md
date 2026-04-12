---
name: plan-hygiene
type: protocol
status: active
description: "Plans rot. Update remaining on every touch. Stale docs poison sessions."
heat-default: cold
tags: [workflow, planning, documentation]
applies-to: [always]
scope: bundled
tier: official
created: 2026-03-14
updated: 2026-04-12
version: 1.0.0
author: meetsoma
license: MIT
---

# Plan Hygiene Protocol
## TL;DR
Plans rot. Frontmatter needs `status`, `remaining`, `tooling`. Empty remaining = complete → archive. Budget: ≤12 active. Use `soma-plans.sh`. Verify on exhale.
## The Problem
Plans, kanbans, and changelogs drift from reality. Features get marked "done" in plans but never built. Changelogs claim test suites that don't exist. Plans reference functions that were renamed. 48 plans accumulate when 12 would suffice.
## Rules
### 0. Plans Have Live Frontmatter
Every plan's frontmatter tracks its real state. This is the first thing to check and the last thing to update.
```yaml
---
type: plan
status: active          # draft | active | blocked | complete | archived
created: 2026-03-13
updated: 2026-03-14     # always update on any change
author: meetsoma
license: MITowner: curtis + soma
version: 1.0.0scope: [auto-breathe, notifications]
remaining:              # brief list of what's left — empty when complete
  - research API for new feature
  - implement core logic
  - write tests
  - ship
tooling:                # which scripts/muscles apply (see task-tooling muscle)
  scripts: [soma-code.sh, soma-verify.sh]
  muscles: [incremental-refactor, pre-flight-check]
  gaps: [no integration test harness]
---
```

**Status meanings:**
- `draft` — idea being shaped, not committed to
- `active` — work is happening, `remaining` lists what's left
- `blocked` — work paused, frontmatter should say why
- `complete` — all items done, verified in code
- `archived` — moved to `_archive/`, no longer loaded

**On every session touch:** update `remaining` list to reflect reality. When the list is empty → status becomes `complete`. When you pick up a draft → status becomes `active` + populate `remaining`. The `updated` date always reflects the last real change.

**On session close:** scan active plans. If `remaining` is empty, mark `status: complete`. Next session's plan-audit moves completed plans.

### 1. Changelog = Codebase Evidence Only

**Never write a changelog entry for something that doesn't exist in the codebase.**

Before adding to CHANGELOG.md:
- Can you `grep` for the function/command/file in the repo? If not, it's not shipped.
- Is the version actually published? Check the release tags.
- Does the feature work end-to-end, or just compile? Only shipped features go in changelogs.

### 2. Active Plan Budget: ≤12

If you have more than 12 active plans, some are stale. Audit and archive. The brain can hold ~7 items; 12 is already generous. Beyond 12, plans become write-only documents nobody reads.

### 3. Kanbans Track Work, Not Wishes

Done items in a kanban mean: **the code exists, it was tested, it was committed.** Not "I wrote the spec" or "the plan says to do this."

Backlog items are wishes — that's fine. But moving something to Done is a statement about the codebase, not the plan.

### 4. Plan Consolidation

When multiple plans cover the same domain and most are done:
- Extract unfinished items to a single active plan
- Archive the rest
- Write a "decisions" section capturing the forks and choices made

Don't keep 5 plans alive for the same feature area.

### 5. Verify Before You Claim

Before writing "✅ shipped" or moving a kanban item to Done:
```bash
# Does the function exist?
soma-code.sh find "functionName"

# Does the command register?
soma-code.sh find "registerCommand"

# Do tests pass?
npm test
```

### 6. Periodic Audit

Run your plan audit script at least once per major session. It checks:
- Active plans with `status: done` (should be archived)
- Active plan count (warn if >12)
- Changelog claims vs codebase reality
- Stale function references in plans
- Missing npm version changelog entries

## Anti-Patterns

| Pattern | Fix |
|---------|-----|
| "161 tests passing" in changelog, 0 test files | Remove claim. Write tests, then claim. |
| 48 active plans | Archive done ones. Consolidate overlapping ones. Target ≤12. |
| Plan references `buildFoo()` but function was renamed to `constructFoo()` | Plan-audit catches stale refs. Update or archive. |
| Kanban item "Done" but feature has a bug | Move back to Active. Done means done. |
| Changelog entry for unreleased version | Keep in [Unreleased] section. Move to version header only on publish. |
| Writing the changelog BEFORE writing the code | Invert: code → commit → changelog. |
