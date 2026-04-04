---
type: map
name: migration-cycle
status: active
created: 2026-04-02
description: "Outer cycle for project migration. Detects version gap, chains phase files, verifies each jump."
---

# Migration Cycle

> Like soma-dev's cycle.md orchestrates development phases, this orchestrates
> version-to-version migration phases. Each phase file is self-contained.

## The Cycle

```
DETECT
  │  Read project settings.json → current version
  │  Read agent package.json → target version
  │  Calculate version gap
  │
PLAN
  │  Find phase files: phases/v{current}-to-v{next}.md
  │  Chain them in order: v0.6.3→v0.6.4→...→v0.8.0
  │  List which phases exist, flag any gaps
  │
EXECUTE (inner cycle — repeats per phase)
  │  ┌─────────────────────────────────────┐
  │  │  Read phase file                     │
  │  │  Check what exists in project        │
  │  │  Apply actions (add/update/skip)     │
  │  │  Bump version in settings.json       │
  │  │  Verify — did it work?               │
  │  └─────────────────────────────────────┘
  │  Next phase...
  │
REPORT
  │  Summary: what was added, updated, skipped
  │  Note customized files that need manual review
  │  Confirm final version matches target
```

## Phase File Location

```
migrations/phases/v{from}-to-v{to}.md
```

Example chain for a project at v0.6.3 jumping to v0.8.0:
```
phases/v0.6.3-to-v0.6.4.md  → phases/v0.6.4-to-v0.6.5.md  →
phases/v0.6.5-to-v0.6.6.md  → phases/v0.6.6-to-v0.6.7.md  →
phases/v0.6.7-to-v0.7.0.md  → phases/v0.7.0-to-v0.7.1.md  →
phases/v0.7.1-to-v0.8.0.md
```

## Rules (apply to every phase)

1. **Never delete user content** — rename to `.bak` if removing
2. **Never overwrite customized files** — diff against bundled, if different = customized = skip
3. **Merge settings** — add new keys with defaults, preserve existing values
4. **Version bump last** — only after all actions for that phase succeed
5. **Report skipped files** — tell the user what was customized and left alone

## How to Detect Customization

Compare project file against bundled template. Strip runtime fields first:
```bash
diff <(grep -v "^heat:\|^loads:\|^runs:\|^last-run:" project_file) \
     <(grep -v "^heat:\|^loads:\|^runs:\|^last-run:" bundled_file)
```
Empty diff = not customized = safe to overwrite.
Non-empty diff = customized = skip and report.

## Bundled Sources

- Body templates: `~/.soma/agent/body/public/`
- Protocols: `~/.soma/agent/content/protocols/` (or `dist/content/protocols/`)
- Scripts: `~/.soma/agent/content/scripts/` (or `dist/content/scripts/`)
- Settings defaults: `core/settings.ts`

## Gap Handling

If a phase file is missing (e.g. no `v0.6.4-to-v0.6.5.md`), skip it and
note the gap. The next phase may cover cumulative changes. Not every version
bump requires .soma/ structural changes — patch releases often don't.

## Reference

`migrations/log.md` — overview of all version changes in one file.
Not used programmatically — the phase files are the source of truth.
Useful as context when the agent needs the big picture.
