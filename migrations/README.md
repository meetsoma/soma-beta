---
type: reference
status: active
created: 2026-03-21
---

# Migration Maps

Version-to-version migration maps for `.soma/` workspaces.

## How It Works

Each file describes what changed between two versions and how to update a `.soma/` folder:

```
v0.6.1-to-v0.6.2.md    ← changes from 0.6.1 to 0.6.2
v0.6.2-to-v0.6.3.md    ← next version
```

When a user runs `soma update` or `soma doctor`, the system:

1. Reads `version` from their `.soma/settings.json` (or assumes `0.6.1` if missing)
2. Compares against the current agent version
3. Chains any migration maps needed (e.g., 0.6.1 → 0.6.2 → 0.6.3)
4. Applies each migration in order

## Migration Map Format

Each map has:

- **`migration-required`** — `true` if changes need user-side updates, `false` if purely internal
- **`breaking`** — whether old format will fail (vs just being suboptimal)
- **`fix-mode`** — how to fix: `script` (mechanical, no LLM), `agent` (needs judgement), or `none`
- **`fix-script`** — filename of a bash script in the same directory. Receives `.soma/` path as $1. Exit 0 = fully fixed, exit 1 = partial (needs agent for the rest).
- **`doctor-checks`** — list of `{id, check, fix}` entries. Each check describes what the doctor should verify, and whether the fix is `script` or `agent`. Guides the doctor's report.
- **`agent-prompt`** — the prompt `soma doctor --migrate` passes to `soma -p`. For complex fixes only. Use `{migration_path}` as placeholder for the map's own file path.
- **`changes`** — what changed and why
- **`steps`** — concrete actions the migration runner (or agent) should take
- **`verify`** — how to confirm the migration succeeded

### Fix Resolution Order

```
soma doctor           → reads doctor-checks from all pending maps → reports
soma doctor --fix     → runs fix-script from each map → re-scans → reports remainder
soma doctor --migrate → loads agent-prompt from maps where fix-mode=agent → spawns soma -p
```

Most migrations should be `fix-mode: script`. The agent is a fallback for ambiguous cases (e.g., merging content that needs semantic understanding, restructuring that depends on context).

## During Development

When making changes to core that affect `.soma/` format:

1. Open (or create) the migration map for the current dev version
2. Add the change to the `changes` section
3. Add migration steps
4. At release: if no changes accumulated, set `migration-required: false`

This happens naturally during development — the map grows as we work.

## Multi-Project (v0.7.0+)

When Project Navigator ships, `soma doctor` will support checking all registered projects:

```
soma doctor              ← current: scans .soma/ in cwd
soma doctor --all        ← future: scans all registered projects
soma doctor --select     ← future: interactive picker
```

Each project's `.soma/settings.json` tracks its own version independently. The navigator maintains a registry of project paths. Migration maps are universal — same map applies to any `.soma/` regardless of project.
