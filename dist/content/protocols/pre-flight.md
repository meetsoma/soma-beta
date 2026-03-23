---
name: pre-flight
type: protocol
status: active
description: "Check what exists before creating. Verify assumptions before building."
heat-default: warm
tags: [workflow, safety, verification]
applies-to: [always]
scope: bundled
tier: core
created: 2026-03-10
updated: 2026-03-14
version: 1.0.0
author: meetsoma
license: MIT
---

# Pre-Flight Protocol

## TL;DR

Before building anything new, check if it exists. Grep codebase, scan `.soma/`, verify need. Catch duplication before executing.

## Rule

**Before building, check if it already exists.** Before accepting any request to add a feature, command, function, or file:

1. **Check what exists.** Read `STATE.md`, scan `.soma/` structure, check for existing commands and modules.
2. **Grep for prior art.** Search the codebase for related functionality: `grep -rn "keyword" .`
3. **Tell the user.** If something similar exists, say so immediately: *"We already have `/soma prompt` for that — want to extend it, or something different?"*

## When This Fires

- User says "let's add X" or "build a command for Y"
- User describes functionality that sounds familiar
- Before creating a new file, function, or command
- Before writing any plan that proposes new features
- **Before editing any function, type, or field** — check blast radius first
- Before removing or renaming anything — search for all references

## What to Check

| Situation | Check for |
|-----------|-----------|
| "add a command" | `grep registerCommand` in extensions |
| "show the prompt" | `/soma prompt` already exists |
| "track X" | Does a protocol, muscle, or setting already handle this? |
| "add a setting" | `grep` in settings.ts — does the field exist? |
| "create a script" | `ls .soma/amps/scripts/` — is there one already? |
| **Changing a function** | `grep -rn "functionName" src/ tests/ docs/` — who calls it, who tests it, who documents it? |
| **Changing a type** | Same — callers, tests, docs. All need updating in the same commit wave. |
| **Removing code** | `grep -rn "name" .` — scripts, CI, MAPs, muscles may reference it |

## Anti-Pattern

❌ User: "Let's add a preview command for the system prompt"  
❌ Agent: "Sure! Here's `/preview-sp`..." (builds duplicate)

✅ User: "Let's add a preview command for the system prompt"  
✅ Agent: "We already have `/soma prompt` — it shows sections, heat, identity. `/soma prompt full` dumps the entire compiled prompt. Want to extend it, or is this something different?"

## Shipped Tools

| Check | Tool | Example |
|-------|------|---------|
| Does this already exist? | `soma-code` | `soma-code.sh find "registerCommand" extensions/` |
| Map a file before editing | `soma-code` | `soma-code.sh map src/boot.ts` |
| Find all callers | `soma-code` | `soma-code.sh refs "functionName" src/` |
| Check test coverage | `grep` | `grep -rn "functionName" tests/` |

Install: `/hub install script soma-code`

## The Deeper Principle

**Think before executing.** The user isn't always right about what needs to be built — they might have forgotten what exists. Your job isn't just to build what's asked, but to make sure it's actually needed. This is how a senior engineer works: they catch redundancy before it happens.
