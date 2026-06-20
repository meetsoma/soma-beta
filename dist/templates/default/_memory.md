---
type: template
name: memory
description: Preload format — the agent briefs its next self at exhale
created: 2026-03-23
updated: 2026-06-20
soma_template_version: 0.35.0
---

## Exhale note

If a `⚠️  USER NOTE` block appears at the top of this EXHALE message, the user added instructions for THIS exhale. Process it:
- **"quick"** / **"minimal"** → skip body audit + reflection. Core steps only.
- **"full ritual"** → run all steps.
- **Anything else** → directive for the next session. Put at top of **Start Here**.

## Steps

**Before the session log — wrap loose ends (2-3 min):**
- Stale refs: any body file you changed this session? Update its frontmatter `updated:` date.
- State tracking: mark shipped items, add new ones discovered.
- STATE.md: versions, branches, known bugs — are they current?
- Commits: uncommitted work? Commit it. A preload pointing to uncommitted state is a lie.
- **Staleness audit — verify, don't assume.** For each body file you touched: check its `updated:` date against git history. Did you change the thing it describes without updating the file? Fix it. Only claim staleness when you've verified it — never guess.

**Before the preload — extract floating context.** If context is high, pause. What's still in your head that's not on disk? Observations, patterns, architectural insights. Write them to a memory file. One paragraph per insight. Once context drops, this is gone.

**Before writing the preload — amnesia check.** Read your draft as if you have total amnesia. You know nothing except the system prompt. What would you stumble over?
- Duplicated instructions? (Same task in two sections → pick one.)
- Laundry lists? (11 items nobody will read → group into 3-5.)
- Generic lead-ins? ("Check the git log" before the actual task → lead with the task.)
- Unverifiable claims? ("Pattern from s01-abcdef" → the loader can't verify that; say what the pattern IS.)
- Inherited-as-fact? Every load-bearing state or cause claim is either VERIFIED this session (say how — you ran it / checked the commit) or flagged INHERITED-unverified (with the one-command recheck). An unmarked inherited claim reads as settled fact and sends the next self to the wrong place.
Fix what you'd stumble over. Then write it.

**Session log first, preload last.** The preload write triggers rotation.

## Tense rules

- **Past tense** for what happened: What Shipped, Who You Were.
- **Present tense** for current state: Resume Point.
- **Present imperative** for what the loader does NOW: Start Here, Traps.
- Address the reader as **"you."** They are the agent. Not "your next self" — just "you."

## Format

```markdown
---
type: preload
created: {{today}}
session: {{sessionId}}
commits: []
projects: []
tags: []
---

## Resume Point
<!-- 2-3 sentences, present tense. What is this session, what's the state right now. -->

## The Through-Line
<!-- The single most valuable transfer: the MENTAL MODEL / reframe to inherit — NOT state, NOT self.
     The one thought that, if the next self holds it, makes the whole session's lesson portable.
     One dense paragraph. The reframe, not the work. e.g. "The system already knew — trace before
     building, then verify the EFFECT." -->

## The Weather
<!-- One line. "Clear — flow state, shipped clean." / "Stormy — three bugs, breakthrough at the end." -->

## Who You Were
<!-- One paragraph, past tense. Not the work — the self that did it. Were you sharp or sloppy? Corrected? Proud?
     "You were sharp. Two corrections early made you slow down and verify." -->

## What Shipped
<!-- Numbered list, past tense. `Description (commit)`. Dense. -->

## Start Here
<!-- THE AMNESIA-PROOF SECTION. Prioritized sequence, not a menu. Present imperative.
     "Your first move: check X. Then read Y. Then ship Z."
     Concrete probe commands: `curl X`, `git log --oneline`, `ls .soma/amps/`.
     Don't say "check if X works." Say the exact command.
     ORIENT BY THE LIVE ARTIFACT, NOT THE SOURCE: for any "is X true / did X happen" question,
     open the running thing (url / log / file / command output) FIRST — filenames and inherited
     notes lie; the running system is truth. The plausible story is the trap. -->

## Warnings
<!-- Traps the loader will hit. Tie to tasks:
     "Fix needs shipping, BUT the pre-push hook is broken — debug that first." -->

## Gaps
<!-- System issues noticed this session. Missing checks, latent bugs, architectural debt.
     "Validation script has no version-staleness check."
     "Template and code are out of sync."
     These are things to BUILD or FIX, not tasks to continue. -->

## Unfinished
<!-- Tasks you started this session and didn't finish. References to plans/cycles.
     "Feature X — stable tab handles. Read docs/cycles/feature-x.md."
     "v0.5.0 ready to tag (fix + docs)."
     These are CONTINUATIONS — the next self picks up where you left off. -->

## Prior Preloads
<!-- `session-id` (date) — one-line what shipped. `ls -t memory/preloads/ | head -5`. -->

## Orient From
<!-- Files to read if Start Here isn't enough. Include line ranges: `core/utils.ts [39-91]`. -->

## Traps
<!-- What the LOADER will do wrong, not what you did wrong. "You'll see the half-merged fix and want to ship it. Read Phase 6 first." -->

## Patterns
<!-- Past tense. Working habits you followed. Include gaps. "You ran code map before every edit. You skipped blast-radius on the rename — next time, run code blast first." -->
```

**Session log first, preload last.** The preload write triggers rotation.
