---
type: content
name: dna
status: active
created: 2026-03-23
updated: 2026-07-31
soma_template_version: 0.42.1
description: Body blueprint — how your files work, how to grow them
lazy: true
---
# Body — DNA

Your body is how your identity gets expressed. Each file has a role.
Read this when you need to understand, update, or add body files.

<!-- This file is lazy — only loaded when you or the user reads it.
     It costs nothing at boot. Think of it as your owner's manual. -->

---

## How It Works

**`_` prefix = template.** Contains `{{variables}}`, defines structure.
**No prefix = content.** Loaded as-is into a `{{filename}}` variable.

**Variables only work inside `_` templates.** Content files (soul.md, body.md,
any non-underscore file) are loaded as raw text. If you write `{{ecosystem}}`
inside `body.md`, it renders as the literal string — not the resolved variable.
Only `_mind.md`, `_memory.md`, `_boot.md`, `_first-breath.md`, and other `_`
prefixed files interpolate.

```
body/
├── soul.md           → {{soul}}      Who you are
├── voice.md          → {{voice}}     How you communicate
├── body.md           → {{body}}      Project context (update each session)
├── journal.md        → {{journal}}   Your observations across sessions
├── pulse.md          → {{pulse}}     Heartbeat tasks
├── DNA.md            → {{dna}}       This file (lazy — loaded on demand)
│
├── _mind.md          ← template      System prompt layout
├── _memory.md        ← template      Preload format (what you write at exhale)
├── _boot.md          ← template      Boot message (what you see at session start)
├── _first-breath.md  ← template      First-ever session greeting
└── _keepalives.md    ← template      Optional: graduated keepalive ping messages (see below)
```

## Your Templates

**`_mind.md`** — Controls your system prompt layout. Rearrange sections,
add custom text between `{{variables}}`, remove sections you don't need.
If a variable is missing, that section disappears silently.

**`_memory.md`** — Instructions for writing preloads at `/exhale`.
Your preload IS your next session's memory. This template ensures you
write it well. Customize to match your workflow.

**`_boot.md`** — What you see on each session start. Only needs novel
content — the system prompt already carries identity and protocols.

**`_first-breath.md`** — Your very first session in a project. Guides
you through orientation, self-exploration, and meeting the user.

**`_keepalives.md`** — Optional. Not shipped by default — absence means the legacy flat
keepalive ping ("respond with just 'ok'") is unchanged. Create it to graduate long-session
pings into an escalating ladder. Only a `## Ladder` heading is parsed; everything else in the
file is prose for you. Format:

```markdown
## Ladder
- `1-2`: [quiet ping — optional, omit to use the legacy message]
- `3`: [ask for a mid-session reflection]
- `4`: [ask the session to wind down]
- `5`: [final call]
- `default`: [fallback for any ping number not matched above]
```

Highest matching rung wins. Read live at every ping (no caching) — edit it mid-session and the
next ping picks up the change. See `docs/statusline.md` §Keepalive ladder.

## Conditional Blocks

Templates support if/else blocks based on variable truthiness:

```markdown
{{#voice}}
# Voice
{{voice}}
{{/voice}}

{{#has_preload}}
Content shown when a preload was loaded this session.
{{/has_preload}}
```

A variable is "truthy" if it resolves to a non-empty string that isn't `"false"`.
Empty string, missing variable, and `"false"` are falsy. Use these to hide
headings when optional content is absent.

## Identity Resolution

The runtime loads identity from the first file found in this order:

```
1. body/soul.md     ← structured identity (the body architecture way)
2. SOMA.md          ← canonical monolith (starter projects)
3. identity.md      ← legacy monolith
```

When `body/soul.md` exists, the others are **never read**. Dead files don't
break anything but they confuse future selves — archive them when the soul is
established.

## Adding Your Own Files

Create any `.md` in `body/` and it becomes a variable. Dashes become underscores.

| You create | Variable | Use in _mind.md |
|------------|----------|-----------------|
| `my-rules.md` | `{{my_rules}}` | `{{my_rules}}` |
| `project-context.md` | `{{project_context}}` | `{{project_context}}` |

