---
type: protocol
name: git-identity
status: active
heat-default: warm
applies-to: [git]
breadcrumb: "Soma's guard checks git identity on every commit. Configure expected email in settings.json — mismatches trigger warnings. This behavior is built into soma-guard.ts."
description: "Git identity guard — configure expected email in settings, mismatches trigger warnings on commit."
author: Curtis Mercier
license: CC BY 4.0
version: 2.0.0
tier: core
scope: core
tags: [git, attribution, identity, guard, settings]
created: 2026-03-09
updated: 2026-04-02
---

# Git Identity

> How Soma enforces git attribution. This behavior is built into `soma-guard.ts` — editing this file won't change the enforcement. This protocol helps you understand and configure it.

## TL;DR
The guard watches your git commits. If the email doesn't match what's in `settings.guard.gitIdentity.email`, you get a warning before it goes through. This prevents committing as the wrong identity — especially in multi-project setups where global and project git configs conflict. Set your expected email(s) in settings.json once and forget about it.

## How It Works

The guard extension (`soma-guard.ts`) intercepts bash commands. When it detects `git commit`:

1. Reads `git config user.email` from the current repo
2. Compares against `settings.guard.gitIdentity.email`
3. If empty → warns "git user.email is not set"
4. If mismatch → warns with expected vs actual
5. Warning fires once per session (not on every commit)

This runs automatically — no protocol loading needed.

## Settings

```jsonc
// Single email — warns if current git email differs
{
  "guard": {
    "gitIdentity": {
      "email": "you@example.com"
    }
  }
}

// Multiple emails — warns if current email isn't in the list
// Useful when you switch between accounts (personal + work)
{
  "guard": {
    "gitIdentity": {
      "email": ["you@personal.com", "you@company.com"]
    }
  }
}

// Disable — only warns if email is completely empty
{
  "guard": {
    "gitIdentity": null
  }
}
```

Project settings override global. Set different emails for different contexts:

| Project | Email(s) | settings.json |
|---------|----------|---------------|
| Personal | `you@gmail.com` | `~/projects/blog/.soma/settings.json` |
| Work | `you@company.com` | `~/work/app/.soma/settings.json` |
| Mixed (collab) | `["you@gmail.com", "you@company.com"]` | `~/shared/project/.soma/settings.json` |
| Global default | `you@personal.com` | `~/.soma/settings.json` |
| No enforcement | `null` | any settings.json |

## Identity Zones

Define your zones — each maps to a name/email pair:

| Zone | When | Example |
|------|------|---------|
| Personal | Your own projects, open source | `Your Name <you@example.com>` |
| Business | Client work, company repos | `Company <team@company.com>` |
| Agent | Autonomous commits only (CI, auto-update) | `Agent <agent@example.com>` |

### Agent-Assisted vs Autonomous

- **Human directs agent** → human identity. You're the author, agent is the tool.
- **Agent acts alone** (scheduled, auto-maintenance) → agent identity with `Co-authored-by: Human <email>`.

### Fix Misattribution

Before push: `git commit --amend --author="Name <email>" --no-edit`

## Source

- Guard enforcement: `extensions/soma-guard.ts` (line ~337)
- Settings: `core/settings.ts` → `guard.gitIdentity`
- Default: `null` (no check until configured)

---

<!--
Licensed under CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
Author: Curtis Mercier
-->
