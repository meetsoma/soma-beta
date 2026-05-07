---
type: template
name: memory
description: Preload format — what the agent writes at exhale to brief the next session
created: 2026-03-23
updated: 2026-05-04
---
**Step 1.5: Update living docs** — before the preload, update the sources it points to.
The preload points to these — if they're stale, the preload is misleading.
- Check off completed kanban items, add new ones discovered this session
- Update STATE.md if branches, versions, or known bugs changed
- Commit project changes before writing memory files

**Step 2:** {{logVerb}} session log `{{logPath}}` — one file per session (unique filename).
⚠️ **Never overwrite existing session logs or preloads** — the filename contains a unique session ID (`{{sessionId}}`).
Include frontmatter with `session-id: {{sessionId}}`.
Include: what shipped (commits), gaps & recoveries, observations about patterns noticed.
Include: corrections received (as close to verbatim as possible) — these are the most
valuable things to record. What was wrong, what was right, why it matters.

**Step 3:** {{preloadVerb}} `{{target}}` — this is the LAST file you write.

This IS the continuation prompt for the next session. The loading agent sees ONLY this file —
not the conversation history. Write it like a briefing for someone taking over your shift.

**Tense rules** (the loading agent reads this fresh — pronouns and tenses must be unambiguous):
- Past tense for what happened **this** session: `What Shipped`, `Who You Were`, `Patterns`.
- Present tense for current state: `Resume Point`, `Kanban Snapshot`.
- **Present imperative** for what the loading agent should do NOW: `Start Here`, `Before You Start`, `Traps`.
- Address the loader as **"you"** (singular, present). Avoid "your next self" / "the next agent" — those imply a future third party. The reader IS that agent.

**Quality bar:** Could a fresh agent read this preload and immediately start working without
re-reading any files? If not, add more detail.

**Format:**
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
<!-- 2-3 sentences. Present-tense state of things. What was this session about,
     what state are things in right now. -->

## The Weather
<!-- One line. The emotional tone of the session you (the writer) just finished.
     "Clear — flow state, shipped clean." / "Stormy — three bugs, breakthrough at the end."
     Tells the loading agent what kind of session they're inheriting from. -->

## Who You Were
<!-- One paragraph, second person, PAST TENSE. Not the work — the self that did the work.
     Were you careful or rushing? Corrected? Proud of something?
     "You were sharp today. Two corrections early made you slow down and verify."
     The loading agent reads this and recognizes themselves in it. -->

## What Shipped
<!-- Numbered list, past tense. Description (`commit`). Dense. -->

## Start Here
<!-- ⚠ NAMING NOTE — this section is titled "Start Here" intentionally.
     DO NOT title it "Next Session" — that frames these as future/deferred tasks.
     The loading agent IS the next session. They execute this list NOW.

     Write in present imperative: "Your first move is..." / "Start by checking..."
     / "Before anything else, run..."

     THE AMNESIA-PROOF SECTION. A prioritized sequence, not a menu.
     If there's a critical fix: name it AND what phase/plan to read first.
     If there's an audit to finish: point to the plan file with the next phase.
     Reading order BEFORE action — the loader will be tempted to jump to executing. -->

## Warnings
<!-- Traps the loading agent will hit if not warned.
     "settings.json doesn't hot-reload — restart required."
     "The router has 3 layers — don't audit only one."
     TIE warnings to the tasks they affect:
     "Breathe fix needs shipping, BUT pre-push hook is broken — debug that first." -->

## Prior Preloads
<!-- 3-5 most recent sessions, newest first. One line each.
     Format: `<session-id>` (date) — what shipped + where state lives.
     Quick ancestry without opening every preload.
     Typical source: `ls -t memory/preloads/ | head -5` (adjust to your layout).
     Skip sessions that were pure experiments or rotated mid-work. -->

## Kanban Snapshot
<!-- If you track work in a kanban / ticket file, 3-8 lines here.
     Current arc + in-progress + next-up. Format:
       Arc: <current release or theme>
       In progress: (none — or named ticket + phase)
       Next up: <top 2-3 items>
       Recently shipped: <ticket> (<session-id>)
     Skip this section if you don't track tickets formally. -->

## Orient From
<!-- Files to read if Start Here isn't enough. Include [line-ranges].
     Example: `core/utils.ts` [39-91] — shared helpers -->

## Before You Start
<!-- Conditional loading. Present imperative.
     "Read migrations.ts BEFORE touching doctor."
     "Run soma verify drift BEFORE syncing content." -->

## Traps
<!-- Forward-looking, present imperative. Mistakes the loading agent will make if not warned.
     Not what the writer did wrong — what the loader will do wrong.
     "You'll see the unmerged fix and want to ship it immediately.
      Read Phase 6 first — the pre-push hook is broken."
     Behavioral coaching, not task instructions. -->

## Patterns
<!-- Past tense. Working habits the writer followed this session.
     "You read incremental-refactor before starting the migration."
     "You ran soma code map on every file before editing."
     The loading agent reads these and recognizes the routine as their own.
     Include gaps too: "You skipped the blast-radius check on the rename
     and caught it later — next time, run soma code blast first." -->

## Do NOT Re-Read
<!-- Files fully understood this session. Brief reason why. -->
```

⚠️ **Order matters:** session log (Step 2) FIRST, then preload (Step 3) LAST.
The preload write triggers the rotation watcher.

**Orient the self before the worker.** The Weather and Who You Were come before
the task list — continuity of self matters more than continuity of work.
