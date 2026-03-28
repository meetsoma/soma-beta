---
name: heat-tracking
type: protocol
status: active
description: "Soma loads protocols and muscles by temperature: cold (skip), warm (breadcrumb), hot (full). Heat auto-adjusts from usage patterns and decays when idle. /pin and /kill for manual control."
heat-default: warm
tags: [memory, loading, performance, self-awareness]
applies-to: [always]
scope: core
tier: core
created: 2026-03-09
updated: 2026-03-22
version: 2.0.0
author: Curtis Mercier
license: CC BY 4.0
---
# Heat Tracking

> How Soma decides what to load into your context. The heat system is built into the boot extension — this protocol helps you understand what's happening and how to tune it. Editing this file won't change the heat system's behavior.

## TL;DR
Heat decides what loads into your brain each session. Cold (0-2) content is skipped entirely — you won't see it. Warm (3-7) loads just the TL;DR summary. Hot (8+) loads the full body. Heat decays each session you don't use something, and bumps when you do. This means your prompt naturally evolves: frequently-used content stays visible, stale content fades. `/pin` forces something hot. `/kill` drops it to 0 immediately.

## How It Works

Every protocol and muscle has a heat value. Higher heat = more presence in your system prompt.

| Heat | State | What Loads |
|------|-------|-----------|
| 0-2 | Cold | Nothing. Listed as "available" in boot. |
| 3-7 | Warm | Breadcrumb — 1-2 sentence summary. |
| 8+ | Hot | Full content injected into system prompt. |

### Auto-Detection

Soma watches tool results and bumps heat when it sees relevant patterns:

**Protocols:**
- Frontmatter writes → `frontmatter-standard` +1
- Preload writes → `breath-cycle` +1
- Checkpoint commits → `session-checkpoints` +1

**Muscles:**
- File reads matching muscle `triggers:` → muscle heat +1
- Script execution matching muscle name → muscle heat +1
- SVG/logo file writes → `svg-logo-design` +1

**Limitation:** most protocol usage isn't detectable from tool results. A protocol like `working-style` has no tool signature — its heat only changes via manual `/pin` or `heat-default` in frontmatter.

### Decay

On session end, unused protocols lose `decayRate` heat (default: 1). A protocol you stop using naturally fades from context. Use `/pin` to keep something hot.

## Settings

```jsonc
{
  "protocols": {
    "warmThreshold": 3,
    "hotThreshold": 8,
    "maxHeat": 15,
    "decayRate": 1,
    "maxBreadcrumbsInPrompt": 10,
    "maxFullProtocolsInPrompt": 3
  },
  "muscles": {
    "tokenBudget": 2000,
    "maxFull": 2,
    "maxDigest": 8
  },
  "heat": {
    "autoDetect": true,
    "autoDetectBump": 1,
    "pinBump": 5
  }
}
```

### Tuning Guide

| Goal | Adjust |
|------|--------|
| Load more protocols | Raise `maxFullProtocolsInPrompt`, lower `hotThreshold` |
| Faster protocol rotation | Raise `decayRate` to 2-3 |
| Keep everything loaded | Set `decayRate: 0`, pin what you want |
| Minimize prompt size | Lower `maxFull` and `tokenBudget` |
| Disable auto-detection | Set `autoDetect: false` — manual only |

## Commands

| Command | Effect |
|---------|--------|
| `/pin <name>` | Bump heat by `pinBump` (default +5) |
| `/kill <name>` | Drop heat to 0 |

## Source

- Protocol loading: `core/protocols.ts` → `discoverProtocols()`, `buildProtocolInjection()`
- Muscle loading: `core/muscles.ts` → `discoverMuscles()`, `buildMuscleInjection()`
- Heat state: `.soma/state.json` (protocol heat values)
- Auto-detection: `extensions/soma-boot.ts` → `tool_result` event handler
- Settings: `core/settings.ts` → `ProtocolSettings`, `MuscleSettings`, `HeatSettings`

---

<!--
Licensed under CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
Author: Curtis Mercier
-->
