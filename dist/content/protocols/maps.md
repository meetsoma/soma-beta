---
type: protocol
name: maps
version: 1.1.0
status: active
heat-default: warm
created: 2026-03-16
updated: 2026-03-18
author: Curtis Mercier
breadcrumb: "MAPS — My Automation Protocol Scripts. Before any task, check for a MAP. After any repeated task, build one. MAPS connect AMPS into repeatable processes. Refine on every use."
tags: [workflow, process, navigation, amps, efficiency]
applies-to: [always]
scope: bundled
---

# MAPS — My Automation Protocol Scripts

## TL;DR
Read the MAP before starting. Not skim — **read**. The MAP has scar tissue from sessions where you made the exact mistake you're about to make. It tells you which muscles to load, which scripts to run, and in what order. The Gaps section is the most honest part — it's where the MAP admits what it doesn't handle yet. Refine the MAP every time you use it. Build a new one after the second time you do something manually. `soma focus <keyword>` finds relevant MAPs. When you feel confident enough to skip the MAP, that's exactly when you need it most.

## Why

AMPS gives you the raw materials — automations, muscles, protocols, scripts. But materials without a plan produce inconsistent results. One session you remember to run the tests, next session you forget. One session you check the docs, next session you skip it and ship drift.

MAPS fix this. A MAP is a tested path through your AMPS landscape for a specific task. It's not documentation. It's not a checklist someone else wrote. It's *yours* — built from experience, refined when it fails, trusted because it works.

Without MAPS: every task starts from scratch. The agent re-discovers the process, misses steps, repeats old mistakes.  
With MAPS: the agent loads the MAP, follows the path, notes what broke, and improves it.

## Rules

### 1. Check before you start

Before beginning any task, check `amps/automations/maps/` for an existing MAP. If one exists, read it. Follow it. If it's wrong or incomplete, fix it after.

### 2. Build after the second time

The first time you do something, just do it. The second time, you'll notice "I did this before." That's the signal. Build a MAP. Don't wait for the third time — by then you've already repeated the mistake the MAP would have prevented.

### 3. MAPS reference, not repeat

A MAP points to AMPS content by name:

```yaml
reads:
  muscles: [ship-cycle, incremental-refactor]
  protocols: [quality-standards, workflow]
  scripts: [soma-ship.sh, soma-refactor.sh]
```

The agent loads these before executing. The MAP doesn't reproduce their content — it says "read ship-cycle before step 3" and trusts the muscle to provide the knowledge.

### 4. Every MAP has Gaps

At the bottom of every MAP, maintain a `## Gaps` section:

```markdown
## Gaps

- No automated test for route catalog sync (noticed 2026-03-16)
- Step 6 assumes git hooks are set up — should verify first
- Missing: how to handle partial extraction (code moved but tests not updated yet)
```

Gaps are discovered during use. They're not failures — they're the MAP getting smarter. Fix critical gaps immediately. Log non-critical ones for next refinement.

### 5. Refine, don't replace

When a MAP is wrong, update it. Don't delete and rewrite. The history of what changed tells you what the process actually needs — not what you thought it needed when you first wrote it.

### 6. MAPS have triggers

```yaml
triggers: [refactor, extract, move, split]
```

Triggers are keywords the agent recognizes. When the task matches a trigger, the MAP should surface. This is how MAPS get discovered without the agent memorizing them all.

## MAP Structure

```markdown
---
type: map
name: <map-name>
status: active
created: YYYY-MM-DD
updated: YYYY-MM-DD
scope: bundled
triggers: [keyword1, keyword2]
reads:
  muscles: [relevant-muscles]
  protocols: [relevant-protocols]
  scripts: [relevant-scripts]
last-run: null
runs: 0
estimated-turns: 5-10
requires: [what must exist before running this MAP]
produces: [what this MAP creates or updates]
next-map: <name>           # optional — what MAP follows this one
refine-after: <name>       # optional — which MAP's completion sharpens this one
---

# MAP Name

One-line description of what this MAP navigates.

## Steps

Numbered steps. Reference AMPS content by name.
Each step should be verifiable — "run X, expect Y."

## Gaps

Living list of what's missing or broken.
```

### Extended Fields

| Field | Type | Description |
|-------|------|-------------|
| `last-run` | date \| null | When this MAP was last executed |
| `runs` | number | How many times this MAP has been run |
| `estimated-turns` | string | Expected turn range (e.g., "5-10") |
| `requires` | string[] | Preconditions — what must exist before starting |
| `produces` | string[] | Outputs — what this MAP creates or updates |
| `next-map` | string \| null | What MAP follows this one (for phase chains) |
| `refine-after` | string \| null | Which MAP's completion triggers refinement of this one |

These fields enable the agent to estimate session cost, verify preconditions before starting, and track which MAPs are battle-tested vs untested. `last-run` and `runs` update automatically after each use. `estimated-turns` refines over time as the agent learns actual cost.

## MAPS ↔ AMPS

| AMPS Layer | What it is | How MAPS use it |
|------------|-----------|-----------------|
| **A**utomations | Triggered procedures | MAPS *are* manual automations. Automated MAPS become `trigger: event/cron` automations. |
| **M**uscles | Domain knowledge | MAPS load muscles for context. "Read ship-cycle before shipping." |
| **P**rotocols | Behavioral rules | MAPS follow protocols. "Follow quality-standards during review." |
| **S**cripts | Executable tools | MAPS run scripts. "Run soma-refactor.sh routes for audit." |

MAPS are the connective tissue. They don't add new knowledge — they organize existing knowledge into a path.

## Anti-Patterns

- **MAP that inlines muscle content** — now you have two copies that drift. Reference by name.
- **MAP with no Gaps section** — means it's never been stress-tested. Add `## Gaps` even if empty.
- **MAP that's never updated** — a stale MAP is worse than no MAP. It gives false confidence.
- **Skipping the MAP because "I know this"** — you knew it last session too, and you missed step 4.
- **Building a MAP for a one-time task** — overkill. MAPS are for recurring processes.

---

*© Curtis Mercier. Licensed under CC BY 4.0.*
