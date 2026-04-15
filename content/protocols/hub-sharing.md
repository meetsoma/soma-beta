---
name: hub-sharing
type: protocol
status: active
description: "How Soma handles /hub share. This behavior is built into the hub extension — this protocol helps you understand what's happening. Not loaded into the system prompt."
heat-default: warm
tags: [hub, share, privacy, community, public]
applies-to: [always]
scope: core
tier: core
created: 2026-03-22
updated: 2026-04-02
version: 1.0.0
author: Curtis Mercier
license: MIT
---

# Hub Sharing

> **This is documentation, not a behavioral rule.** The sharing behavior is built into `soma-hub.ts` — editing this file won't change how sharing works. This protocol exists so you can understand the process and know what to expect.

## TL;DR

How Soma manages the `/hub share` flow. Your original content stays untouched — Soma creates a clean `public/` copy with private data stripped, and that's what gets submitted to the community hub. Secrets block sharing entirely. Paths are auto-fixed. Quality issues are surfaced so Soma can help you improve before submitting.

## How It Works

### The Two-Copy Pattern

```
User's original (project-specific, may have private paths)
  amps/muscles/my-pattern.md          ← stays untouched

Public copy (cleaned, generalized)
  amps/muscles/public/my-pattern.md  ← submitted to hub
```

When `/hub share` runs:

1. **Find the file** — check the main directory first, then `public/`
2. **If the file passes all checks** — submit directly, no `public/` copy needed
3. **If privacy issues are found:**
   - Create `public/` copy with issues stripped
   - Show the user what was removed and why
   - The agent can help improve the `public/` version
   - Submit the `public/` version
4. **If quality is low** — show issues to the agent, let it help the user improve before submitting

### What Gets Stripped

Privacy patterns (mechanical — handled by the share handler):
- `/Users/` and `/home/` paths → generalized or removed
- Project names (`Gravicity/`, etc.) → generalized
- API keys (`sk-`, `ghp_`) → removed
- Email addresses outside `author:` field

Runtime state (mechanical — always stripped):
- `heat:` values → set to 0
- `loads:` values → set to 0
- `scope: internal` content → blocked from sharing entirely

### What the Agent Helps With

When the mechanical checks pass but quality is low, the agent should:

- **Improve descriptions** — "Fast codebase navigator" → explain what makes it useful
- **Add missing tags** — look at the content and suggest relevant search terms
- **Generalize examples** — replace project-specific paths with generic ones
- **Write better digest blocks** — the digest is what loads into the system prompt; it should be useful standalone
- **Check that the public version still makes sense** — stripping project paths might leave broken references

### What NOT to Change

- The `author:` field — this is the user's attribution, always preserved
- The `forked-from:` field — lineage is permanent
- The core behavior — the content should do the same thing, just without private data
- The `version:` — the user controls their versioning

## When to Apply

- When the user runs `/hub share`
- When the agent notices content in `public/` that differs from the original (drift detection)
- When helping a user prepare content for sharing

## When NOT to Apply

- When the user is editing their own content for personal use
- When updating bundled protocols (those go through the maintainer workflow)
- When the content is marked `scope: internal` — it should never be shared

## The Trust Model

The user's Soma is involved in the sharing process. This means:

- **Pre-submit validation happens locally** — privacy and quality checks run before anything touches GitHub
- **The agent helps improve content** — not just blocking, but assisting
- **CI is the safety net, not the first line** — most PRs arrive clean because Soma already checked
- **The user sees everything** — no silent modifications, all changes are shown

Community content is MIT licensed. By sharing, the user agrees to public distribution. The `author:` field ensures attribution.
