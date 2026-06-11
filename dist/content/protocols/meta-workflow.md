---
name: meta-workflow
type: protocol
status: active
description: "The operating cadence — how work flows in a project. Three nested loops (session / feature / evolution); the cadence self-amends from its own observations. The body IS the project; instantiate this as a per-project META_WORKFLOW.md."
heat-default: warm
tags: [workflow, cadence, cycles, evolution, context-engineering, multi-project]
applies-to: [always]
requires:
  protocols: [breath-cycle]
scope: bundled
tier: core
created: 2026-06-10
updated: 2026-06-10
version: 1.1.0
author: meetsoma
license: CC BY 4.0
---
# Meta-Workflow Protocol

> The **cadence** — how an idea becomes shipped, verified, consolidated work, and how the way you work
> improves from its own incidents. `breath-cycle` governs a single session; this governs the arc above
> it (a feature, a cycle) and the loop above *that* (the workflow rewriting itself). The **body is the
> project**: its identity is the project's context, its services/infra are *body parts*, and this is
> how work flows through it.

## TL;DR
- Three nested loops: **BREATH** (a session — `breath-cycle`) → **ARC** (a feature/cycle, 7 stages) → **EVOLUTION** (the cadence amends itself from observations).
- The ARC loop: **GROUND → DECIDE → PLAN → BUILD → VERIFY → CONSOLIDATE → REFLECT.** Each stage has a gate ("done = …"). Never skip GROUND or REFLECT.
- **Process-by-evidence, not by vibe:** every amendment to how you work cites the observation(s) that drove it.
- **Docs index the source, they don't duplicate it** (PCE). A stale duplicate is worse than a pointer.
- Instantiate this in a project as a living **`META_WORKFLOW.md`** (its own ledger, register, cycles). This protocol is the *shape*; the instance holds the *content*. A project can run many cycles under one META_WORKFLOW; a workspace navigates project ↔ parent scope.

## The three nested loops

```
   ┌─ BREATH (a session) ───────────────────────────────────────────────┐
   │  inhale → hold → exhale         (the breath-cycle protocol)         │
   │  one shift. The preload carries the ARC position + open decisions    │
   │  + the observation harvest forward across amnesia.                  │
   └────────────────────────────────────────────────────────────────────┘
        ┌─ ARC (a feature / cycle) ──────────────────────────────────────┐
        │  GROUND → DECIDE → PLAN → BUILD → VERIFY → CONSOLIDATE → REFLECT │
        │  one piece of work, many sessions. REFLECT(n) feeds GROUND(n+1). │
        └────────────────────────────────────────────────────────────────┘
             ┌─ EVOLUTION (the workflow itself) ──────────────────────────┐
             │  observations → ledger → amendment (cites its evidence)     │
             │  the cadence improves from its own incidents.              │
             └────────────────────────────────────────────────────────────┘
```

Each loop feeds the one outside it. A session's preload carries the arc's position; an arc's
reflection feeds the evolution ledger. The inner loop is owned by `breath-cycle`; this protocol owns
the middle and outer loops.

## The ARC loop — 7 stages

Each stage has a **gate**: what "done" means, so you always know where the work sits. An arc may
ping-pong (BUILD ↔ VERIFY) but never skips GROUND or REFLECT.

| # | Stage | What you do | Gate (done = ) | Leans on |
|---|---|---|---|---|
| 1 | **GROUND** | Read the real consumers; verify *live* state (run it, don't assume); search for prior art / existing cycles before scoping. | You know the **real** current state, not the documented one. | `pre-flight`, `tool-discipline` |
| 2 | **DECIDE** | Surface the forks as options + leaning + implication. The user sets scope. | A scoped direction + open forks in the **Decision Register**. | §Decision Register |
| 3 | **PLAN** | Turn scope into a living plan a fresh agent could execute (phases, forward-pointers). | A plan that survives amnesia. | `implementation-plans`, `plan-hygiene` |
| 4 | **BUILD** | Lay pipe one unit at a time. Test → commit → push. No orphan/untested work. | Shipped, pushed, tested. | `workflow` |
| 5 | **VERIFY** | Probe the **real artifact** — run the path, open the page, check the output. Not "should work." | Proof, not theory. | `quality-standards` |
| 6 | **CONSOLIDATE** | Update the plan/index/body/breadcrumbs. Demote stale, preserve history, forward-point. | The substrate reflects reality. | `session-checkpoints` |
| 7 | **REFLECT** | Harvest observations → ledger. Write the preload + a roadmap-style session log. | Continuity + evolution-input captured. | `breath-cycle` (exhale), `pattern-evolution` |

**The close:** REFLECT(n) → GROUND(n+1) (the next arc inherits real state) **and** → EVOLUTION (the
ledger). An arc that ships code but skips CONSOLIDATE/REFLECT leaves debt: drift + lost lessons.

## The EVOLUTION loop — the cadence rewrites itself

The cadence is **living**: it describes what you actually do that works, and amends itself from
observations. This is the determinism the cadence is built on: *process-by-evidence, not process-by-vibe.*

- **Observation Ledger** (append-only). At REFLECT, log 1–3 honest notes, each typed
  `worked` / `didn't` / `gap` / `infra`.
- **Amendment rule:** when an observation **recurs (≥2×) or is high-impact**, it amends the cadence —
  a new stage-rule, a new tool, a new habit — and the amendment **cites the observation id(s)**. No
  un-sourced rules.
- This is the *process* sibling of `pattern-evolution` (which matures *content*: skill → muscle →
  protocol → automation). A recurring observation resolves into either a **muscle** (knowledge, via
  `pattern-evolution`) or a **cadence amendment** (process, here). Same instinct — friction becomes
  mechanism — applied to two different things.

## The Decision Register

Open forks live here until built, so they're never re-litigated or lost. Status: `open` (surfaced,
not decided) · `scoped` (direction set) · `built` (laid). Surface open forks in every preload until
`built`. Decisions are substrate, not chat — write them down.

