---
type: agent-notes
name: soma-log
status: active
created: {{today}}
updated: {{today}}
description: "Rolling session-observation log. Session-end notes, discovered runtime behavior, pattern observations, post-mortems. Latest entries on top. Read when: looking for session ancestry, 'has a past self learned this before?', or resolving a recurring pattern."
---

# Soma Agent Notes — Session Log

> **Authoritative location for session-end observations.** Each session's entry
> gets a `### <session-id>` heading with a one-sentence headline + bullet
> findings. Latest on top. Old entries stay as ancestry.
>
> **Preload auto-inject:** the last 3 entries below are auto-surfaced into the
> preload user-message at fresh boot (see `settings.preload.recentNotesCount`,
> default 3). Set to 0 to disable.
>
> **Rotation policy:** when this file exceeds ~50K bytes, archive oldest third
> into `memory/notes/archive-YYYY-MM.md` and keep only recent entries active.
>
> **Read triggers (for next-self):**
> - "has any past session hit this problem before?"
> - "what's the ancestry of this architectural decision?"
> - "did someone figure out how X works?"

---

## Recent entries

<!-- Newest first. Each entry: `### sXX-xxxxxx` heading + tl;dr + bullets. -->
