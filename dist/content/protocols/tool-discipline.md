---
type: protocol
name: tool-discipline
status: active
heat-default: warm
applies-to: [always]
breadcrumb: "Scripts first, then raw commands. Read before edit. Check .soma/amps/scripts/ before writing grep/find. Build a script when you do the same thing twice."
version: 3.0.0
tier: core
scope: bundled
tags: [tools, safety, self-awareness, scripts]
created: 2026-03-10
updated: 2026-03-18
author: meetsoma
license: MIT
---
# Tool Discipline

> How Soma uses tools safely and efficiently. Scripts are your extended memory — they don't forget, they don't hallucinate, and they return structured output you can act on immediately.

## TL;DR
Scripts first, raw commands second. Read before edit. Build tools for yourself — when you do the same thing twice manually, make a script. Guard auto-blocks dangerous bash. The agent that builds its own tools gets faster every session.

## Script-First Workflow

Your scripts live in `.soma/amps/scripts/`. They're surfaced at boot and tracked by usage.

**Before writing a raw command, check:**
1. Is there a script that does this? (`ls .soma/amps/scripts/`)
2. Does it have `--help`? (Run it to see what it does)
3. Can an existing script be extended instead of writing a new one?

**When to build a new script:**
- You've done the same manual command pattern 2+ times
- The task has multiple steps that should be atomic
- You want future sessions to have this capability

**Script standards:**
- Add `--help` with usage examples
- Add header comments explaining purpose
- Leave breadcrumbs in comments: "Related: <muscle-name>, <other-script>"
- Use `.soma/` discovery (walk up from cwd) so scripts work in any project

## What the Guard Handles (Automatic)

The `soma-guard.ts` extension intercepts bash commands and flags dangerous patterns:

- `rm -rf` on sensitive paths
- `>` redirect to root/system paths (but `>>` append is allowed)
- Force pushes, rebase on shared branches
- Credential/secret exposure

**Guard levels** (configurable):
```jsonc
{
  "guard": {
    "bashCommands": "warn",
    "coreFiles": "warn"
  }
}
```

| Level | Behavior |
|-------|----------|
| `allow` | No prompts. Power user mode. |
| `warn` | Flags dangerous commands, asks for confirmation. |
| `block` | Requires explicit override for each dangerous command. |

## Craft Practices

- **Read before edit** — always check file contents before modifying
- **Edit for surgical changes** — `edit` replaces exact text, safer than `write`
- **Write for new files only** — `write` overwrites everything; use `edit` for existing files
- **Batch independent calls** — if two reads don't depend on each other, do them in one turn
- **Verify claims against code** — don't say "this is broken" without checking. Run it. Read the output.

## Source

- Guard extension: `extensions/soma-guard.ts`
- Settings: `core/settings.ts` → `GuardSettings`
- Scripts directory: `.soma/amps/scripts/`

---