## The RESUME block (PCE for a cycle)

Every **active** plan/cycle carries one RESUME block at the top — the single thing a future session
reads to know where to go, then it **opens the source it names**, not the block:

```
> **RESUME (<session> · <stage>):** <one-line status — what's true now>.
> **Next:** <the single next action>.
> **⚠ READ FIRST (source of truth — this block may lag):** `<file>` (<why>) · `<exact cmd>`.
```

Keep it **current** (update or delete on every touch — a stale RESUME is worse than none); it
**points, never duplicates**; it's **assertive** ("read before continuing") so the loader actually
opens the source. It's the per-cycle analogue of the preload's resume point.

## PCE — docs are an index to source, not a duplicate

**Programmatic Context Engineering:** decide what a future session reads to regain exactly the context
it needs — and nothing it doesn't. Most "documentation debt" is a *context-economics* problem, not a
writing one. Two waste modes, both costly:

- **Stale duplication** — a hand-written fact drifts from its source; the reader trusts a lie.
- **Over-documentation** — prose restates what the code/canonical doc already says; the reader reads
  the prose instead of the truth.

**The write-test** (apply before writing any fact): *derivable from source? → point to it. Opinion /
decision / gotcha / where-you-left-off? → write it, terse.* When you must state a derived fact, name
its source so it stays re-verifiable and prunable. Prune stale on sight.

## Body parts — the project's organs

The body is the project; its services and infra are **body parts** (a deploy target, an issue
tracker, a CDN, a vision provider, a database). Each is a lazy "organ" — a reference file loaded on
demand, not eager weight in every boot.

A body part is an **index to live source + the tool to read it fresh**, never a cache of learned
doc-prose (platforms and docs drift — a cached "what I read once" is the costliest stale). Per topic,
write the **source of truth + how to fetch it** (a doc URL + `browser`, a config path + `read`, a
probe command); keep inline only your **durable, hard-won specifics** (your instance, your traps,
your patterns) — those aren't in anyone's docs.

The canonical shape is a **Resources table, read first** — per need, name the source of truth + the
tool that fetches it fresh:

| Need | Source of truth | How to fetch |
|---|---|---|
| Docs / API / versions | the platform's live docs | `browser` — navigate the doc URL |
| Our IDs / config / secrets | the config / secrets file | `read` the file — never trust a pasted value |
| How it actually behaves | the source / repo | `read` the source |
| Why it's built this way | the owning cycle | open `cycles/<x>` |

Keep inline only the durable specifics not in any of those sources. (The `DNA` body doc's
§Lazy-vs-Eager covers the eager-vs-lazy *loading* mechanism this rides on.)

**Multi-project:** one `.soma` per project; the project's body = its context; shared identity and
method live up at the parent/workspace scope, project specifics live local. The body chain walks
child → parent, so child files load first. A project may run its own META_WORKFLOW + cycles.

## The preload contract

The preload is REFLECT's output — the session handoff that survives amnesia. It follows `breath-cycle`
§Preload Quality (resume point · what shipped · orient-from · next steps), plus three **cadence-specific**
carries: the **arc + stage** (where to resume in the loop, not just what happened) · the **open Decision
Register forks** (surfaced until built) · and 1–3 **observations** for the ledger.

## Why a cadence rule fires — the two-layer rule

