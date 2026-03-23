---
type: template
name: memory
description: Preload format — what the agent writes at exhale
created: 2026-03-23
---
**Step 2:** {{logVerb}} session log `{{logPath}}` — one file per session (unique filename).
⚠️ **Never overwrite existing session logs or preloads** — the filename contains a unique session ID (`{{sessionId}}`).
Include frontmatter with `session-id: {{sessionId}}`.
Include: what shipped (commits), what you noticed, what broke, what you learned.

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
tags: []
---

## Resume Point
<!-- 2-3 sentences. What's done, what's next, what state things are in. -->

## What Shipped
<!-- Numbered list. Description (`commit`). Dense. -->

## Next Session
<!-- THE AMNESIA-PROOF SECTION. Exact file:line refs, commands to run,
     steps numbered. Executable without reading anything else. -->

## Warnings
<!-- Traps. What will trip you up if you don't know. -->

## Orient From
<!-- Files to read if Next Session isn't enough. -->
```

⚠️ **Order matters:** session log (Step 2) FIRST, then preload (Step 3) LAST.
The preload write triggers the rotation watcher.
