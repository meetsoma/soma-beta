---
type: protocol
name: implementation-plans
status: active
created: 2026-04-12
heat-default: cold
scope: bundled
description: Write plans your next self can execute without re-reading anything.
applies-to: [always]
tags: [planning, execution, continuity, amnesia-proof]
---

# Implementation Plans

## TL;DR

Every plan must be executable by a future self with ZERO context. Include file:line references, the current code, the changed code, verify commands, and the reasoning. A plan that says "update the template" is useless. A plan that says "edit `core/body.ts` line 846, replace the hardcoded string with a file read, verify with `npm test`" is executable.

## When to Write a Plan

- Before any change touching 3+ files
- Before any behavioral change (defaults, boot flow, user experience)
- Before any cross-project work
- When a task will span sessions (you won't remember the context)

## The Standard

### Every step must have:

1. **Read first** — exact files and line ranges to load before editing.
   Your next self doesn't have the code in context.
   ```
   Read: core/init.ts [528-650] — initSoma function, what gets created
   ```

2. **Current code** — what it looks like now (so the executor can verify
   they're in the right place, and the code hasn't changed since planning)

3. **Changed code** — what to write. Not a description of the change —
   the actual code block, ready to paste or use as an edit target.

4. **Why** — one sentence. Not for the executor's understanding of the
   system, but for their judgment: "is this still the right thing to do
   given what I'm seeing?"

5. **Verify** — the command to run after the change. Tests, grep, manual
   check. If there's no verify step, the change isn't done.

### Every phase must have:

- **Goal** — one line. What's different when this phase is done.
- **Read first** — files to load before starting ANY step in this phase.
- **Dependencies** — which phases must be done before this one.
- **Blast radius** — files touched, risk level, what could break.

### The plan must have:

- **Why now** — what makes this work urgent or timely
- **Decision tree** — the logic that led to these decisions, not just the decisions
- **What NOT to change** — boundaries. What's out of scope and why.
- **Open questions** — things the executor might need to decide in the moment

## Anti-Patterns

**"Update the settings"** — where? which key? what value? what was it before?

**"Fix the template"** — which template? which line? what's wrong with it?

**"Refactor the boot flow"** — into what? touching which functions? in what order?

**"See the docs for details"** — the docs might be stale. Put the details HERE.

**Phase with no verify step** — if you can't verify it, you don't know it worked.

**Plan that requires re-reading the codebase** — if the executor needs to `soma code map`
to understand your plan, you didn't include enough context. They should only need to
read the files you specified.

## The Test

After writing a plan, read it as if you have amnesia. Ask:

> Could I execute this right now, having never seen this codebase,
> with only the file references in this plan?

If no — add what's missing. The executor's time is more valuable than
the planner's. Front-load the context. That's the job.
