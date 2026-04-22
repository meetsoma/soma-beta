---
type: reference
status: active
created: 2026-03-21
updated: 2026-04-22
---

# Migration Maps

Version-to-version migration maps for `.soma/` workspaces.

## Status: documentation layer, not the enforcement layer

As of v0.20.x, **migration maps are narrative documentation**. They explain
what changed between versions so a user (or agent) reading the git history
has a single source of truth per release arc. They are **not** the mechanism
that actually keeps user workspaces in sync.

### The enforcement layer is `addIfMissing`

The mechanism that keeps existing `.soma/` workspaces forward-compatible
lives in `extensions/soma-boot.ts` (lines ~1167-1178):

```ts
const addIfMissing = (key: string, val: any) => { /* ... */ };
addIfMissing("doctor",      { autoUpdate: true, declinedVersion: null });
addIfMissing("keepalive",   { maxPings: 5, autoExhale: true, ... });
addIfMissing("breathe",     { auto: false, triggerAt: 50, rotateAt: 70, ... });
addIfMissing("context",     { notifyAt: 50, warnAt: 70, ... });
addIfMissing("preload",     { staleAfterHours: 48, lastSessionLogs: 0 });
addIfMissing("scratch",     { autoInject: false });
addIfMissing("guard",       { coreFiles: "warn", bashCommands: "warn", ... });
addIfMissing("checkpoints", { enabled: true, intervalMinutes: 5, ... });
addIfMissing("cache",       { retention: null });
```

Every boot, Soma adds any missing top-level settings keys with sane defaults.
Doctor also seeds body files (e.g. `body/children/*.md`, `_tools.md`) when
absent via `core/init.ts`. This strategy:

- **Self-heals** — a user who skipped 5 versions gets all new settings in one boot
- **Doesn't need version tracking** — every key is idempotent and cumulative
- **Doesn't fail** — presence of extra old keys is harmless
- **No per-version migration script to maintain**

**This is why migration maps stopped being written as executable `fix-scripts`
around v0.11.0.** The `addIfMissing` pattern made them redundant for the
mechanical case.

## When to write a migration map

Write one when:

1. **A release ships.** One map per release arc (major or minor — your call based on coherence, not SemVer rigidity). Goal: if a user reads one map, they understand the full transition. Consolidate patch versions into the arc's map.
2. **A change is breaking.** Old format will *fail* (not just be suboptimal). Breaking changes are rare — flag with `breaking: true` and describe remediation in `## Migration Steps`.
3. **A change requires user-side action.** Flag `migration-required: true`. Usually: the user must rename a file, move content, or opt in. Most Soma changes don't.

Do **not** write one when:

- The change is a pure bug fix with no new settings
- The change is additive and `addIfMissing` covers it
- The change is internal (no user-facing `.soma/` surface)

## File conventions

```
migrations/
├── README.md                         ← this file
├── phases/
│   ├── v0.6.1-to-v0.6.2.md
│   ├── v0.6.2-to-v0.6.3.md
│   ...
│   ├── v0.10.0-to-v0.11.0.md        ← per-minor when active development
│   ├── v0.11.0-to-v0.12.0.md        ← consolidated arc (backfilled s01-f6e928)
│   ├── v0.12.0-to-v0.20.0.md        ← consolidated arc (backfilled s01-f6e928)
│   └── v0.20.0-to-v0.20.4.md        ← consolidated arc (dev)
└── _legacy/                          ← archived pre-0.6.1 maps, if any
```

**Per-patch** (v0.X.1 → v0.X.2) granularity is fine but not required.
**Per-arc** (e.g. v0.11.0 → v0.12.0 covering 0.11.1, 0.11.2, 0.11.3, 0.11.4, 0.12.0)
tells the story better and is what the current-day practice does.

## Minimum frontmatter

```yaml
---
type: migration-map
from: "0.11.0"                    # starting version
to: "0.12.0"                      # ending version
migration-required: false         # true if user-side action needed
breaking: false                   # true if old format will fail
created: 2026-04-22
status: active                    # active | draft | deprecated
tags: [somaverse, hub, cache]
fix-mode: none                    # script | agent | none
---
```

**`fix-mode: none`** is the default today. Reserve `script` or `agent` for
rare breaking transitions that need a mechanical or semantic fix beyond
what `addIfMissing` can handle.

## Minimum body sections

```markdown
# Migration: vX.Y.Z → vA.B.C

## Summary
<!-- 2-3 sentences: what changed, breaking?, what user sees -->

## What Changed
<!-- Grouped by theme. Bullet list. Link to tickets/CHANGELOG entries. -->

## Migration Steps
<!-- "None required" is a valid answer — say so explicitly. -->
<!-- If opt-in features exist, put them under "### Optional (opt into X)". -->

## Compatibility
<!-- What old configs / custom extensions / body files continue to work. -->

## Verify
<!-- Numbered checks to confirm the user's workspace is on the new version. -->
```

## How `soma doctor` uses maps today

`soma doctor` and `soma update`:
1. Read `version` from `.soma/settings.json` (or default `0.6.1` if missing)
2. Compare against the agent's current version
3. Report which migration maps are "pending" (purely informational — the maps
   themselves don't run; they exist for humans and agents to read)
4. Apply `addIfMissing` to settings and seed any missing body files

When `fix-mode: script` or `fix-mode: agent` is set on a map, the doctor
*can* run the fix script (or agent prompt). As of v0.20.x, no active map
uses these modes — all migrations are handled by the boot-time pattern
above.

## During development

When making changes that affect user `.soma/` format:

1. Are you adding a new settings key? → add an `addIfMissing` line in `soma-boot.ts` and document it in the current release's map.
2. Are you adding a new body file? → seed it from `core/init.ts` doctor logic and document.
3. Are you breaking an old format? → stop and think. Write a `fix-mode: script` map if unavoidable.
4. Otherwise → no action beyond a bullet in the current arc's map.

## Multi-project (v0.7.0+)

When Project Navigator lands, `soma doctor` will scan all registered
projects. Each project's `.soma/settings.json` tracks its own version
independently. Maps remain universal — same map applies to any `.soma/`
regardless of project.

```
soma doctor              ← current: scans .soma/ in cwd
soma doctor --all        ← future: scans all registered projects
soma doctor --select     ← future: interactive picker
```
