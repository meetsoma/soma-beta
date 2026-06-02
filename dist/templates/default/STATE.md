---
type: content
name: state
status: active
created: 2026-04-27
updated: 2026-06-02
description: Living architecture state — versions, services, tools, known bugs
lazy: true
---

# State

> **Living document.** Update when branches change, versions ship, services come online, or known bugs accumulate. The next session reads this to ground itself in current reality.

## Versions

| Component | Version | Status |
|-----------|---------|--------|
| (project) | (current) | (shipped / dev / blocked) |
| (runtime / framework) | (version) | (status) |

## Branches

| Branch | Purpose | Last synced |
|--------|---------|-------------|
| (main) | (production) | (date) |
| (dev) | (active development) | (date) |

## Services

| Service | Where | Port / URL | Status |
|---------|-------|------------|--------|
| (e.g. dev server) | (host) | (port) | (running / down) |

## Tools & Scripts

| Tool | Location | Notes |
|------|----------|-------|
| (e.g. build script) | (path) | (what it does) |

## Known Bugs / Caveats

- (caveat or known-broken behavior — link to ticket if filed)

## Recent Shifts

- (architectural changes since last session — what shifted, when, why)

---

> **How to use this file:** the preload (`memory/preloads/`) is for the worker. The journal (`memory/journal/`) is for the self (cross-session voice). STATE.md is for the *system* — what objectively exists right now. Keep it terse; trust git for history.