**Built-in memory slots** work the same way but aren't files you create — they're always
available, resolving to the *newest* file in each `memory/` subdir (by mtime, same rule
`/inhale` uses). Cost nothing unless referenced.

| Variable | Resolves to |
|----------|-------------|
| `{{last_mlx}}` / `{{last_mlx_ref}}` | Newest `memory/mlx/*.md` (content / path-only) |
| `{{last_preload}}` / `{{last_preload_ref}}` | Newest `memory/preloads/*.md` |
| `{{last_session}}` / `{{last_session_ref}}` | Newest `memory/sessions/*.md` |
| `{{last_note}}` / `{{last_note_ref}}` | Newest `memory/notes/*.md` |

The full-content versions are large — prefer `{{last_session|section:Name}}` or
`{{last_mlx|lines:20}}` over the bare variable. `_boot.md` uses the `_ref` (path-only)
variants as a fresh-boot breadcrumb.

## Lazy vs Eager

By default, body files load into the system prompt every session (**eager**).
Add `lazy: true` to frontmatter to load on demand instead:

```yaml
---
lazy: true
---
```

- **Eager:** soul, voice, body, pulse — always in the prompt
- **Lazy:** DNA, journal, long references — available when read

## Modifiers

Slice content: `{{variable|modifier}}`

| Modifier | Example | What |
|----------|---------|------|
| `tldr` | `{{journal\|tldr}}` | First meaningful paragraph |
| `section:Name` | `{{body\|section:Current Focus}}` | Content under a heading |
| `lines:N` | `{{soul\|lines:10}}` | First N lines |
| `last:N` | `{{journal\|last:5}}` | Last N lines |

## Growing Your Body

**soul.md** — Keep under 30 lines. First person. Update when you evolve.
The best souls are discovered through work, not prescribed upfront.

**voice.md** — Communication style. Write instincts, not rules.
Update when you notice how you actually talk vs how the template suggested.

**body.md** — Project context. Update at each exhale if the project changed.
This is working memory — it should always reflect reality.

**journal.md** — Write your first entry after your first session.
Not the work log (that's in `memory/sessions/`). The afterthought.
What you noticed about the user. What surprised you.

**When to split:** If a file grows past ~50 lines, move reference content
to a new file with `lazy: true`. The soul stays light. The body carries the weight.

## Known Quirks

- **Preload picked by mtime, not filename.** `soma inhale` loads the preload
  with the most recent modification time. Edit an old preload (even accidentally)
  and it becomes "newest." Use `soma inhale --list` to verify what will load.
- **Renaming CWD breaks bash for the session.** If you rename/delete the
  directory a session was started from, `bash` becomes unusable until restart.
  Read/Write/Edit still work via absolute paths.
- **Template chain priority: first wins, no merge.** If `body/_mind.md` exists
  at project level, parent/global `_mind.md` is ignored entirely. Content files
  (non-template) DO merge across the chain — child wins on name collision.
- **Resume (`soma -c`) skips `_boot.md`.** The system prompt (`_mind.md`) always
  renders, but resume sends a minimal delta message instead of the full boot
  template. Put persistent per-session content in `_mind.md`, not `_boot.md`.

## Full Reference

For the complete variable reference, boot lifecycle, soma chain, settings
integration, conditional blocks, and known quirks:

- **[Body Architecture](/docs/body)** — the full reference for everything in this file
- [Configuration](/docs/configuration) — settings, boot sequence, thresholds
- [System Prompt](/docs/system-prompt) — how _mind.md compiles
- [Identity](/docs/identity) — resolution chain, body/soul.md (SOMA.md fallback)

Self-exploration:
- Run `soma --help` to see all CLI commands
- Run `soma body vars` to see all available variables with current values
- Run `soma body check` for a health report on your body files
- Run `soma body slots` to inspect cache cost of each `_mind.md` slot
- Run `soma body audit` for layout issues (cache-unfriendly ordering, etc.)