A cadence rule only fires if two layers exist: (a) the **procedure**, written once in the cadence doc
(this protocol; your project's `META_WORKFLOW.md`), and (b) an **eager trigger** carried in the boot
prompt — a warm protocol breadcrumb, an identity line — that binds the user's intent to it. A procedure
with no eager trigger is inert no matter how well written: that's why `breath-cycle`'s rotation triggers
live in its always-loaded breadcrumb, not only in its body. When you add a cadence rule that must
*fire*, give it both layers.

## Instantiate it in your project

This protocol is the **shape**. Installing it (bundled, or `soma install protocol meta-workflow`)
delivers the shape — but the shape is **inert until you instantiate it**. To use it, give the project
a living **`META_WORKFLOW.md`** that holds the *content*: its own Observation Ledger, its own Decision
Register, its cycles. Treat it as the project's operating system, written by the COO who keeps the
incident log — never "done," every arc leaves it a little truer. The protocol ships with Soma; the
instance is yours.

**Adoption (an existing project).** Just ask Soma — *"set up the meta-workflow cadence"* — and it runs
these steps. The two-layer rule applies: the cadence only *fires* if an eager surface points at the
instance (step 2). `breath-cycle` already carries the rotation triggers eagerly, so you only wire the
pointer.

1. **Scaffold `META_WORKFLOW.md`** from the starter below. Default location: **`.soma/META_WORKFLOW.md`**
   (or `.soma/cycles/META_WORKFLOW.md` if you keep a `cycles/` board). **Put it at the `.soma/` root or
   in `cycles/` — NOT in `amps/protocols/` or `amps/muscles/`.** Those AMPS dirs are compiled into the
   system prompt at boot; the instance is a living doc you *read on demand* (via the step-2 breadcrumb),
   not a rule to inject every boot. Map the 7 ARC stages to *your* real tools; leave the Ledger and
   Register empty — they fill from real arcs.
2. **Wire the breadcrumb** — add one line to an eager body file (e.g. `body/body.md`): *"Operating
   cadence → `META_WORKFLOW.md`; read it unprompted at boot / rotation / stage transition / before
   scoping new work."* This is what makes the doc actually get opened.
3. **(optional) Lean the preload** — point your `_memory.md` exhale steps at `breath-cycle`'s checklist
   instead of duplicating them, and have the preload carry the arc+stage, open Decision-Register forks,
   and 1–3 observations (the cadence-specific carries, see §The preload contract).
4. **(optional) Body parts** — for each service/infra the project depends on, add a `body/<part>.md`
   that **indexes live source + the tool to read it fresh** (see §Body parts), not a cache of doc-prose.

That's it — the cadence is now running. From here it's self-maintaining: every REFLECT appends to the
Ledger, every fork goes in the Register, and recurring observations amend the doc (citing their evidence).

### Starter `META_WORKFLOW.md`

Copy this, fill the two bracketed spots, delete the rest of the brackets. It **points** at this
protocol for the loop definitions (PCE — don't restate the shape); it holds only your project's content.

```markdown
---
type: meta-workflow
domain: [what this project IS — one line]
status: living (v0 — self-evolving from observations)
created: [date]
instantiates: meta-workflow protocol (the shipped shape; this is this project's instance)
---

# META_WORKFLOW — the [project] operating cadence

> The **cadence** (how an idea becomes shipped, verified, consolidated work — the HOW), which
> **amends itself** from observations. The generic shape lives in the `meta-workflow` protocol; this
> holds the content. Determinism rule: every amendment cites the observation(s) that drove it.

## The ARC loop mapped to [project] (the 7 stages → real tools)
Generic shape: `meta-workflow` protocol §The ARC loop. Here's how each stage cashes out here:

| # | Stage | [project] tooling |
|---|---|---|
| 1 | GROUND     | [how you read real state / survey prior art here] |
| 2 | DECIDE     | surface forks → the Decision Register ↓ |
| 3 | PLAN       | [where plans live — a cycle doc, a tracker] |
| 4 | BUILD      | [your build/test/commit discipline] |
| 5 | VERIFY     | [how you prove it on the real artifact] |
| 6 | CONSOLIDATE| [what you update — docs/index/body] |
| 7 | REFLECT    | `breath-cycle` exhale checklist → ledger + preload |

## EVOLUTION — the Observation Ledger (append-only; newest first)
At REFLECT, log 1–3 honest notes (`worked`/`didn't`/`gap`/`infra`). Recurs ≥2× or high-impact → amendment, citing the id.

| id | session | type | observation | → amendment |
|----|---------|------|-------------|-------------|
| O1 |         |      |             |             |

## The Decision Register (open forks — surface in preloads until built)
Status: `open` · `scoped` · `built`. Detail in the owning doc; this is the index.

| id | decision | status | owner doc |
|----|----------|--------|-----------|
| D1 |          |        |           |

## Cycles (the work, indexed)
| cycle | status | what |
|-------|--------|------|
|       |        |      |
```

## When to Apply

Any project with work that spans more than one session — a feature, a cycle, an arc. Read the
project's `META_WORKFLOW.md` (if it has one) **unprompted** at boot, on a rotation trigger, at a stage
transition, and before scoping new work (`breath-cycle` §Rotation is self-initiated).

## When NOT to Apply

One-off tasks that begin and end in a single session with nothing to carry forward don't need the arc
or evolution loops — the breath cycle alone suffices. Don't manufacture cycles for work that isn't one.

---

<!--
Licensed under CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
Author: meetsoma · synthesized from operating cadences proven across multiple Soma projects (2026-06).
-->
