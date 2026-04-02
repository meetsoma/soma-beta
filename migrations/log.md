---
type: migration-log
status: active
created: 2026-04-02
updated: 2026-04-02
description: Comprehensive migration log — what changed between versions. Doctor reads this to build migration plans.
---

# Soma Migration Log

> One file, all versions. `soma doctor` reads this to understand what changed
> between any two versions and build a migration plan for the specific project.
> Each section covers one version bump. Sections are cumulative — a project on
> v0.6.1 jumping to v0.8.0 gets all sections applied in order.

---

## v0.6.1 → v0.6.2

**What changed:**
- `settings.json` introduced with `version` field
- Heat tracking fields: `protocols.hotThreshold`, `protocols.warmThreshold`
- `breath-cycle.md` — first bundled protocol

**Actions:**
1. Create `settings.json` if missing (use bundled defaults)
2. Add `protocols.hotThreshold: 8`, `protocols.warmThreshold: 3` if missing
3. Copy `breath-cycle.md` to `amps/protocols/` if missing
4. Set version to `0.6.2`

---

## v0.6.2 → v0.6.3

**What changed:**
- Settings: `inherit` section, `persona` section, `memory.flowUp`
- Identity: `SOMA.md` supported alongside `identity.md`

**Actions:**
1. Add `inherit: { identity: true, protocols: true, muscles: true, tools: true }` if missing
2. Add `persona: { name: null, emoji: "σ" }` if missing
3. Add `memory: { flowUp: false }` if missing
4. Set version to `0.6.3`

---

## v0.6.3 → v0.6.4

**What changed:**
- `body/` directory introduced (structured identity replaces flat SOMA.md)
- Body files: `soul.md`, `voice.md`, `body.md`, `journal.md`, `pulse.md`, `DNA.md`
- Templates: `_mind.md`, `_boot.md`, `_memory.md`, `_first-breath.md`
- 6 new protocols: `correction-capture`, `detection-triggers`, `frontmatter-standard`, `quality-standards`, `tool-discipline`, `working-style`
- Settings: `paths` section, `muscles` section

**Actions:**
1. Create `body/` directory if missing
2. Copy each body file from bundled `body/_public/` if missing (don't overwrite existing)
3. Copy each new protocol to `amps/protocols/` if missing
4. Add `paths` settings with defaults if missing
5. Add `muscles` settings with defaults if missing
6. Set version to `0.6.4`

---

## v0.6.4 → v0.6.5

**What changed:**
- Bundled scripts introduced in `amps/scripts/`
- 4 new protocols: `pre-flight`, `plan-hygiene`, `task-tracking`, `maps`
- Settings: `automations` section, `heat.overrides`

**Actions:**
1. Create `amps/scripts/` if missing
2. Copy bundled scripts if missing (don't overwrite existing)
3. Copy each new protocol to `amps/protocols/` if missing
4. Add `automations` settings with defaults if missing
5. Add `heat.overrides` if missing
6. Set version to `0.6.5`

---

## v0.6.5 → v0.6.6

**What changed:**
- 5 new protocols: `hub-sharing`, `pattern-evolution`, `response-style`, `session-checkpoints`, `git-identity`
- All protocols rewritten with coaching voice (clearer TL;DR sections)
- Settings: `guard` section, `boot.gitContext` section

**Actions:**
1. Copy each new protocol to `amps/protocols/` if missing
2. For existing protocols: diff against bundled — if not customized, overwrite with new version
3. Add `guard` settings with defaults if missing
4. Add `boot.gitContext` settings with defaults if missing
5. Set version to `0.6.6`

---

## v0.6.6 → v0.6.7

**What changed:**
- `_memory.md` template: added Weather, Who You Were, Orient From sections
- `DNA.md` expanded with variable reference
- Bundled scripts trimmed from 11 to 6 (extras available on hub)
- Settings: `checkpoints` section, `preload.staleAfterHours`, `preload.lastSessionLogs`
- Protocols: `heat-tracking` and `breath-cycle` rewritten

**Actions:**
1. If `_memory.md` matches old template, overwrite with new version
2. If `DNA.md` matches old template, overwrite with new version
3. Don't delete scripts — user may still want them. Note removed bundled scripts.
4. Add `checkpoints` settings with defaults if missing
5. Add `preload` settings with defaults if missing
6. Update `heat-tracking.md` and `breath-cycle.md` if not customized
7. Set version to `0.6.7`

---

## v0.6.7 → v0.7.0

**What changed (breaking):**
- `heat-tracking` protocol scope → `core` (loaded differently in prompt)
- Protocol injection moved to unified skill-loader
- `_mind.md`: added `{{#body}}` / `{{#voice}}` conditionals
- `_boot.md`: added `{{git_context}}`, `{{session_id}}`, `{{session_files}}`
- Settings: `breathe`, `context`, `scratch` sections
- New extension: `soma-breathe.ts`

**Actions:**
1. If `_mind.md` matches old template, overwrite with new version (has conditionals now)
2. If `_boot.md` matches old template, overwrite with new version
3. Add `breathe` settings with defaults if missing
4. Add `context` settings with defaults if missing
5. Add `scratch` settings with defaults if missing
6. Update `heat-tracking.md` — add `scope: core` to frontmatter if missing
7. Review user heat overrides in settings — `heat-tracking` may need adjustment
8. Set version to `0.7.0`

---

## v0.7.0 → v0.7.1

**What changed:**
- CLI: `soma --help` now shows branded help
- Scripts: `soma-theme.sh` and `soma-focus.sh` bug fixes
- Patch release — no .soma/ structural changes

**Actions:**
1. Update bundled scripts if present and not customized
2. Set version to `0.7.1`

---

## v0.7.1 → v0.8.0

**What changed:**
- CLI: `soma doctor` (project migration), `soma status`/`health` (infra check)
- CLI: `soma --version` shows agent + CLI versions, `--help` delegates to core
- Core: `findChildSomaDirs`, `compareTemplates`, doctor.autoUpdate setting
- Skill loader: warm AMPS show full TL;DR/digest in `<available_skills>`
- Settings: `doctor` section (autoUpdate, declinedVersion)

**Actions:**
1. Add `doctor: { autoUpdate: true, declinedVersion: null }` to settings if missing
2. CLI changes are automatic (ship with runtime update)
3. Set version to `0.8.0`
