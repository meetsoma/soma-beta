---
name: breath-cycle
type: protocol
status: active
description: "Inhale → hold → exhale. Auto-breathe at 50%/70%/85%. Rotation is self-initiated (natural-language wrap-up phrases fire it). The exhale is a complete checklist — the preload is the last step, never the only one."
heat-default: warm
tags: [session, memory, continuity, self-awareness]
applies-to: [always]
scope: core
tier: core
created: 2026-03-09
updated: 2026-06-10
version: 3.0.0
author: Curtis Mercier
license: CC BY 4.0
---
# Breath Cycle

> How Soma manages session lifecycle. This behavior is built into the boot extension — this protocol helps you understand what's happening and how to change it.

## TL;DR
Inhale → hold → exhale. Auto-breathe at 50%/70%/85%. Commands: `/exhale`, `/breathe`, `/rest`, `/inhale`. **Rotation is self-initiated** — a natural-language wrap-up phrase ("wrap up", "wind down", "let's call it") fires the exhale; the user never lists the steps. **The exhale is a complete checklist** (verify → ship-completeness → reflect → promote → preload → log), and the preload is the *last* step, never the only one.

## How It Works

Soma sessions have three phases, handled by `extensions/soma-boot.ts`:

**Inhale** (automatic on boot)
Identity → preload → protocols → muscles → automations → scripts → git context → compile system prompt. You receive a boot message with the result. No action needed.

**Hold** (automatic monitoring)
Soma watches context usage and notifies at configurable thresholds:
- `breathe.triggerAt` (default 50%) — starts wrap-up suggestions
- `breathe.rotateAt` (default 70%) — writes preload, offers rotation
- 85% — safety net, always fires regardless of settings

**Exhale** (agent-driven)
Triggered by `/exhale`, `/breathe`, `/rest`, a **natural-language wrap-up phrase** (below), or auto at 85%. The exhale is a **checklist, not a single action** — see *The exhale is a complete checklist* below. The preload is always the *last* step.

## Rotation is self-initiated

You don't wait to be told to wrap up. A **natural-language wrap-up phrase** fires the exhale exactly like `/exhale` does — the user should never have to list the steps:

> "wrap up" · "let's wrap (up)" · "wind down" · "let's call it" · "that's a wrap" · "close it out" · "prepare to rotate" · "end of session" · "finish up for now"

Any of these — or `/exhale` / `/breathe`, or context ≥ 70% — means *run the full exhale checklist now.*

**Read your cadence unprompted.** If the project has an operating cadence — a `meta-workflow` doc, a dev cycle, a workflow protocol — consult it *without being asked* at the moments that matter: at boot, on a rotation trigger, at a stage transition, and before starting a new piece of work. A procedure only fires if you open it at the right time; a doc no one opens is inert.

## The exhale is a complete checklist

The most common failure is an exhale that fires correctly but only writes a preload — dropping the reflection, the docs, the promotion. **A faithful trigger with an incomplete checklist still loses the session.** Run *all* of these, in order — the preload is **last**:

1. **Verify state** — `git status` across every touched repo. Nothing important left uncommitted.
2. **Ship-completeness** (below) — for everything shipped this session: docs? test? discoverable?
3. **Reflect** — Memory Lane Reflection (`memory-lane-reflection` muscle); 5+ cycles at 70%+ context. Surface lessons + gaps *explicitly* — corrections are the richest signal.
4. **Promote what recurred** (below) — file each observation at its home; anything that recurred ≥2× becomes a muscle *now*.
5. **Write the preload** — last. Resume point + what shipped + orient-from + next steps (see *Preload Quality*).
6. **Log the session** + commit/push everything tracked.

> **The exhale is steps 1–6, not step 5 alone.** If all you wrote was a preload, you skipped the exhale.

This applies identically to an **auto-fired** exhale — the 85% safety net and keepalive exhaustion run all six steps, not just the preload.

## Ship-completeness

A feature isn't done when the code works — it's done when **the user can find it and a test guards it.** For every feature / surface / endpoint / command shipped this session:

- **Docs** — can the user discover and use it? (handbook, README, help text)
- **Test** — is there a test guarding the behavior?
- **Discoverable** — is it surfaced where a user looks? (menu, changelog, guide)

Do it now, or name it explicitly as a **GAP** in the preload. Don't let a shipped feature leave the session invisible.

## Promote what recurred

Reflection that only *notices* a pattern and defers it is the anti-pattern — the deferral is where lessons die:

- File each loose observation at its home (a code comment, an identity note, a muscle, a protocol).
- **Anything that recurred ≥2× this arc → promote it to a muscle now.** Not "next time." Now.
- A correction you had to be given twice is a muscle you should already have.

