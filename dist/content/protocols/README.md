---
type: index
status: active
created: 2026-03-20
updated: 2026-03-20
---

# Public Protocols (Hub Staging)

> This directory is `_public/` — the `_` prefix makes it **invisible to the agent's boot table**.
> Protocols here are verified-clean copies from the community hub, staged as the source of truth for what ships.
> The agent uses root-level copies (which may have workspace-specific customisations).

## Related

- **Community repo:** `repos/community/protocols/` — canonical public versions
- **Plan:** `.soma/archive/projects/hub-content-sync/plan.md` — Phase 1 tracks protocol sync
- **MAP:** `amps-interconnect` — cross-reference check after protocol changes

## How It Works

```
Root protocols (agent uses these)
  ↓ may have workspace-specific tweaks
_public/ protocols (verified-clean from community hub)
  ↓ canonical source
repos/community/protocols/ (what users install)
```

Root-level protocols are what our agent loads. They might have workspace-specific tweaks (references to our file paths, our tools, our internal MAPs). The `_public/` copies come from the community hub and are verified clean — no private paths, no internal references.

When updating a protocol, edit the root copy first (our agent uses it). Then sync the generic version to `_public/` and push to community.

## Audit Checklist (before adding to _public/)

1. ✅ No hardcoded paths (`Gravicity`, `meetsoma`, `user/`)
2. ✅ No workspace-specific references (`.soma/workspace`, `.soma/memory`, internal MAPs)
3. ✅ No `scope: internal` (internal protocols stay in `internal/`)
4. ✅ Frontmatter has: type, name, status, heat-default, applies-to, breadcrumb, version, tier, scope, tags
5. ✅ Matches the version on the community hub

## Contents (15 protocols)

Synced from `repos/community/protocols/` on 2026-03-20.

## Tiering

| Tier | Where | Rule |
|------|-------|------|
| **Bundled** (root + `_public/`) | Ships with Soma + on community hub | Verified generic, scope: bundled |
| **Hub-only** (`_public/` only) | On hub, not bundled | community-safe, workflow |
| **Internal** (`internal/`) | Never ships | dev-workflow, release-tracking, folder structures |
| **Not yet on hub** (root only) | Bundled but not on hub yet | deep-recall, maps, plan-hygiene, response-style |
