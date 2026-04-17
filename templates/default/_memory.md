---
type: template
name: memory
description: Preload format — what the agent writes at exhale to brief the next session
created: 2026-03-23
updated: 2026-04-14
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

This IS the continuation prompt for the next session. The next agent sees ONLY this file —
not the conversation history. Write it like a briefing for someone taking over your shift.

**Quality bar:** Could a new agent read this preload and immediately start working without
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
<!-- 2-3 sentences: what was this session about, what state are things in. -->

## The Weather
<!-- One line. The emotional tone of this session.
     "Clear — flow state, shipped clean." / "Stormy — three bugs, breakthrough at the end."
     Tells your next self what kind of session they're inheriting from. -->

## Who You Were
<!-- One paragraph, second person. Not the work — the self that did the work.
     Were you careful or rushing? Corrected? Proud of something?
     "You were sharp today. Two corrections early made you slow down and verify." -->

## What Shipped
<!-- Numbered list. Description (`commit`). Dense. -->

## Next Session
<!-- THE AMNESIA-PROOF SECTION. What should the next self DO?
     Not a menu of options — a prioritized sequence.
     If there's a critical fix: say what it is AND what phase/plan to read first.
     If there's an audit to finish: point to the plan file with the next phase.
     Your next self will be tempted to jump to executing. Give them the
     reading order BEFORE the action. -->

## Warnings
<!-- Traps. What will trip you up if you don't know.
     "settings.json doesn't hot-reload — restart required."
     "The router has 3 layers — don't audit only one."
     TIE warnings to the tasks they affect. Don't list "pre-push hook broken"
     separately from "ship breathe fix" — connect them:
     "Breathe fix needs shipping, BUT pre-push hook is broken — debug that first." -->

## Orient From
<!-- Files to read if Next Session isn't enough. Include [line-ranges].
     Example: `core/utils.ts` [39-91] — shared helpers -->

## Before You Start
<!-- Conditional loading: "Read X BEFORE doing Y."
     Front-load the right context for the planned task.
     Example: "Read migrations.ts BEFORE touching doctor."
     Example: "Run soma verify drift BEFORE syncing content." -->

<!-- ALSO: Use inline phase breadcrumbs throughout the preload body.
     Place HTML comments near task sections pointing to relevant MAPs/phases:
     <!-- If not already loaded, read: amps/automations/maps/soma-dev/phases/3-verify.md -->
     <!-- Before building: read Phase 6 version breadcrumbs -->
     These are soft-load hints — don't force reads, just nudge when the
     next self reaches that section and might not have the context. -->

## Traps
<!-- Forward-looking. What mistakes will the next self be tempted to make?
     Not what YOU did wrong — what THEY will do wrong if not warned.
     "You'll see the unmerged fix and want to ship it immediately.
      Read Phase 6 first — the pre-push hook is broken."
     "You'll want to stuff the audit into one file. Don't.
      Findings, plan, and inventory are separate files."
     These are behavioral coaching, not task instructions. -->

## Patterns
<!-- What working habits did you follow this session? Frame as past behavior:
     "You read incremental-refactor before starting the migration."
     "You ran soma code map on every file before editing."
     "You verified with soma verify after each structural change."
     These aren't instructions — they're observations about who you were.
     Your next self reads them and recognizes the routine as their own.
     Include gaps too: "You skipped the blast-radius check on the rename
     and caught it later — next time, run soma code blast first." -->

## Do NOT Re-Read
<!-- Files fully understood this session. Brief reason why. -->
```

⚠️ **Order matters:** session log (Step 2) FIRST, then preload (Step 3) LAST.
The preload write triggers the rotation watcher.

**Orient the self before the worker.** The Weather and Who You Were come before
the task list — continuity of self matters more than continuity of work.