## Self-diagnostic

The cadence names its own failure mode. **If the user ever had to ask for the wrap-up, the docs, the reflection, the promotion, or the gaps — a step was skipped.** That ask is the tell. And if all you produced at exhale was a preload, you skipped steps 1–4.

## Preload Lifecycle State Machine

Preload state is tracked in `extensions/_shared/preload-lifecycle.ts`. All three extensions that interact with preloads read/write the same state via route capabilities (`preload:lifecycle`, `preload:transition`, `preload:reset`):

| State | Meaning | Set by |
|---|---|---|
| `UNREQUESTED` | No preload needed yet | `session_start` (every new session) |
| `REQUESTED` | Someone asked the agent to write/update a preload | `/exhale`, `/breathe`, safety net (85%), keepalive exhaustion |
| `SAVED` | Preload file written to disk | `tool_result` detecting preload-*.md write |
| `STALE` | Preload exists but >5 tool calls happened after | Auto-transition when tool call counter exceeds threshold |

**Why this matters:** If you type `/exhale` at 89% context, the 85% safety net in `before_agent_start` checks the lifecycle state. If it's `REQUESTED` (set by `/exhale`), the safety net notifies instead of overriding — no competing emergency breathe, no immediate rotation before the preload update lands. Before this state machine existed, three independent sets of `let` flags had no way to coordinate.

**Route caps:**
- `route.get("preload:lifecycle")()` — returns `{ state, source, toolCallsSinceSave, preloadPath, requestedAt, savedAt }`
- `route.get("preload:transition")(to, opts?)` — triggers state transition
- `route.get("preload:reset")()` — fresh session reset
- `route.get("preload:noteToolCall")()` — counts work after save

## Settings

```jsonc
// .soma/settings.json
{
  "breathe": {
    "auto": "on",        // "on" | "auto" | "off" — proactive, adaptive, or passive
    "triggerAt": 50,     // % to start suggesting wrap-up
    "rotateAt": 70       // % to auto-rotate into fresh session
  }
}
```

### Auto modes

| Mode | Behavior |
|------|----------|
| `"on"` (or `true`) | **Proactive** — fires trigger warnings at `triggerAt`%, auto-rotates at `rotateAt`%. Fixed thresholds. |
| `"auto"` | **Adaptive** — uses per-model or per-session-type thresholds. Same proactive behavior as `"on"` but thresholds adjust to context. Currently behaves as `"on"`; adaptive logic is a future slot. |
| `"off"` (or `false`) | **Passive** — no proactive warnings or rotation. Only the 85% safety net fires. |

### What changes when you adjust these:

| Setting | Lower value | Higher value |
|---------|------------|-------------|
| `triggerAt` | Earlier wrap-up, shorter sessions, more preloads | Longer sessions, risk of rushed exhale |
| `rotateAt` | Auto-rotates sooner, less context per session | More context per session, risk of hitting 85% wall |

**For deep work sessions:** raise `triggerAt` to 65-70, `rotateAt` to 80. You'll get longer uninterrupted sessions but tighter exhale windows.

**For rapid iteration:** lower `triggerAt` to 40, `rotateAt` to 60. More frequent rotations, cleaner preloads.

## Commands

| Command | Effect |
|---------|--------|
| `/exhale` | Save state, end session |
| `/breathe` | Save + rotate into fresh session |
| `/rest` | Disable keepalive + exhale |
| `/inhale` | Load preload into current session |

## Preload Quality

> **Customizable:** Override the preload format by creating `.soma/body/memory.md`. The agent uses your template instead of the default. Template variables: `{{today}}`, `{{sessionId}}`, `{{logPath}}`, `{{target}}`.

A good preload is the difference between a productive next session and a wasted one. Key elements:

- **Resume point** — one sentence: what were you doing, where did you stop?
- **What shipped** — commits, features, fixes. Concrete, not vague.
- **Orient From** — exact file paths the next session should read before starting work.
- **Do NOT Re-Read** — files already in context that the next session shouldn't waste tokens on.
- **Actionable next steps** — numbered, with blockers noted. Not a wish list — a plan.

A preload that says "continued working on the feature" is useless. A preload that says "shipped `abc123`, blocked on API auth, next: read `src/auth.ts` lines 40-80" is gold.

## Source

- Boot extension: `extensions/soma-boot.ts` (context monitoring, rotation logic)
- Preload writer: `core/preload.ts` (preload format, staleness check)
- Settings: `core/settings.ts` → `BreatheSettings`

---

<!--
Licensed under CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
Original: https://github.com/curtismercier/protocols/tree/main/breath-cycle
Author: Curtis Mercier
-->
