---
name: deep-recall
type: protocol
status: active
description: "Preloads are surface memory. On continued sessions, deepen context: soma-seam trace the work topic, soma-reflect for past patterns, scan recent session logs."
heat-default: warm
tags: [memory, context, continuity, recall]
applies-to: [always]
scope: bundled
tier: official
created: 2026-03-15
updated: 2026-04-03
version: 1.1.0
author: meetsoma
license: MIT
---

## TL;DR
The preload tells you WHAT happened. Deep recall tells you HOW and WHY. When continuing work across sessions, the preload is your surface memory — read it first. Then use your tools to reconstruct working memory: trace the topic through seam, check session logs for the detailed path, scan for patterns you noticed before. The goal: arrive at the same depth of understanding the previous session had, without burning context re-reading everything manually.
## When to Trigger
- **Every continued session** (`soma inhale`, `soma -c`, or when preload loads)
- **When the user says what they want to work on** — that's your keyword for deep recall
- **After reading the preload** — if the preload references work you don't fully remember
## The Protocol
### Phase 1: Surface (automatic — preload loads at boot)
The preload gives you:
- Resume point (what's done, what's next)
- Orient From files (what to read)
- Warnings (traps to avoid)
- Key decisions (don't re-debate)
**This is enough for simple tasks.** If the preload says "fix the CSS on the beta page" — just do it.
### Phase 2: Deep Recall (when the work is complex)
When the user describes what they want to do next, run a quick recall cycle:
```bash
# 1. Trace the topic through memory
soma-seam.sh trace "<keyword>"
# → Shows: related muscles, protocols, MAPs, sessions, seeds
# 2. Check recent session logs for the detailed path
soma-reflect.sh --since <last-session-date>
# → Shows: observations, gaps, recurring patterns
# 3. If a MAP exists for this work, read it
# The focus system may have already loaded it — check the boot message
```
### Phase 3: Targeted Deep-Load (when specific context is needed)
If the seam trace or session logs reveal important context that's NOT in the preload:
```bash
# Read a specific session log for the detailed work path
soma-code.sh lines <session-log> <start> <end>
# Read a targeted preload from a related MAP
# These contain file:line references and mental models
cat .soma/memory/preloads/preload-target-<map-name>.md
# Scan JSONL conversation logs for specific tool calls
/scan-logs tools <pattern>
```
### Phase 4: Declare Context (tell the user what you loaded)
After deep recall, state what you now know:
- "I've traced our work on [topic]. Last session we [summary]. The key decisions were [list]. I'm ready to continue from [point]."
This builds trust — the user knows you're not guessing.
## Why This Matters
### The memory hierarchy:
```
System prompt (identity, protocols, muscles)  ← always loaded, general
         ↓
Preload (resume point, warnings, decisions)   ← loaded on inhale, session-specific
         ↓  
Deep recall (seam traces, session logs, MAPs) ← loaded on demand, work-specific
         ↓
JSONL logs (every tool call, every result)    ← raw feed, searchable
```
The preload is a COMPRESSION of the session. It can't hold everything — especially the reasoning path, the false starts, the "we tried X and it didn't work because Y" moments. Those live in the session logs.
Deep recall reconstructs the uncompressed context from the compressed preload. It's the difference between reading a summary and remembering the experience.
### Token efficiency:
Without deep recall: the agent reads everything in Orient From (burns 10K+ tokens on files that may not all be relevant).
With deep recall: the agent reads the preload (500 tokens), traces the specific topic (200 tokens of tool output), and loads only the relevant context (1-2K tokens of targeted reads). Total: ~2K instead of 10K+.
## Tools Reference
| Need | Tool | What it returns |
|------|------|----------------|
| What's connected to this topic? | `soma-seam.sh trace <keyword>` | Related muscles, protocols, MAPs, sessions |
| What patterns did I notice before? | `soma-reflect.sh --search <term>` | Past observations, gaps, corrections |
| What did I specifically do last session? | Read session log directly | Commits, decisions, timestamps |
| What tools did I use for this? | `/scan-logs tools <pattern>` | Tool calls from JSONL logs |
| What MAP should I follow? | `soma focus <keyword>` (or check boot message) | Loaded MAPs with prompt-config |
## Prior Session References
When writing a preload, always include:
- **Session ID chain:** `s01-74a9be → s01-cce740 → s01-758528` so the next agent knows the lineage
- **Key preload files:** list earlier preloads that contain deeper context
- **Session log locations:** for the detailed work path
This way, deep recall can follow the chain back as far as needed.
## Memory Drift

A memory that names a specific file, function, flag, or path is a claim that it existed *when the memory was written*. It may have been renamed, removed, or never merged.

Before acting on recalled memory:
- **If it names a file path** — check the file exists before referencing it
- **If it names a function or export** — grep for it before recommending it
- **If it summarizes repo state** (architecture, dependencies, patterns) — treat it as a snapshot, not current truth. Prefer `git log` or reading the code over recalling the snapshot.
- **If the user is about to act on your recommendation** — verify first, recommend second

"The memory says X exists" is not the same as "X exists now."

When a recalled memory conflicts with what you observe in the codebase, trust what you see now — and update or flag the stale memory rather than acting on it.

## Edge Cases
### Direction shift mid-session
If the user changes topic from what the preload describes, do NOT edit the existing preload — it's still valid context for that topic. At exhale, write a NEW preload referencing the old one.
### /rest (going AFK)
If no preload exists yet → write one (capture state before cache expires).
If preload already exists → edit it (update resume point with current state).
Always update session log. Then disable keepalive.
### Cache expiry without /rest
If cache expires and `before_agent_start` re-fires, the preload (if written) provides recovery context. Deep recall from the preload is the graceful degradation path.
### Multiple preloads from same session
Each `/breathe` rotation writes a new preload. They form a chain. Latest is loaded on next inhale, but earlier ones contain phase-specific context that deep-recall can access.
See your ideas directory for the full edge case analysis.
---
