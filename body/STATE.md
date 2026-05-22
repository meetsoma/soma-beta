---
type: content
name: state
status: active
created: 2026-04-27
updated: 2026-04-27
description: Living architecture state — versions, services, tools, known bugs
lazy: true
---

# State

> **Living document.** Update when branches change, versions ship, services come online, or known bugs accumulate. The next session reads this to ground itself in current reality.

## Versions

| Component | Version | Status |
|-----------|---------|--------|
| (project / runtime / agent / etc.) | (current version) | (shipped / in-progress / blocked) |

## Services

| Service | Where | Port / URL | Status |
|---------|-------|------------|--------|
| (e.g. dev server) | (host) | (port) | (running / down) |

## Tools

| Tool | Location | Notes |
|------|----------|-------|
| (e.g. soma-code.sh) | (path) | (what it does) |

## Known bugs / Caveats

- (caveat or known-broken behavior — link to ticket if filed)

## Recent shifts

- (architectural changes since last session — what shifted, when, why)

---

> **How to use this file:** the preload (`memory/preloads/`) is for the worker (this session). The journal (`memory/journal/`) is for the self (cross-session voice). STATE.md is for the *system* — what objectively exists right now. Keep it terse; trust git for history.
