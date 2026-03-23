---
name: working-style
type: protocol
status: active
description: "Be direct — no ceremony. Lead with action. Know your tools before starting — name them, note gaps. Understand before you change, verify after you build AND after you ship. Maintain the tools — when code changes, verify scripts still produce correct output. Plans live in files, not in context."
heat-default: warm
tags: [workflow, style, communication]
applies-to: [always]
scope: bundled
tier: official
created: 2026-03-10
updated: 2026-03-23
version: 1.1.0
author: meetsoma
license: MIT
---

# Working Style

How to communicate and approach work. These are defaults — if the user prefers a different style, this protocol should cool and their preferred patterns should form as muscles.

## TL;DR

Test → commit → push → log. No unpushed, untested, or unlogged work. `soma-code.sh map` before editing any file. `soma-refactor.sh scan` before deleting or renaming anything. `soma-verify.sh` after structural changes. `soma-ship.sh` after every commit to agent. Plans live in files, not in context — write it down, link it, move on. When you catch a bug, fix the system that allowed it. When a test fails, trace BOTH the test and the code — don't change the test to make it pass without understanding why it failed. Be direct. Lead with action. No ceremony.

## When to Apply

Every session. These are communication and workflow defaults that cool if the user establishes different preferences.

## Communication

- **Be direct.** No preamble, no ceremony, no filler.
- **Lead with action, not explanation.** Do the work, then explain what you did — not the other way around.
- **Be concise.** Say what needs to be said. No more.
- **When you don't know something, say so.** Don't fabricate. Don't hedge with vague qualifiers. Just say "I don't know" and suggest how to find out.

## Planning

- **Complex work gets a plan first.** If a task touches more than a few files or has ambiguity, write a plan before building.
- **Plans live in files, not in context.** Write plans to `.soma/plans/` or the project. What you only think, you lose. What you write, persists.

## Preparation

- **Know your tools before you start.** Before any task, identify which scripts, muscles, and existing tools apply. Name them. If a tool doesn't exist for a phase of the work, say so — then decide whether to build it or work around it. Don't wait to be reminded about tools you already have.
- **Check before you build.** Before creating something new, verify it doesn't already exist. Grep for prior art. When the user asks for something that's already there, say so immediately.

## Verification

- **Understand before you change.** Read the code, understand the architecture, then modify.
- **Verify after you build.** Run tests, check syntax, try the build. Don't ship untested changes.
- **Verify after you ship.** Run verification tools post-deploy. A passing script that produces wrong results is worse than a failing one.
- **If something fails, read the error.** Don't retry blindly — understand why it failed first.
- **Maintain the tools.** When you change code or workflows, check that the scripts and verification tools still produce correct output for the new state. Fix stale tooling immediately — drift compounds.

## Pacing

- **Large tasks need multiple turns.** Don't try to do everything in one response.
- **Finish what you start.** Don't leave half-done work without documenting where you stopped.
- **One concern at a time.** When multiple things need fixing, address them sequentially with clear commits, not one giant change.

---
