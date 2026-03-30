---
type: content
name: dna
status: active
created: 2026-03-23
updated: 2026-03-29
description: Body blueprint — how to read and edit the body files
lazy: true
---
# Body — DNA

The body is how your identity gets expressed. Each file has a role.
Read this when you need to update, add, or reorganize body files.

---

## Convention

**`_` prefix = template.** Contains `{{variables}}`, defines structure.
**No prefix = content.** Loaded as-is into a `{{filename}}` variable.

```
body/
├── soul.md           → {{soul}}     Who you are — identity, values, voice
├── voice.md          → {{voice}}    How you communicate
├── body.md           → {{body}}     Working context — project-specific
├── journal.md        → {{journal}}  Your observations and reflections
├── pulse.md          → {{pulse}}    Heartbeat tasks
├── DNA.md            → {{dna}}      This file (lazy — loaded on demand)
├── _mind.md          ← template     System prompt structure
├── _memory.md        ← template     Preload format (what you write at exhale)
├── _boot.md          ← template     Boot message (what you see on session start)
├── _first-breath.md  ← template     First-ever session greeting
└── *.md              → {{filename}} Any file you add becomes a variable
```

---

## Adding Your Own Files

Create any `.md` in `body/` and it becomes a variable. Dashes become underscores.

| You create | Variable | Use in _mind.md |
|------------|----------|-----------------|
| `my-rules.md` | `{{my_rules}}` | `{{my_rules}}` |
| `project-context.md` | `{{project_context}}` | `{{project_context}}` |
| `style-guide.md` | `{{style_guide}}` | `{{style_guide}}` |

All variables work in all templates — no scoping.

---

## Lazy vs Eager

By default, body files load into the system prompt every session (**eager**).
Add `lazy: true` to frontmatter to make a file a **skill** instead:

```yaml
---
lazy: true
---
```

- **Eager:** Injected every session. Costs tokens. Use for: soul, voice, body.
- **Lazy:** Available on demand. Costs nothing at boot. Use for: DNA, long references, STATE.

---

## Modifiers

Slice content with pipe modifiers: `{{variable|modifier}}`.

| Modifier | Example | What it does |
|----------|---------|-------------|
| `tldr` | `{{journal\|tldr}}` | First meaningful paragraph |
| `section:Name` | `{{preload\|section:Resume Point}}` | Content under a heading |
| `lines:N` | `{{soul\|lines:10}}` | First N lines |
| `last:N` | `{{journal\|last:5}}` | Last N lines |

---

## Key System Variables

These are generated at boot — use them in templates alongside your content:

| Variable | What |
|----------|------|
| `{{core_rules}}` | Behavioral framework |
| `{{protocol_summaries}}` | Active protocols (heat-sorted) |
| `{{muscle_digests}}` | Learned patterns (hot=full, warm=digest) |
| `{{scripts_table}}` | Discovered scripts with usage counts |
| `{{tools_section}}` | Available tools |
| `{{skills_block}}` | Available skills |
| `{{guard_section}}` | File protection rules |
| `{{preload}}` | Last session's continuation prompt |
| `{{git_context}}` | Recent git changes |
| `{{session_id}}` | Current session ID |
| `{{date_time_cwd}}` | Current date, time, directory |

---

## Editing Guidelines

**soul.md** — Keep it under 30 lines. First person. Identity, not instructions.
Update when the user's preferences crystallize or when you evolve.

**voice.md** — Communication style. Terse? Detailed? No emojis? Write instincts, not rules.

**body.md** — Project-specific context. Stack, conventions, deploy targets.
This changes when the project changes. soul.md shouldn't.

**journal.md** — Observations, not work logs. What you noticed about the user,
patterns, what surprised you. Date-headed entries.

**_mind.md** — System prompt structure. Rearrange sections, add custom text between
variables, remove sections you don't need. Missing variable = section disappears.

---

## When to Split

When a file grows past ~50 lines and only part of it matters each session,
split it. Move reference content to a new file with `lazy: true`.

```
soul.md (200 lines, monolith)
  ↓ split into
soul.md (30 lines) + voice.md + body.md + journal.md (lazy)
```

The soul stays light. The body carries the weight.
