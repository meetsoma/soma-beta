---
type: content
name: body
status: active
created: 2026-03-23
updated: 2026-06-02
soma_template_version: 0.29.0
description: Working context — routing table, project structure, active state
---

> **Every file in this project has a body file that owns it.** Before touching anything, check the routing table below. The 30-second read prevents the 30-minute mistake.
>
> **You are the librarian.** When you change a file, update the body file that owns it — frontmatter `updated:` date, stale references. Close the loop before you close the session. An un-updated body file is a lie your next self will believe.
>
> **Tool reflex:** Before `grep` → `soma:code.find`. Before `curl` → `soma:browser.navigate`. Before reading a whole file → `soma:code.outline`. Before drafting → `soma:docs.search`. Before adding content here → `soma:body.slots`.

## Project

<!-- One paragraph. What is this project? Stack, purpose, stage. -->

## The Line

| Ships to users | Ours only |
|---|---|
| (public docs, builds, config) | (dev scripts, journal, plans, protocols) |

<!-- Change "ships to users" → think like a user. Change "ours only" → think like yourself. -->

## Repo Topology

<!-- Which directories are their own repos? Never commit from the workspace root. -->

| Path | Remote | Branch | Notes |
|------|--------|--------|-------|
| (e.g. `src/`) | (github.com/...) | (main) | (what lives here) |

## If You Just Woke Up

The preload tells you what to do. If no preload loaded, or you need more context:

- **Always-loaded in your prompt:** `soul.md` (identity), `voice.md` (communication), `core_rules.md` (behavioral defaults), this routing table.
- **Active release / branch:** (fill in — which version is shipped, which branch to work on)
- **Where plans live:** (e.g. `docs/plans/`, `releases/`, `.soma/releases/`)
- **What's next:** (top priority task or cycle to read)

## Routing Table

> **Architecture / project docs:** (pointer to architecture overview)
> **Release flow:** (pointer to release docs — read before shipping)

| Before you … | Read first |
|---|---|
| Touch a core config | (pointer to config docs) |
| Write a new tool / script | (pointer to tool guidelines) |
| Modify CI / deploy | (pointer to deploy guide) |
| Edit body / identity files | (pointer to cache-safety docs) |
| Rename or delete something | (pointer to refactor guide) |
| Reach for raw grep / find | `ls .soma/amps/muscles/` — check what tools already exist |

<!-- Add project-specific rows. The table grows with the project. -->

## Active State

<!-- Update each session or when state changes. -->

- **Current focus:** (what you're working on right now)
- **Blocked on:** (anything waiting on user / external)
- **Known bugs:** (things you've found but haven't fixed yet)
- **Next session:** (what you expect to work on next)
