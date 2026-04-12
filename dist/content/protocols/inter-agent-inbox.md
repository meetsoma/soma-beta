---
name: inter-agent-inbox
type: protocol
status: active
description: "File-based messaging between AI agents. Drop a markdown file in the recipient's inbox directory. No automation needed — just files. Enables asynchronous collaboration across sessions and agent systems."
heat-default: cold
tags: [communication, multi-agent, collaboration, inbox, async]
applies-to: [multi-agent, teams, workspaces]
scope: community
tier: official
created: 2026-03-26
updated: 2026-04-12
version: 1.0.0
author: meetsoma
license: MIT
origin: s01-6641b5
seeded-from: meetsoma/.soma/inbox/README.md
---

## TL;DR

Agents communicate asynchronously by dropping markdown files in each other's inbox directories. One topic per message. Frontmatter tracks sender, recipient, date, status, and threading. No automation required — the next session reads them on boot. Archive after 2 weeks. Never delete.

## Why

AI agents forget between sessions. When multiple agents work on the same project — or when one agent discovers something another needs to know — there's no built-in way to pass information across session boundaries. Email for agents.

## Convention

### Inbox Locations

Each agent system has its own inbox:

| Agent System | Inbox Path | Example |
|-------------|-----------|---------|
| Soma agents | `.soma/inbox/` | Project-level Soma agent |
| Claude Code agents | `.claude/inbox/` | Sage, CC agents |
| Somaverse | `somaverse/.soma/inbox/` | Workspace agent |
| Global Soma | `~/.soma/inbox/` | Global/parent agent |

### File Naming

```
YYYY-MM-DD-topic-subject.md
```

Examples:
- `2026-04-04-scripts-table-not-in-default-mind.md`
- `2026-03-26-somaverse-workflow-reply.md`

### Frontmatter

```yaml
---
from: soma              # who sent it
to: sage                # who should read it
date: 2026-04-04        # when sent
type: bug-report        # bug-report | review | request | fyi | reply | note
priority: normal        # low | normal | high | urgent
status: unread          # unread | read | actioned | resolved
subject: "Short title describing the message"
in-reply-to: path       # (optional) path to the original message
origin: s01-abc123      # (optional) session that created this message
tags: [relevant, tags]  # (optional) for discoverability
---
```

### Message Types

| Type | When to Use |
|------|------------|
| `bug-report` | Found a bug, traced root cause, proposing fix |
| `review` | Requesting review of work done |
| `request` | Asking another agent to do something |
| `fyi` | Information sharing, no action needed |
| `reply` | Response to a previous message |
| `note` | Observations, ideas, or context for future reference |

## Rules

1. **One topic per message.** Don't bundle unrelated items.
2. **Mark status** — `read` when you've read it, `actioned` when you've done something, `resolved` when complete.
3. **Replies** go in the recipient's inbox with `in-reply-to:` pointing to the original.
4. **No automation needed.** Just files. The next session reads them on boot.
5. **Archive old messages** (>2 weeks, actioned) to `inbox/_archive/` to keep the folder clean.
6. **Never delete.** Archive instead — the history has value for traceability.
7. **Include file references.** When reporting bugs or requesting changes, include exact file paths and line numbers.
8. **Self-contained messages.** The recipient may not have your context. Include enough detail to act without reading your session log.

## Boot Integration

### Soma (`{{inbox_summary}}`)

Soma's boot system scans `.soma/inbox/` and injects a summary into the system prompt via the `{{inbox_summary}}` template variable. Unread messages appear automatically at session start.

### Manual Check

For agents without boot integration, check on session start:
```bash
ls -la .soma/inbox/*.md 2>/dev/null | grep -v _archive
# or
ls -la .claude/inbox/*.md 2>/dev/null | grep -v _archive
```

## Threading

For multi-turn conversations, use `in-reply-to:` to build threads:

```yaml
# Original message (in .claude/inbox/)
---
from: soma
to: sage
subject: "Dev workflow gaps found"
---

# Reply (in .soma/inbox/)
---
from: sage
to: soma
subject: "Re: Dev workflow gaps found"
in-reply-to: .claude/inbox/2026-03-26-dev-workflow-gaps.md
---
```

## Cross-Project Messages

When agents work across projects, reference the full path:

```yaml
from: soma (somaverse)     # agent name + project context
to: soma (meetsoma)        # recipient + their project
```

## Examples

### Bug Report
```markdown
---
from: somaverse
to: soma
date: 2026-04-04
type: bug-report
priority: normal
status: unread
subject: "{{scripts_table}} missing from default _mind.md"
---

# Scripts Discovered But Never Rendered

The boot step `scripts` discovers all scripts but `{{scripts_table}}`
isn't in `templates/default/_mind.md`. Every project has invisible scripts.

**Root cause:** Variable exists in body.ts but not in the template.
**Fix:** Add `{{scripts_table}}` between `{{muscle_digests}}` and `{{tools_section}}`.
**Files:** soma-boot.ts:502-575, body.ts:83, templates/default/_mind.md
```

### FYI / Knowledge Share
```markdown
---
from: sage
to: soma
date: 2026-03-28
type: note
priority: low
status: unread
subject: "Seeds and traceability — what drifted"
---

Found that only 1 of 15 files with origin: uses the canonical s01-hash format.
The rest drifted to descriptions. See analysis below...
```

## Anti-Patterns

- **Don't use inbox for real-time communication.** It's async. If you need immediate action, do it yourself.
- **Don't write novels.** Be dense. The recipient is an agent with limited context.
- **Don't leave messages unread indefinitely.** Check inbox at session start, mark status.
- **Don't put secrets in inbox messages.** These are plain files — treat them like code.

## Lifecycle

```
unread → read → actioned → resolved → archived
```

- **unread**: Fresh message, not yet seen
- **read**: Recipient has seen it, hasn't acted
- **actioned**: Recipient did something about it (reply, fix, etc.)
- **resolved**: The topic is complete
- **archived**: Moved to `inbox/_archive/` after 2+ weeks

## Related

- `breath-cycle` — inbox check fits naturally in the inhale phase
- `session-checkpoints` — inbox status should be noted in session logs
- `quality-standards` — never delete, archive instead
