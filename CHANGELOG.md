# Changelog

All notable changes to the Soma agent are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versioning follows [Semantic Versioning](https://semver.org/).

---

## [0.12.0] — 2026-04-15 — Somaverse Edition

Soma meets the Somaverse. Your agent can now connect to somaverse.ai,
control your workspace remotely, and pair with your browser — all through
a secure relay. Data stays on your machine. The shard is just the pipe.

### Added
- **`soma login`** — Pair your agent with Somaverse. Creates a pairing code, opens your browser, and saves your device key. One command to connect.
- **Hub-connect extension** — Connects your agent to the Somaverse hub as a provider. Your browser pairs with it automatically. Works alongside bridge-connect (local + cloud simultaneously).
- **Workspace proxy** — All 28 workspace + browser tools work through the hub relay. Your agent controls the workspace even from a remote machine.
- **Device-key auth** — Workspace tools auto-detect hub mode when `~/.soma/device-key` exists. Routes to hub URL with Bearer auth instead of localhost.
- **28 agent tools** — 10 workspace, 10 browser, 5 AI, 2 plugin state, 1 browser_links (new).

### Architecture
- **Reverse proxy model** — The Somaverse hub relays WebSocket messages between your browser and your agent. It never stores your data — everything flows through to your machine.
- **Per-user isolation** — Device keys are Argon2-hashed. Each user’s workspace connection is paired by user_id. No cross-user access possible.
- **Modular extensions** — bridge-connect (local), hub-connect (cloud). Both run simultaneously with dedup. Add a service, add an extension.

### Security
- Device keys: 192-bit random, Argon2 hashed in DB
- Transport: WSS via Traefik + Let’s Encrypt
- Hub proxy: Bearer device_key + JWT cookie auth on every request
- CORS: restricted to somaverse.ai, somaverse.space, dev.somaverse.ai

### Fixed
- **Breathe stale warning** — disabled by default. Was firing every turn in long sessions ("28 tool calls since preload"). Now fires at most once, configurable via `breathe.preloadStaleThreshold` in settings.

---

## [0.11.4] — 2026-04-14

### Fixed
- **Script root-finding** — `_find_root()` in 10 dev scripts now checks `repos/agent/package.json` to distinguish `meetsoma/` from `repos/agent/` (both had `.soma/` and `repos/` dirs).
- **sync-docs.sh** — prefers `agent/` (dev) over `agent-stable/` (main) for Phase 5 doc sync.

### Added
- **Image budget** — auto-compact when screenshots accumulate. Soft notify at 8 images, hard auto-compact at 10. Counts all image sources (browser_screenshot, Read tool, user-pasted). Counter resets on compact. Visible in `/status`.
- **`imageBudget` settings** — `softAt` and `hardAt` configurable via `settings.json`. Set `hardAt: 0` to disable.
- **`breathe.maxTokens` setting** — caps the effective context window for breathe threshold calculations. Fixes breathe being dormant on 1M-context models where 50% = 500K tokens.
- **Sandbox source flags** — `soma-sandbox.sh --dev` builds and tests from dev branch. `--main` tests agent-stable. `--beta` (default) tests soma-beta. API tests default to claude-haiku-4-5.
- **14 new settings tests** — covers removed fields, new fields, multi-level inheritance, array replacement.

### Changed
- **Settings cleanup** — removed 3 never-implemented settings: `memory.flowUp`, `sessions.overwriteGuard`, `checkpoints.project.workingBranch`. Default version updated 0.6.4 → 0.11.3.

## [0.11.3] — 2026-04-14

### Fixed
- **Script description parser** — `getScriptMeta()` was parsing YAML frontmatter delimiters (`---`) as the script description. Every frontmatter-using script showed "---" in the system prompt. Parser now skips frontmatter blocks, extracts `# description:` fields, skips decorative lines, and scans 30 lines instead of 15.

### Changed
- **Docs version sweep** — 6 docs updated: stale version refs (v0.9.0→v0.11.2, v0.2.0→v0.3.3), extension table 4→8, scripts.md restructured into Bundled/Advanced/Hub sections.

## [0.11.2] — 2026-04-14

### Fixed
- **soma-install.sh paths** — updated `products/soma` → `meetsoma/repos` references.
- **Duplicate session files in rotation boot** — rotation path embedded file hints in both greeting AND session_files template variable. Now greeting is narrative only, session_files handled by template (matching normal boot pattern from 4d8331f).
- **Triple error cascade on API failure** — three independent handlers fired on single error. Added errorHandled flag, else-if chain, gated fatal-session check.
- **False-positive billing detection removed** — `err.includes("extra usage")` matched Claude consumer error text, not actual billing issues. Pi shows raw API errors natively. Removed our pattern matching entirely.
- **Doctor fallback version** — hardcoded 0.10.0 → 0.11.1.
- **Build pipeline** — `build-dist.mjs` was reading Pi 0.64.0 from stale `repos/cli/dist`. Now reads from npm (Pi 0.67.1). Root cause of months of invisible dist/ drift.
- **Release script** — removed stale `CLI_DIST` reference; Soma brand themes were being overwritten by Pi defaults.
- **Dev-mode theme crash** — Pi's config.js resolves to `src/` when it exists. Added symlinks for theme, export-html, and assets paths.
- **Stale docs** — `repos/cli` ref in install-architecture.md.

### Changed
- **Pi runtime 0.64.0 → 0.67.1** — dist/ was stuck at Pi 0.64.0 despite package.json claiming ^0.66.1. Synced from npm. Gets stack overflow fix for long sessions (#2651), subscription auth warning, queued message flush fix.
- **Pi telemetry disabled** — set PI_TELEMETRY=0 in cli.js to prevent install ping added in Pi 0.67.1.
- **Rotation boot aligned with decomposition** — greeting no longer embeds session file hints. Consistent with normal boot path pattern.
- **Error handling** — auth-aware (OAuth vs API key). Account rate limits (real plan limit) handled separately from extra-usage classification errors (often transient). OAuth: progressive retry → warn → pause at 4th. API key: pause immediately.
- **Error display** — build-time error-sanitizer patch converts raw JSON API errors to human-readable messages. Billing errors show progressive messages. Retryable errors (overloaded, 500) pass through untouched.

### Added
- **`soma-dev verify upstream`** — detects dist/ vs node_modules/ drift by fingerprinting key runtime files. Prevents the 0.64→0.66 invisible drift.
- **Runtime integrity tests** — test-hygiene.sh now checks telemetry disable, boot decomposition, billing removal, error cascade flag, verify-upstream existence.
- **Release pipeline gate** — `soma-release.sh` now blocks on dist/ upstream drift detection before building.
- **Error-sanitizer** — build-time patch to Pi's display layer. Progressive billing messages, auth/model rewrites. Zero cache impact.
- **Patch manifest** — `scripts/_dev/patches/manifest.json` tracks applied dist/ patches.
- **CLI repo archived** — content merged to agent README. `meetsoma/cli` archived on GitHub.

## [0.11.1] — 2026-04-13

### Fixed
- **Cache invalidation from image stripping** — removed progressive image stripping from `before_provider_request` in soma-guard. Each new screenshot changed the strip set, invalidating the entire cache ($2-3 per invalidation, $152/day on Apr 12). Image management now handled by capture-time optimization + future auto-compact.
- **Zombie sessions** — idle shutdown timer now runs independently of keepalive. Post-exhale shutdown (15 min) + absolute timeout (30 min). Previously, disabling keepalive also disabled the shutdown check.
- **Boot resume cache waste** — silent resume when no .soma files changed. Was injecting "Nothing changed" message that cost ~$1.78 in cache rewrite with zero value.
- **Keepalive on fatal errors** — kill keepalive on first-turn API failures to prevent infinite retry loops.
- **Billing notice handling** — separate billing notices from error-pause logic so keepalive isn't killed on credit warnings.
- **Pipeline** — remove `streamingBehavior` (not in Pi types), fix `focus --help` without seam.

### Added
- **Cache health tracking** — statusline tracks cacheRead, cacheWrite, cost per session. Alerts on cache invalidations (>50K token writes). Footer shows ✓cache / Ninv indicator.
- **Idle session detection** — auto-shutdown after configurable idle period with no user input.

### Changed
- Cache health indicator moved to statusline line 2 (line 1 was crowded).

## [0.11.0] — 2026-04-12

Identity overhaul + first-run experience. soul.md replaces SOMA.md as default. Minimal boot for new projects. 11 bundled scripts. Critical doctor fix.

### Added
- **`soma session`** — session maintenance tool. `strip-images` removes base64 image data from JSONL (16MB → 2.6MB), `list` shows all sessions with sizes, `stats` analyzes image payload.
- **test-install-flows.sh** — 36-assertion E2E test suite covering fresh init, v0.6→current upgrade, edge cases (corrupt settings, missing version, empty body/).
- **Discovery marker: `body`** — `findSomaDir()` now detects projects with only `body/soul.md` (no SOMA.md).
- **User extension preservation** — reinstall preserves user-installed extensions (bridge-connect.ts, workspace-tools.ts) alongside auth.json and models.json.
- **Extension allowlist** — configure approved extensions in settings.json, `/soma doctor` reports unlisted extensions.
- **Image payload guard** — `before_provider_request` strips old images when >15 accumulate in conversation. Prevents Anthropic many-image 2000px limit.

### Changed
- **Identity: soul.md is primary** — `initSoma` creates `body/soul.md` instead of `SOMA.md`. `ensureGlobalSoma` creates `body/soul.md` at `~/.soma/`. SOMA.md and identity.md still work as fallbacks. All docs, templates, tree diagrams updated (30+ files).
- **autoInject default: false** — new projects use `soma inhale` for intentional preload loading. Existing settings preserved on upgrade.
- **First-run minimal boot** — first session skips hot protocol/muscle injection into system prompt. Agent discovers through use.
- **Pi 0.65 migration** — `session_switch`/`session_fork` → `session_start` with `event.reason`.
- **Protocol heat-defaults reclassified** — only `breath-cycle` and `working-style` start warm. All others cold.
- **11 bundled scripts** (was 6) — added soma-body, soma-refactor, soma-reflect, soma-plans, soma-session.
- **Template single source** — `body/_public/` deleted, templates read from `templates/default/`.
- **Hub template install** — fetches soul.md → SOMA.md → identity.md, writes to body/soul.md for new projects.

### Fixed
- **Critical: semver comparison in thin-cli.js** — doctor used JS string comparison (`"0.6.2" > "0.10.0"`), so upgrades NEVER ran for any project. Added `semverCmp()` for proper numeric comparison.
- **CLI UX** — `soma help`, `soma version` now work (bare words). `soma init` when .soma/ exists routes to doctor instead of broken TUI.
- **Image payload guard** — strips old images from conversation history, pauses keepalive on 400/invalid_request errors (was only 429). Prevents infinite retry deadlock.
- **Parent chain detection** — init.ts walker now checks `body/soul.md` and `settings.json`, not just `SOMA.md`/`identity.md`.
- **soma verify crash** — `${*}` with `set -u` caused unbound variable when called without args.
- **Stale refs sweep** — 30+ files across docs, core, templates, scripts, community. `identity.md` → `body/soul.md` in all user-facing strings.
- **Script path leaks** — soma-health, soma-verify, soma-seam, soma-refactor guarded behind path existence checks.
- **Sandbox** — was creating `identity.md` (deprecated), now creates `body/soul.md`.

---

## [0.10.0] — 2026-04-10

Restructure release. AMPS consolidated, CLI script routing, Pi runtime bumped, 25 commits since v0.9.0.

### Added
- **v0.8.1→v0.9.0 migration map** — settings additions (inherit, keepalive, heat.autoDetectBump), script routing syntax, AMPS consolidation notes. Chains with existing migration maps.
- **soma-health.sh** — project health dashboard script.
- **Docker sandbox** — `soma-sandbox.sh` can now use Docker for isolated E2E testing (21/21 tests pass).
- **test-hygiene.sh** — repo cleanliness checks (secrets, sessions, dev artifacts).
- **verify-amps command** — CWD path resolution, community protocol source validation.
- **3 scripts promoted to bundled** — soma-verify.sh, soma-refactor.sh, soma-browser.sh moved from dev to discoverable.

### Changed
- **Pi runtime 0.64.0 → 0.66.1** — 2 minor versions, bug fixes, no breaking changes.
- **Docs: CLI syntax** — all 8 doc files updated from `soma-code.sh` to `soma code` syntax. Website synced.
- **Scripts reorganized** — 39 dev scripts moved to `_dev/`, 3 promoted to bundled, redundant scripts archived.
- **CWD safety audit** — dev-path guards on Tier 2 scripts, soma-query demoted to `_dev/`.

### Fixed
- **soma-guard: orphaned tool_result sanitizer** — `before_provider_request` handler removes orphaned tool_result blocks before API call. Prevents 400 errors from upstream Pi bug.
- **soma-statusline: auto-pause keepalive on rate limit** — detects 429/rate_limit errors, auto-disables keepalive. Prevented 67+ wasted requests per rate-limit window.
- **soma-doctor.sh: follow core/ symlink** — was reading stale `~/.soma/agent/package.json` (v0.6.0) instead of following symlink to dev repo. Now resolves through readlink.
- **init.ts: read version from package.json** — was hardcoded to 0.6.2, now reads dynamically.
- **Sandbox: deterministic prompt template test** — replaced LLM-dependent test with file-read verification.
- **Sandbox: extension/protocol count comparison** — use `>=` instead of `==` for forward compatibility.
- **soma-boot: streamingBehavior on all sendUserMessage calls** — 10 calls patched, prevents runtime errors.
- **Keepalive infinite loop** — `keepaliveInFlight` flag prevents auto-exhale from re-triggering keepalive.
- **CI: npm ci + tsx PATH** — added to all test suites for clean CI runs.

---

## [0.9.0] — 2026-04-04

### Added
- **`{{inbox_summary}}` template variable** — scans `.soma/inbox/` at boot, injects unread message summary into system prompt. File-based async messaging between agents.
- **`{{scripts_table}}` in default `_mind.md`** — agents can now see their discovered scripts in the system prompt.
- **`preload.autoInject` setting** — auto-inject most recent preload on fresh boot (default: true). No longer requires `soma inhale` CLI command for preload loading.
- **7 new documentation pages** — `inbox.md`, `doctor.md`, `hub.md`, `troubleshooting.md`, `guides/daily-workflow.md`, `guides/customization.md`, `guides/first-protocol.md`. Total: 33 pages (~36K words).
- **`inter-agent-inbox` community protocol** — published to community hub. Formal spec for file-based inter-agent messaging.
- **Script drift detection** — `soma-verify.sh drift` now checks scripts across agent repo → working copies → global.

### Changed
- **Digest → TL;DR migration complete** — 96 files converted from `<!-- digest:start/end -->` to `## TL;DR`. Both formats still accepted, `## TL;DR` is the standard going forward.
- **Docs accuracy overhaul** — 13 existing pages updated: `autoInject` mental model, version refs, `breadcrumb` → `description`, `maxTokens` default, session log naming format, identity.md deprecated.

### Fixed
- **Keepalive limit not enforcing** — keepalive-triggered turns reset the ping counter, making keepalives infinite. Now tracks `keepaliveInFlight` flag to skip reset on self-initiated turns.
- **Changelog hook targets [Unreleased] only** — old hook appended to first `### Added`/`### Fixed` globally, which could hit released versions.
- **Test suite** — added `tsx` to devDependencies (bare `tsx` calls failed), fixed 10 stale test paths (`body/public` → `body/_public`, `identity.md` → `SOMA.md`).
- **Stale `body/public` references** — updated to `body/_public` across comments, docs, templates, and scripts (6 files).

---

## [0.8.1] — 2026-04-02

### Added
- **Unified warm content format** — `## TL;DR` replaces `<!-- digest:start/end -->` across all AMPS. Protocols, muscles, and automations all use the same format. Code accepts both during transition.
- **`extractTldr()`** — shared utility for extracting TL;DR sections, used by protocols, muscles, and automations.
- **MAP = automation alias** — `map` accepted as type alias in `/hub install`, `/hub fork`, `/hub share`. MAPs are a type of automation.
- **Discovery unification** — `discoverMaps()` now scans `amps/automations/` root alongside `maps/` subdirectories. Installed hub automations are visible as MAPs.
- **Keepalive limits** — 5 pings per idle period (configurable 0–5), countdown in notification (`♥ Keepalive 3/5`), resets on user message.
- **Auto-exhale on idle** — when keepalive lives are exhausted and context exceeds 75k tokens, the agent automatically writes a preload. Configurable via `keepalive.autoExhale` and `keepalive.autoExhaleMinTokens`.
- **Migration phase `v0.8.0→v0.8.1`** — Tier 1 auto-converts muscle digest blocks to TL;DR format, adds keepalive settings.

### Changed
- **`soma-doctor.sh`** — reads agent version from `package.json` instead of hardcoded string.
- **Hub validator** — accepts `description`/`triggers`/`tags`, prefers `## TL;DR` over `<!-- digest -->`, warns on legacy format.

---

## [0.8.0] — 2026-04-02

### Added
- **`soma doctor`** — project health check and migration from CLI. Tier 1 auto-fixes (settings, body, protocols) run silently on every boot. TUI `/soma doctor` provides interactive Tier 2+ migration with `compareTemplates()` analysis.
- **`soma status` / `soma health`** — quick project health check (renamed from old `soma doctor`).
- **`soma --version`** — shows both agent and CLI versions.
- **`soma --help`** — delegates to core agent for full branded help output.
- **Migration phase system** — `cycle.md` + 9 phase files covering v0.6.1 → v0.8.0. Each phase is self-contained with from/to versions, actions, and what changed. Complete chain with no gaps.
- **`_doctor-update.md` + `_doctor-pending.md`** — boot templates for agent-assisted migration. Pending template injected into followUp when updates available.
- **`compareTemplates()`** — three-category file diff (content files, metadata, runtime) for doctor analysis.
- **`findChildSomaDirs()`** — walks filesystem to discover child `.soma/` directories for multi-project support.
- **`doctor.autoUpdate` + `declinedVersion`** — per-project settings controlling update notification behavior.
- **Warm AMPS** — skill loader shows full TL;DR or digest for warm content, short description for cold. All AMPS types unified.
- **Body templates** — improved starters for soul.md, voice.md, journal.md, pulse.md, body.md. DNA.md rewrite with self-awareness, owner’s manual, and deep reference links.
- **`_first-breath.md`** — context-aware first-run template with conditional blocks for monorepos, blank projects, code projects, global/inherited `.soma/`.
- **Test suites** — `test-doctor.sh` (46 tests), `test-migrations.sh` (48 tests) covering all doctor features and migration chain integrity.
- **Docs** — `updating.md` (migration guide), `install-architecture.md` (CLI → agent flow), `body.md` (full body architecture reference with variables, templates, chain, lifecycle).

### Changed
- **CLI routing overhaul** — `doctor`, `status`, `health`, `update`, `version` all route through thin-cli. `--help` delegates to core when agent is installed.
- **Starter content** — code fallbacks synced to `_public/` templates, HTML comments stripped from shipped content.
- **Bundled scripts** — `soma-theme.sh` seeds on init, breadcrumbs added to all bundled scripts for docs and community references.
- **`_first-breath.md`** — added self-exploration guidance (agent reads its own docs), breath cycle explanation, learn-the-user prompts.
- **`_memory.md`** — added Step 1.5 (update living docs), Before You Start (conditional loading), corrections emphasis.

### Fixed
- **CHANGELOG auto-append bug** — post-commit hook was appending to every section, not just [Unreleased]. Rewrote hook, cleaned 172 duplicate entries.
- **Boot version-bump race** — version was bumped before notification, causing re-check loops. Now bumps after Tier 1 fixes complete.
- **CLI help header** — shows "CLI v0.2.0" instead of bare version number.
- **Dev mode health check** — no longer reports false "git repo has issues" in development.
- **Tier 1 body scaffold** — adds missing body files to existing `body/` directory (was only creating on fresh init).

## [0.7.1] — 2026-04-01

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **`soma --help` rewrite** — Soma-branded help with session commands, project commands, options, and TUI slash commands. Replaces generic Pi help output.
- **`soma --help scripts`** — show installed scripts with descriptions. Works from CLI and inside sessions.
- **`soma --help commands`** — full command reference organized by category (CLI, session, heat, hub, info).
- **`soma-theme.sh` bundled** — shared script theming now seeds on init (was a missing dependency for 3 bundled scripts).

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **Scripts crash on fresh projects** — `source soma-theme.sh` with `set -e` caused fatal exit when theme file wasn't present. Fixed with `if [ -f ]; then source; fi` pattern across all 8 scripts.
- **`soma focus <keyword>` didn't start session** — `main()` call wasn't awaited, `process.exit(0)` ran before session could start.
- **`postinstall.js` missing from builds** — deleted during Pi 0.64.0 dist sync, restored to CLI repo. Added to `OUR_DIST_FILES` and release script.
- **Docs: `/inhale` vs `soma inhale` confusion** — commands.md and getting-started.md now clearly distinguish CLI commands (shell) from TUI slash commands, with comparison table.

---

## [0.7.0] — 2026-04-01

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard** — warns when no preload exists (suggests `/exhale`), warns when preload is stale (>5 tool calls since write). Use `/inhale --force` to override.
- **Slash command usage hints** — 10 commands now include `Usage:` patterns in their descriptions: `/pin`, `/kill`, `/auto-commit`, `/inhale`, `/install`, `/auto-breathe`, `/hub`, `/scratch`, `/keepalive`, `/soul-space`, `/soma`.
- **Hub: 5 new scripts** — soma-seam, soma-reflect, soma-query, soma-focus, soma-plans. All with coaching-voice digests.
- **Hub: soma-code v2.0.0** — added `blast` (blast radius analysis), `tsc-errors` (TypeScript errors with context), improved `refs` (DEF/IMP/USE), improved `find` (extension filter).
- **Scripts docs** — `scripts.md` rewritten with hub links for each script.

### Changed
- **Upstream sync R4** — Pi 0.63.1 → 0.64.0. New APIs: `setHiddenThinkingLabel`, `signal`/`getSignal`, `prepareArguments`, async `getArgumentCompletions`.
- **Core scripts trimmed** — init seeds 5 core scripts (soma-code, soma-seam, soma-focus, soma-update-check, validate-content). Others available via `soma hub install script <name>`.
- **Semver discipline** — feature releases now bump minor version (0.X.0). Patch (0.x.Y) reserved for bug-fix-only releases.

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **Changelog hook** — `soma-dev.sh` post-commit hook now targets only the first `### Added`/`### Fixed` section (was appending to all version sections).
- **Hub table rendering** — markdown tables in hub detail pages now render with proper `<table>`/`<thead>`/`<tbody>` structure.
- **Community CI clean** — 21 frontmatter fixes across protocols and muscles (missing breadcrumb, tier, license, author, version fields).
- **Script drift** — 7 scripts synced from working copies to agent repo (soma-code v1→v2, soma-reflect, soma-seam, soma-scrape, soma-spell, soma-plans, soma-query).
- **Hub scripts sanitized** — private paths (Gravicity, vault) stripped from soma-seam.sh.

---

## [0.6.7] — 2026-03-30

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **`/soma doctor`** — migration command. Detects version mismatch on boot, prompts to run migration script with confirmation, shows output, reloads settings. Post-migration guidance for body file review.
- **Boot migration check** — notifies when project `.soma/` version is behind agent version.
- **Global vs parent detection** — `detectProjectContext()` distinguishes `~/.soma/` (global runtime) from real parent workspaces. Init prompt has three-way messaging: real parent choice, global fallback, or no soma.
- **Monorepo-aware first breath** — detects multi-repo projects, lists sub-projects with detected stacks. Points agent to `soma-code.sh structure` for orientation.
- **First-breath tool hints** — all first-breath messages include `soma-code.sh` and `soma-seam.sh` usage examples.
- **Body template scaffolding** — `body.md` (Project, Structure, Workflow, Current Focus sections) and `voice.md` (Delivery, Tone, Rhythm sections) ship with header scaffolding and comment breadcrumbs.
- **Richer `_memory.md`** — preload template now includes Weather, Who You Were, Orient From, Do NOT Re-Read sections.
- **Stash checkpoint style** — `checkpoints.project.style: "stash"` now wired. Uses `git stash push --include-untracked` with session ID.
- **Migration system** — `v0.6.6-to-v0.6.7.md` map + `migrate-0.6.6-to-0.6.7.sh` script. Handles settings, body templates, protocols. Backs up before replacing, skips customized files.

### Changed
- **System prompt budget** — default `systemPrompt.maxTokens` raised from 4000 to 10000. Anthropic's system prompt is ~25k; ours at ~5k was triggering false warnings.

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **Preload resume false-positive** — `soma -c` no longer falsely detects preloads from previous rotations as "written this session." Uses mtime check (2-min threshold).
- **Body template instructions** — moved from frontmatter `description:` (invisible to agent) to HTML comment breadcrumbs in file body (visible, replaceable).
- **Migration script path resolution** — resolves bundled templates relative to script location, works in sandbox/dev/installed contexts.

---

## [0.6.6] — 2026-03-29

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard + stale warning, slash command usage hints**
- **Init UX** — prompt before auto-scaffolding (`ctx.ui.confirm`), parent .soma/ inheritance when user declines, `scaffoldBody` templateDir priority chain. (SX-164, SX-165, SX-241)
- **Command provenance** — `/soma status` shows which extension registered each command via Pi's `sourceInfo`. (SX-233)
- **cli.js tracked source** — `src/cli.js` in agent repo is source of truth. `sync-to-cli.sh` and `soma-release.sh` use it. (SX-252)
- **Protocol coaching voice** — 14/17 protocol TL;DRs rewritten from spec/documentation voice to coaching voice. (SX-109)

### Changed
- **Upstream sync R3** — Pi 0.61.1 → 0.63.1 (71 commits, 3 releases). SourceInfo provenance, built-in tools as extensions, multi-edit, sessionDir, compaction fixes. 0 breaking changes on our imports. (SX-230)
- **Stale branches cleaned** — deleted `feat/docs-system`, `feat/runtime` (archived to patches), `protocol-quality-pass`, `feature/ship-breath-cycle`. Agent repo: dev + main + backup only.
- **scaffoldBody** priority chain: templateDir → bundled `_public/` → bundled `body/`.

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- `/soma prompt` diagnostic checked for "Learned Patterns" but actual heading is "Muscle Memory".

---

## [0.6.5] — 2026-03-28

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard + stale warning, slash command usage hints**
- **`soma inhale --list`** — show available preloads with age and staleness markers from CLI.
- **`soma inhale <name>`** — partial name match. Load a specific preload by date, session ID, or any substring. Ambiguous matches show alternatives.
- **`soma inhale --load <path>`** — load any file as a preload by absolute or relative path.
- **`soma map <name>`** — top-level subcommand replacing `--map` flag. Runs a MAP with prompt-config and targeted preload.
- **`soma map --list`** — show available MAPs with status and description from CLI.
- **`/soma preload`** (in-session) — enhanced to list all preloads + inject by partial name match.
- **`listPreloads()`** + **`findPreloadByName()`** in `core/preload.ts` — preload discovery and partial name matching.
- **Settings-driven heat overrides** (`settings.heat.overrides`) — per-project AMPS heat control. Values act as both seed and decay floor. Plan/MAP overrides take priority. (`31e1383`)
- **`inherit.automations`** — separate from tools inheritance, allows projects to opt out of parent MAPs independently. (`3f01343`)
- **Statusline preload indicator** — shows preload status in footer. Smart `/exhale` detects edit vs write mode. (`76cd246`)
- **Auto-archive stale preloads** after exhale — `archiveStalePreloads()` moves old preloads to `_archive/`. (`7f2f086`)
- **Restart signal** — auto-create `.restart-required` on extension/core file changes, check across full soma chain. Signal moved to `~/.soma/` (global). (`14d0253`, `635d36e`, `e252a63`)

### Changed
- **`--preload` flag deprecated** — shows warning pointing to `soma inhale` or `soma map`. Still works for backward compat.
- **Boot greeting decomposed** — session ID and file paths now separate template variables. (`4d8331f`)

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- **Crash on partial settings** — `settings.heat.overrides` access without optional chaining crashed when `heat` section missing. Now defensive. (`b837a37`)
- **Breathe graceSeconds mismatch** — runtime fallback was 60s, settings default was 30s. Aligned to 30s. (`b837a37`)
- **5 auto-breathe UX gaps** — smart context warnings, resume awareness, write heuristic for preload detection. (`0f86bec`)

---

## [0.6.4] — 2026-03-23

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard + stale warning, slash command usage hints**
- **prompt before auto-init + parent inheritance (SX-164, SX-165, SX-241)**
- **show command provenance in /soma status (SX-233)**
- **track cli.js as source in agent repo (SX-252)**
- **Body architecture** — structured identity system. `.soma/body/` with content files (`soul.md` → `{{soul}}`, `voice.md` → `{{voice}}`, `body.md` → `{{body}}`) and templates (`_mind.md`, `_memory.md`, `_boot.md`). Content files become template variables. Templates control system prompt and preload structure.
- **Template engine** (`core/body.ts`) — `{{variable}}` interpolation with 5 modifiers (`|tldr`, `|section:Name`, `|lines:N`, `|last:N`, `|ref`), conditional blocks (`{{#var}}...{{/var}}`), graceful degradation for missing vars.
- **AMPS Skill Loader** (`core/skill-loader.ts`) — unified content scanner. All AMPS classified by heat: hot (8+) = full body in prompt, warm (3-7) = `<available_skills>` XML (agent reads on demand), cold (0-2) = hidden. Claude's native skill format.
- **`/body` command** — template inspector with 4 subcommands: `check` (health report), `vars` (all variables by category), `map` (template structure), `render` (full compiled system prompt, fresh from disk).
- **Variable registry** — 50+ template variables categorized (context, identity, section, boot, session, focus, metadata, preload-tpl, deprecated) with essential flags and descriptions.
- **`SOMA.md`** replaces `identity.md` as canonical identity file. Resolution: `body/soul.md` → `SOMA.md` → `identity.md` (legacy fallback).
- **`body.md`** — project-shaped working context variable (`{{body}}`). Changes per project, placed anywhere in `_mind.md`.
- **First-breath template** — conditional blocks (`{{#has_code}}`, `{{#is_blank}}`) for first-run experience.
- **`/exit`** command — save state and quit cleanly.
- **Boot greetings** rewritten — "You woke up" not "You've booted into a session."
- **Header bar** shows soul/body status indicators.
- **`soma-verify.sh drift`** — `_public/` sync check across protocols, muscles, body files, community repo, and agent repo.
- **`systemPrompt.maxTokens`** wired as soft warning — notification when compiled prompt exceeds budget.
- **Muscle heat bumps on load** — muscles that stay relevant gain heat naturally (+1 per boot). Previously only bumped when explicitly read.
- **Body file inheritance** — content files and templates walk the soma chain (project → parent → global). Child wins on collision.
- **`user.name`**, `user.style` settings with `{{user_name}}`, `{{user_style}}` variables.

### Changed
- **System prompt** driven by `body/_mind.md` template when present. Users control structure, sections, custom text. Falls back to built-in compiler.
- **Warm AMPS** appear as `<available_skills>` XML alongside Pi native skills — Claude's trained format for lazy-loaded content.
- **`prompts/system-core.md`** — removed explicit context percentages (50/70/80/85%). Auto-breathe handles thresholds; agent shouldn't guess.
- **AMPS cleanup** — 44 → 34 active muscles (10 archived), 9 → 2 high-overlap triggers (16 cleaned), 34/34 have descriptions.
- **Docs sweep** — 9 pages updated for body architecture, SOMA.md, skill loader, template engine, removed gendered pronouns.
- **`sync-docs.sh`** manifest expanded — 10 new docs added (focus, maps, sessions, prompts, skills, settings, themes, keybindings, models, terminal-setup).
- **Protocol test** accepts `description:` alongside `breadcrumb:` (migration compat).
- **Sandbox test** updated for 8 extensions, 19 protocols, SOMA.md init.

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- **defensive settings.heat access + stale test mocks — 567/567 pass**
- **5 UX gaps — smart warnings, resume awareness, write heuristic**
- **Conversation tail injection removed** — was scanning stale Pi JSONL sessions from wrong runtime, sidetracking agent with old conversations.
- **Soul frontmatter leaking** into rendered system prompt — `loadIdentity()` now strips YAML frontmatter.
- **Duplicate `# Identity` heading** — `buildLayeredIdentity()` no longer hardcodes heading; template handles it.
- **`_public/` drift** — 22 files synced across community + agent repos. Drift detection tool built.
- **Boot message duplication** — stripped content already in system prompt from boot followUp.
- **`/body render`** compiles fresh from disk each time (was using stale boot cache).

### Internal
- **`VARIABLE_REGISTRY`** in `core/body.ts` — complete registry of all template variables with categories, essential flags, descriptions.
- **`core/skill-loader.ts`** — `LoadableContent` interface, `loadAllContent()`, `formatAsSkillsXml()`.
- **`compileWithTemplate()`** — template path in `compileFullSystemPrompt()`, shared section builders.
- **`getDefaultMindTemplate()`**, `getDefaultBootTemplate()` — built-in fallback templates.
- **`loadFirstBreath()`** — conditional first-run template with chain inheritance.
- **52 block variables** tested (77/77 body tests + 19 E2E).
- **Frontmatter-kit** — 9 scripts for bulk AMPS frontmatter operations (extract, writeback, sort, migrate, audit).
- **`preload.lastMessages`** setting removed (conversation tail scanner was the only consumer).

---

## [0.6.3] — 2026-03-22

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard + stale warning, slash command usage hints**
- **prompt before auto-init + parent inheritance (SX-164, SX-165, SX-241)**
- **show command provenance in /soma status (SX-233)**
- **track cli.js as source in agent repo (SX-252)**
- **settings-driven heat overrides — per-project AMPS control**
- **inherit.automations — separate from tools inheritance**
- **statusline preload indicator + smart /exhale (edit vs write)**
- **auto-archive stale preloads after exhale + archiveStalePreloads()**
- **`/hub` command** — unified hub interface for community content. Install, fork, share, find, list, status. Replaces old `/install` and `/list` commands (kept as backward compat aliases).
- **Smart sharing** (`/hub share`) — quality scoring (0-100%), privacy auto-fix with `_public/` staging, README generation that captures `--help` output and extracts functions, dependency resolution.
- **Drop-in commands** — scripts in `.soma/amps/scripts/commands/` become `/soma <name>` commands. Hot-loadable, no restart needed. Tab completions included.
- **`scope: core` protocols** — documentation protocols whose behavior is coded in TypeScript. Never loaded into prompt (saves ~2000 tokens). Discoverable, readable on demand via docs section. `/pin` and `/kill` block with explanation.
- **5 core protocols** — breath-cycle, heat-tracking, session-checkpoints, git-identity, hub-sharing.
- **`automation` content type** — MAPs are now installable hub content. 3 published: debug, refactor, visual-gap-analysis.
- **Dependency resolution** — `requires:` in frontmatter auto-installs dependencies (scripts, protocols, muscles) alongside content.
- **`gitIdentity.email` array support** — multiple valid emails for multi-account users.
- **Default preload template** — Weather (emotional tone) + Warnings (traps for next session) sections.
- **Preload template** on community hub — customizable preload format.
- **Regression test suite** — test-hub.sh (25 tests) + test-commands.sh (26 tests). Side-effect testing for `-p` mode.

### Changed
- **Hub: 40 items** across 5 content types (17 protocols, 8 muscles, 3 scripts, 3 automations, 9 templates).
- **`/soma prompt`** shows core protocols with 📄 icon instead of misleading heat display.
- **Bundled protocols** updated with shipped tool references (soma-code, soma-scrape, soma-spell).
- **Community CI** — validate-frontmatter accepts `triggers` (replaces `topic`+`keywords`), `description` OR `breadcrumb`. Format-check supports `scope: core`. Attribution allows org identity for owners. Actions upgraded to v6 (Node 22).

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- **defensive settings.heat access + stale test mocks — 567/567 pass**
- **5 UX gaps — smart warnings, resume awareness, write heuristic**
- **`/hub list --remote`** — flag was parsed as type filter, returning 0 results.
- **Drop-in command output** — ANSI escape codes stripped (sendUserMessage renders markdown, not terminal).
- **Stale git-identity heat rule** removed from HEAT_RULES (protocol was archived).
- **soma-refactor.sh scan** — string references now exclude node_modules/dist/.git.

### Security
- **soma-beta** — `.map` files (128) and `.d.ts` files (64) stripped from dist. Source maps contained full `sourcesContent`.
- **soma-beta** — orphan history on every release. Old commits can't recover source code.

### Internal
- 7-phase dev cycle MAP (soma-dev/cycle.md with phase files)
- Blog content cycle MAP (blog/cycle.md with phase files)
- SVG blog diagrams muscle (Soma palette, transparent bg, rsvg-convert pipeline)
- Migration v0.6.2→v0.6.3 updated for scope:core + git-identity restore
- FRONTMATTER.md rewritten, CONTRIBUTING.md updated
- 185 unit test assertions (was 162), 51 regression tests

## [0.6.2] — 2026-03-21

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard + stale warning, slash command usage hints**
- **prompt before auto-init + parent inheritance (SX-164, SX-165, SX-241)**
- **show command provenance in /soma status (SX-233)**
- **track cli.js as source in agent repo (SX-252)**
- **settings-driven heat overrides — per-project AMPS control**
- **inherit.automations — separate from tools inheritance**
- **statusline preload indicator + smart /exhale (edit vs write)**
- **auto-archive stale preloads after exhale + archiveStalePreloads()**
- **Natural muscle heat detection** — muscles now heat-bump from natural use, not just focus. Script execution matches against `tools:` field. File edits match path segments against `triggers`. Zero configuration needed.
- **Migration system** — `version` field in settings.json. `core/migrations.ts` discovers and chains migration maps. `soma doctor` checks workspace health. `soma doctor --fix` auto-repairs. `soma doctor --migrate` spawns agent for complex fixes.
- **Community template sync** — boot fetches latest protocols from community repo. Bundled protocols serve as offline fallback. Add content to community → add name to template → all new users get it.
- **`tools:` field** in muscle frontmatter — declares which scripts a muscle references. Parsed and used for natural heat detection.

### Changed
- **Triggers consolidation** — `triggers` + `keywords` + `topic` merged into single `triggers` list at parse time. `tags` stays for categorization only. Old format works indefinitely (backwards compat).
- **Muscle interface simplified** — one activation list instead of four redundant fields with different score weights.
- **Personality engine** — welcome flow is honest about being templates, not the agent.

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- **defensive settings.heat access + stale test mocks — 567/567 pass**
- **5 UX gaps — smart warnings, resume awareness, write heuristic**
- **Runtime delegation** — soma-beta now includes cli.js and Pi runtime files. Previously thin-cli fell through to raw Pi (no version skip, no auto-rotate, "Update Available" banner).
- **Fresh installs** now include version field in settings.json.
- **Stale test assertions** — test suite checked for removed frontmatter fields and nonexistent commands.

### Internal
- soma-theme.sh, soma-rebrand.sh, soma-switch.sh dev mode, soma-doctor.sh
- script-polish + github-theming muscles
- 7 repo READMEs refreshed, post-release MAP created
- License date corrected to 2027-09-18, contact standardised to meetsoma@gravicity.ai
- Dangerous CI disabled (release-publish.yml shipped full source on v* tags)

---

## [0.6.1] — 2026-03-20

### Changed
- Pi runtime upgraded 0.61.0 → 0.61.1 — Release Round 3 (#3cbf2bc)
  - Keybinding eviction fix (stop removing unrelated defaults)
  - agentDir respected for SDK session paths
  - Suspend/resume stability (Ctrl+Z/fg)
  - ToolCallEventResult exported

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- **defensive settings.heat access + stale test mocks — 567/567 pass**
- **5 UX gaps — smart warnings, resume awareness, write heuristic**
- CLI dist synced from pi-mono 0.61.1 — `getEditorKeybindings` → `getKeybindings` crash resolved
- Stale `content-cli.js` import removed (Pi 0.61.0 moved install/list/content to main.js)
- `--help` fixed — `printGumHelp` removed in 0.61.0, replaced with `printHelp`
- Heat system docs: `.protocol-state.json` → `state.json` across 6 files, 3 repos
- Protocols page: collapsed 60-line heat duplication to reference, renamed "Protocols & Heat" → "Protocols"
- `soma-verify.sh self-analysis`: script search recurses into subdirectories, skips archived `.soma/`
- 7 muscles: missing `topic:` / `keywords:` frontmatter restored
- `.protocol-state.json` deleted (dead since March 13)

### Docs
- 27 pages across 5 sections (was 24 across 5 disorganised sections)
- New: `amps.md` (four-layer overview), `migrating.md` (from CLAUDE.md/.cursorrules), `troubleshooting.md`
- Collapsible sidebar with section icons
- Roadmap curated for all 7 versions, "Next" section added
- `/beta` redesigned: "Private Beta" → "Source Access" with tier cards and Known Gaps

### Blog
- "Three Files" — solo, on identity and architecture
- "The Ratio" — solo, on code vs behavior growth
- "The Operating System We Didn't Plan" — solo, on AMPS as dev process
- Interlinks across all 8 published posts + doc page SEO links

### Internal
- `soma-dev` CLI: doctor, fix, sync-dist, reinstall commands
- `system-audit` + `audit-preflight` MAPs — truth-check any subsystem
- `release-tracking` protocol + `release-cycle` MAP
- Release folder structure: `v0.6.0/` (archived) + `v0.6.x/` (living)
- AMPS organised: `_public/` staging for hub, consistent across protocols/muscles/scripts
- `amps-interconnect` MAP restored from archive
- `solo-editorial` muscle for agent-authored blog posts

## [0.6.0] — 2026-03-20

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard + stale warning, slash command usage hints**
- **prompt before auto-init + parent inheritance (SX-164, SX-165, SX-241)**
- **show command provenance in /soma status (SX-233)**
- **track cli.js as source in agent repo (SX-252)**
- **settings-driven heat overrides — per-project AMPS control**
- **inherit.automations — separate from tools inheritance**
- **statusline preload indicator + smart /exhale (edit vs write)**
- **auto-archive stale preloads after exhale + archiveStalePreloads()**

#### MAP System — Plan-Driven Agent Orchestration
- `maps.ts` — MAP discovery + prompt-config YAML parser (#1039512)
- `PlanPromptConfig` — plan-driven system prompt overrides: heat overrides, force-include/exclude, section toggles, budget overrides, supplementary identity (#28d71fe)
- `soma --map <name>` — MAP targeting via `.boot-target` signal file. Loads prompt-config, targeted preload, and MAP content as navigation context (#a12709e)
- 18 tests for MAP parser + plan override compilation (#df835cb)

#### Focus Targeting — Seam-Traced Boot
- `soma-focus.sh` — pre-model seam-traced boot priming. Traces keyword through memory, scores relevance, generates `.boot-target` with heat overrides (#116c4bb)
- Focus handler in `soma-boot.ts` — `type: "focus"` .boot-target support. Loads focus preload, related MAPs (max 3), focus summary (#2f7d302)
- Muscle trigger engine — `triggers:` frontmatter parsed and matched at boot. Muscles auto-activate when focus keyword matches their tags, keywords, topics, or explicit triggers (#1bc1c57)
- `matchMusclesToFocus()` — TypeScript-native muscle matching with scored relevance (10=trigger, 5=tag/keyword, 4=topic, 3=name, 2=digest) (#1bc1c57)
- `trackMapRun()` — programmatic MAP usage tracking. Auto-increments `runs:` and updates `last-run:` in frontmatter when MAP loads via .boot-target (#893f176)

#### Scripts — Agent Tools That Ship
- **5 Tier 1 scripts** now ship with Soma and are seeded on `soma init` (#116c4bb):
  - `soma-code.sh` — multi-language codebase navigator (map, find, refs, replace, structure, tsc-errors)
  - `soma-seam.sh` — trace concepts through memory, code, and sessions
  - `soma-focus.sh` — seam-traced boot priming
  - `soma-reflect.sh` — parse session logs for patterns and observations
  - `soma-plans.sh` — plan lifecycle management
- `scaffoldScripts()` in `init.ts` — copies bundled scripts to `.soma/amps/scripts/` on init (#116c4bb)
- `ensureGlobalSoma()` — bootstraps `~/.soma/` with AMPS layout on first boot. Seeds scripts, creates global identity template. Idempotent. (#47422e8)
- Protocol scope fix — 5 protocols changed from hub/internal to bundled for proper CLI distribution (#47422e8)
- Recursive AMPS discovery — muscles, protocols, scripts, MAPs now scan subdirectories (max 2 levels). Directories with `_` or `.` prefix are skipped. Enables organized layouts: `muscles/ui/`, `scripts/dev/`, `maps/runtime/` (#c36dcd0)
- Identity template enhanced — 5 working patterns (read-before-write, scripts-first, verify-before-claiming, corrections-as-signal, log-your-work) in both built-in and smart templates (#98035e9)
- `soma-pr.sh` moved to `_dev/` — requires GitHub App secrets users don't have (#98035e9)
- `soma-scrape.sh` — intelligent doc discovery + scraping (resolve, pull, search, discover). Requires gh, curl, jq (#18e5bde)
- `soma-query.sh` — unified search replacing soma-scan + soma-search. Commands: find, list, search, sessions, related, impact (#5604f2a)
- `/scan-logs --send` flag — injects search results into agent conversation (#1f891a5)

#### Guard & Safety
- Worktree boundary enforcement — hard-block writes outside allowed worktree path (#961f2bc)
- Soul-space command gated behind `.gate.md` file (#2b0d819)

#### Agent Infrastructure
- PR template, agent contribution standards for GitHub App bot PRs (#743b48d)
- Soul-space mode — `/soul-space on` replaces keepalive with MLR prompts (#caea905)
- TypeScript type checking (`npm run check`) + biome linting (`npm run lint`) (#20ab881)

#### Identity & Protocols
- Identity bootstrap with 4 sections: This Project, Voice, How I Work, Review & Evolve (#c5086ea)
- `response-style` protocol — set voice, length, emoji, and format preferences (#50aee8a)
- Dignity clause in `correction-capture` — acknowledge without over-apologizing (#50aee8a)
- `maps` protocol — teaches MAP system: check before tasks, build after repeated processes (#4a85b53)
- `plan-hygiene` protocol — plan lifecycle: status tracking, ≤12 active budget, verify before claiming (#4a85b53)
- `soma inhale` CLI subcommand — fresh session with preload from last session (#f61064f)
- `soma` (no args) now starts clean — no preload injection (#f61064f)
- User interrupt detection during auto-breathe — 1st interrupt resets timer, 2nd cancels (#d530af8)
- Gum-formatted `--help` output with tables and styled header (cli)

### Changed
- Pi runtime upgraded 0.60.0 → 0.61.0 — full upstream sync (Release Round 2), 76 upstream commits (#de7bd1c)
- `PI_PACKAGE_DIR` + `SOMA_CODING_AGENT_DIR` env vars — correct path delegation for .soma/ project dirs (#5c9ba4d, #f5818a6)
- `system-core.md` updated — scripts-first workflow, tool-building guidance, session logging format, preload coaching, verify-before-claiming (#116c4bb)
- `tool-discipline.md` v3.0.0 — script-first workflow, when to build scripts, script standards (#116c4bb)
- `soma-breathe.ts` extracted from `soma-boot.ts` — cleaner separation of concerns (#aa4ae19)
- Protocol quality-standards expanded — close-the-loop, tests-match-code, conventional commits (#d2dc95d)
- Preload quality added to breath-cycle TL;DR (#0632fad)
- Author attribution + CC BY 4.0 license footers on protocols (#0a2e0ac)

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- **defensive settings.heat access + stale test mocks — 567/567 pass**
- **5 UX gaps — smart warnings, resume awareness, write heuristic**
- Edit tool detection in preload + overwrite-safe breathe instructions (#9e7684f)
- Auto-breathe graceSeconds consistency + DRY path helpers (#ec857f8)
- Auto-breathe timeout + session log `-2` suffix bugs (#baaf51b)
- Session ID extraction from Pi entry format (#7b3931e)
- Reuse session ID on resume — no more orphan logs (#01bc3b7)
- Guard session_start against Pi cache re-fire (#04571ed)
- All 10 pre-existing TypeScript errors resolved — 0 type errors (#13bfaf9)
- `/auto-breathe off` now cancels in-flight rotation (#2bdcf99)
- Stray 't' in boot causing "Failed to load extension: t is not defined" (#be18665)
- `findSomaDir` returns SomaDir object — use `.path` for join() (#73eca3b)
- Settings test allows partial override files (guard-only) (#d372373)
- Maps test output format matches `Results:` pattern for soma-ship (#45017ce)
- `/scrape` route.provide moved inside handler scope (#cf0170d)
- Warm protocol TL;DRs shortened from 400-555 to ~150 chars — saves ~1500 tokens per boot (#9008d43)
- `pre-flight` heat lowered from 8 (hot) to 5 (warm) — too heavy for empty repos (#9008d43)
- `scaffoldProtocols()` now copies ALL bundled protocols on init, not just breath-cycle (#9008d43)
- Auto-breathe grace period is now time-based (30s default) instead of turn-based (#8ca5e52)
- Preload trust hierarchy — boot instructions explicitly require stating resume point (#dfb5ca9)
- Hub protocol TL;DRs tightened (git-identity, session-checkpoints, tool-discipline) (#dd8c4cf)
- Breadcrumbs synced from community — consistent cross-repo references (#9461185)
- All 14 bundled protocols synced to workspace — zero drift. 7 had diverged since v0.5.2 (#d49d9c7)
- `soma-focus.sh` unbound variable fix when no `.soma/` exists (#d49d9c7)
- `soma-focus.sh` regex updated for recursive AMPS paths (subdirectory muscles/protocols/MAPs) (#6f7549f)
- MAP discovery now scans `projects/*/phases/*/map.md` — phase MAPs co-located with project specs (#9f9cca7)
- `findMap()` falls back to full discovery when direct path lookup fails (#9f9cca7)
- MAP scope: 8 root MAPs changed from `internal` to `public` (build-muscle, build-script, debug, plan-to-maps, refactor, soma-focus, plan-validation, sdk-research)
- MAP test uses temp fixture instead of hardcoded workspace path (#bd53f45)
- Focus fast mode for common keywords — skip seam trace when 50+ matches, scan frontmatter directly (#027fc87)
- Focus heat scoring fixed — `score * 2` reaches HOT tier (was `score + 2`, max WARM). Force-include at score 5+ (was 8+) (#5d572d6)
- Focus MAP prompt-config merging — related MAPs' heat overrides and force-includes merge into focus session (#5d572d6)
- `ensureGlobalSoma()` now seeds bundled protocols — existing users get new protocols on upgrade (#fe29c0e)
- Tests updated for soma-query consolidation, maps protocol frontmatter fixed (#29687e7)
- Removed dead `getScriptDescription()` function (#6ddc8f7)
- Maps protocol TL;DR updated with `soma focus` + tracking mention (#a4e8413)
- `scaffoldScripts` now seeds all 10 shipped scripts (was 8) (#2757bdb)
- All directory trees in docs aligned with amps/ layout (#705e089)
- Stale memory/muscles paths fixed → amps/muscles (#ba5c5ca)

### Docs
- New page: `models.md` — comprehensive Models & Providers guide: 17+ providers, API key storage, custom providers (#1781d24)
- New page: `keybindings.md` — keyboard shortcuts and customisation (#56ab090)
- New page: `themes.md` — built-in and custom themes (#56ab090)
- New page: `settings.md` — engine settings reference (#56ab090)
- New page: `terminal-setup.md` — terminal recommendations and tmux (#56ab090)
- New page: `sessions.md` — session tree, fork, compaction, branch summarisation (#cdb7cd1)
- New page: `prompts.md` — prompt template format and usage (#cdb7cd1)
- New page: `skills.md` — SKILL.md format and skill authoring (#cdb7cd1)
- `getting-started.md` updated — "Set Up a Provider" section, model switching (#1781d24)
- `commands.md` updated — Model Commands section, CLI model flags (#1781d24)
- `extending.md` updated — custom model providers section (#b99902a)
- Pi doc parity: 23/23 docs covered (was 15/23)
- New page: `maps.md` — MAP system guide: creation, prompt-config, loading, tracking (#14744fb)
- New page: `focus.md` — seam-traced boot priming: usage, matching scores, triggers (#14744fb)
- `scripts.md` rewritten — 6→14 scripts documented, core/utility sections, "Building Your Own" guide (#14744fb)
- `how-it-works.md` — added MAPs + Focus sections, fixed duplicated paragraph, context scaling note (#14744fb)
- `configuration.md` — added Custom Content Paths, Script Discovery, Global Config (~/.soma/) sections (#6ddc8f7)
- `muscles.md` — added tags, triggers, tools frontmatter fields (#14744fb)
- `protocols.md` — 4→16 protocol table with all shipped protocols (#14744fb)
- Commands page: add /code, /scrape, /scan-logs, fix auto-continue→rotate, add --orphan (#5629dd3)
- Guard: add cross-references to related muscles, MAPs, scripts (#dd1a117)
- How-it-works: add router and CLI rotation to auto-breathe section (#35c939e)
- Add /route command and soma-route.ts extension docs (#668b23f)
- Scripts: add soma-scan and soma-search, fix usage paths for npm users (#e791660)
- Fix preload naming convention docs (#2b1be52)
- Reality check — remove stale scripts, fix AMPS layout, update commands (#dfce881)

### Protection & Distribution
- BSL 1.1 license deployed to all repos (agent, cli, community, core)
- All GitHub repos → private (soma-agent, cli, community, core)
- npm: 6/7 versions unpublished, v0.1.0 deprecated
- Beta signup: Vercel serverless API → GitHub Issue via soma-agent[bot]
- beta-testers GitHub team created (read access to soma-agent)
- esbuild obfuscation pipeline — `scripts/build-dist.mjs` compiles 7 extensions + core to 140KB minified+mangled JS (#ef86ff5)
- Distribution verification — `scripts/verify-dist.mjs` with 23 checks (#8962681)
- `npm run build:dist` — clean + compile + verify in one command
- Protocols ship as readable .md in `dist/content/`

### Thin CLI (repos/cli)
- Thin CLI wrapper — 37KB total, zero dependencies, pure Node built-ins
- Personality engine (`personality.js`) — 12 skeleton intents, 46 variants, 9 spintax topics, 14 paragraph templates
- Interactive Q&A — press `?` to ask about 9 topics with keyword matching (50+ triggers)
- Typing animation — `typeOut()` with punctuation pauses, random jitter, ANSI-aware
- `soma init` — GitHub CLI auth: `gh` → team membership (with repo access fallback) → clone dev → npm install
- `soma doctor` — 11 health checks with personality engine summary
- `soma update` — npm CLI + core git versions (fetch-first)
- `soma status` — version, home, install state, beta access, core branch@hash
- `soma about` — full explainer with generated pitch footer
- No-compaction topic — key differentiator messaging
- Daily rotating concepts (8 topics) on welcome screen
- Beta access cached with 1-hour TTL
- Delegation: `PI_CODING_AGENT_DIR` env var → Pi discovers Soma extensions (#8598c56)
- Smart command detection — post-install commands show "requires runtime"
- `PI_PACKAGE_DIR` delegation — thin-cli.js resolves piConfig from soma-beta package.json, all project paths → `.soma/` (#5c9ba4d)
- `SOMA_CODING_AGENT_DIR` — both PI_ and SOMA_ env vars set for delegation regardless of piConfig load order (#f5818a6)
- User extension discovery — `.soma/extensions/` passed via `-e` flags to Pi runtime
- soma-beta v0.6.0-rc.6 — self-contained: thin-cli + personality + extensions + core + themes + export-html + protocols (680KB)
- `soma-release.sh` — reads Pi dep versions dynamically from agent package.json, bundles thin-cli.js + personality.js, piConfig verification gate

### Testing
- `soma-sandbox.sh` — 30 automated E2E tests: branding (5), paths (3), infra (7), bundled CLI (5), models (3), identity (1), path resolution (3), tools (3), extensions (1), features (2)
- `soma-seam.sh audit upstream` — cross-references upstream Pi changes against our imports, flags breaking changes, maps API usage frequency
- Test suite overhaul — 7/13 suites execute real TypeScript via tsx (487+ total assertions)
- `test-settings.sh` — 21 executed tests: defaults, cascade, malformed JSON, path resolution (#c13a7d3)
- `test-identity.sh` — 13 executed tests: hasIdentity, loadIdentity, buildLayeredIdentity (#c13a7d3)
- `test-preload.sh` — 15 executed tests: findPreload, hasPreload, filenames, instructions (#c13a7d3)
- `test-protocols.sh` — +11 executed: detectProjectSignals, protocolMatchesSignals (#5dcc324)
- `test-utils.sh` — 26 executed: every exported function tested (#5dcc324)
- `test-muscles.sh` — enforces triggers, applies-to, frontmatter integrity (#db5c5a4)

### AMPS Hygiene
- 33 muscles patched — all active muscles have `triggers:` and `applies-to:`
- 2 corrupted frontmatter fixes + 31 YAML merge artifacts fixed
- e2e-flow-testing muscle — test in isolation pattern
- Visual gap analysis MAP expanded (9 steps, 7 patterns, E2E test phase)
- 5 MAPs updated with test quality info
- release-cycle MAP: +Phase 5 (changelog sync) +Phase 6 (E2E verification)

### Internal
- Pi constraints documented — discovery.ts untestable outside Pi runtime, piConfig package-scoped, no programmatic extension registration, APP_NAME defaults to "pi"
- Ignore per-worktree `.pi/` and `.soma/settings.json` in git (#d6778a2)

---

## [0.5.2] — 2026-03-15

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard + stale warning, slash command usage hints**
- **prompt before auto-init + parent inheritance (SX-164, SX-165, SX-241)**
- **show command provenance in /soma status (SX-233)**
- **track cli.js as source in agent repo (SX-252)**
- **settings-driven heat overrides — per-project AMPS control**
- **inherit.automations — separate from tools inheritance**
- **statusline preload indicator + smart /exhale (edit vs write)**
- **auto-archive stale preloads after exhale + archiveStalePreloads()**
- `/scan-logs` command — search previous tool calls + results across sessions (#31a7e17)
- `/scrape` command + `scrape:build` router capability — intelligent doc discovery (#c950f2b)
- Boot session warnings injection — tool usage stats from previous session (#0cda314)
- Boot last conversation context — inject last N messages on fresh boot (#f1d7f3d)
- Periodic auto-commit for crash resilience (#c6caccc)
- `graceTurns` setting — configurable grace period before auto-breathe rotation (#c9ab5a8)
- Guard v2: tool→muscle gating — require reading muscles before dangerous commands (#1c6b725)
- Protocol TL;DR extraction — `protocolSummary()` prefers `## TL;DR` body section (#83ec9ee)
- Scratch lifecycle: session IDs, date sections, note management, auto-inject (#fd0bda2, #0d364f2)
- Combined session ID format (`sNN-<hex>`) — sequential for order, hex for uniqueness (#e7c4057)
- Statusline session ID display (#d474cbf)
- Polyglot script discovery — .sh, .py, .ts, .js, .mjs (#1acb8c2)
- Session log nudge with template at trigger point (#eb8acc8)
- Identity layer in pattern-evolution, tool-awareness in working-style (#5e4219d)
- Post-commit auto-changelog + pre-push docs-drift nudge hooks (#cc2ef55)

### Changed
- System prompt trimmed ~19% — remove duplication and stale content (#de9c517)
- Self-awareness protocols rewritten — 5 redundant protocols → configuration guides (#b70ca44)
- Config-first script extensions via `settings.scripts.extensions` (#dadb78e)
- Unified rotation through `/inhale`, removed `/auto-continue` (#7b7ba52)
- Migrated `globalThis.__somaKeepalive` to router (#e919481)

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- **defensive settings.heat access + stale test mocks — 567/567 pass**
- **5 UX gaps — smart warnings, resume awareness, write heuristic**
- Boot: clean up muscle/protocol/automation formatting (#38a643f)
- Boot: resume without fingerprint sends minimal boot, not full redundant injection (#7fd064b)
- Boot: grace countdown skips tool turns during auto-breathe (#53bd421)
- Boot: preload filename overwrites + rotation when preload pre-exists (#378a1b1)
- Boot: auto-init `.soma/.git` when autoCommit is true (#276f6f2)
- Boot: clear restart signal at factory load time (#0bddce2, #bb8350c)
- Muscles/automations: filter archived status + README in discovery (#5f5ccae, #e42da9b)
- Protocols: clean stale references, fix broken frontmatter (#7087d6a)
- Protocols: correct attribution — Curtis Mercier only on personal/protocols-derived (#5d8fb83)
- Heat: dynamic muscle read + script execution detection (#99a7663)
- Extensions: soma-route.ts import path — use pi-coding-agent not claude-code (#49454ea)
- Scripts: stop shipping dev-only scripts to users (#2c8db4a)
- Scripts: sync paths after _dev/ move, AGENT_DIR resolution (#46615ef, #a520c13)
- Statusline: restart detection, fs/path imports, signal path fixes (#f845894, #926fd4a, #18eba69)
- Auto-breathe: reduce triple notifications, preload-as-signal rotation (#927bd74)

---

## [0.5.1] — 2026-03-14

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard + stale warning, slash command usage hints**
- **prompt before auto-init + parent inheritance (SX-164, SX-165, SX-241)**
- **show command provenance in /soma status (SX-233)**
- **track cli.js as source in agent repo (SX-252)**
- **settings-driven heat overrides — per-project AMPS control**
- **inherit.automations — separate from tools inheritance**
- **statusline preload indicator + smart /exhale (edit vs write)**
- **auto-archive stale preloads after exhale + archiveStalePreloads()**

- Capability router for inter-extension communication (`soma-route.ts`) — provides/gets capabilities, emits/listens signals. Replaces `globalThis` hacks (#94576f3, #e919481)
- CLI-based session rotation via `.rotate-signal` file — auto-breathe can now rotate without command context (#2da3155)
- Per-session log files with auto-incrementing names (`YYYY-MM-DD-sNN.md`) — prevents overwrites across rotations (#d776dd6)
- Session log and preload paths surfaced in boot message (#d934799)
- Resume boot diffing — `soma -c` skips redundant preload injection (#de39fd1)
- Restart-required detection — signal file, cmux notification, and statusline indicator when core/extension files change (#9f2a103, #f845894, #926fd4a, #18eba69)
- `soma-changelog.sh` — generate categorized changelog entries from conventional commits with `[cl:tag]` consolidation
- `soma-changelog-json.sh` — parse CHANGELOG.md into JSON for website consumption
- ChangelogIsland.tsx + RoadmapTimeline.tsx — Preact islands for `/changelog/` and `/roadmap/` pages
- `soma-threads.sh` — chain-of-thought tracing tool for blog seeds across session logs
- `soma-verify.sh self-analysis` — muscle health, cross-location divergence, orphan detection
- Protocol TL;DR extraction — `protocolSummary()` prefers `## TL;DR` body section over breadcrumb (#83ec9ee)
- Combined session ID format (`sNN-<hex>`) — sequential for human scanning, hex for collision safety (#e7c4057, #618cd9f)
- `commit-msg` git hook — validates conventional commit format + `[cl:tag]` syntax
- `guard.toolGates` setting — require reading muscles before dangerous bash commands (#1c6b725)
- `breathe.graceTurns` setting — configurable auto-breathe grace period, replaces hardcoded 6-turn limit (#c9ab5a8)
- Session log nudge with template at breathe trigger point (#eb8acc8)
- Periodic auto-commit every 5th turn for crash resilience (#c6caccc)
- Scratch note lifecycle — session IDs, date sections, active/done/parked status, router capabilities, auto-inject (#0d364f2)
- Statusline shows session ID on line 2 (#d474cbf)
- Polyglot script discovery — `.sh`, `.py`, `.ts`, `.js`, `.mjs` (#1acb8c2)

### Changed

- Auto-breathe rotation now writes `.rotate-signal` and calls `ctx.shutdown()` immediately when preload already exists — no more waiting for `turn_end` that may not fire (#378a1b1)
- Preload filenames use `sNN` iterating pattern (was static session ID suffix) to prevent overwrites within a session (#378a1b1)
- Self-awareness protocols consolidated — 5 redundant protocols became configuration guides (#b70ca44)
- `/scratch` extracted to standalone `soma-scratch.ts` extension (#932f446)
- Shared helpers extracted to `utils.ts` — deduplication across core modules (#2dbea9a, #3d8467e)
- Unified rotation through `/inhale`, removed `/auto-continue` (#7b7ba52)
- Changelog pipeline switched to Ghostty-style commit-driven entries (#ec27a11)
- `pattern-evolution` protocol updated with identity maturation layer; `working-style` with tool-awareness (#5e4219d)
- Dev hooks generated locally by `soma-dev.sh`, not committed to repo (#efc6ed4)

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- **defensive settings.heat access + stale test mocks — 567/567 pass**
- **5 UX gaps — smart warnings, resume awareness, write heuristic**

- Muscle and automation discovery — filter archived status and README files (#e42da9b, #5f5ccae)
- Scratch completions — remove PRO commands from free completions list (#fd0bda2)
- Auto-breathe race condition — `sendUserMessage` from `before_agent_start` raced with Pi's prompt processing, now deferred to `agent_end` via pending message queue (#2823ee9, #927bd74)
- Auto-breathe phase 1 ignored by agent — wrap-up trigger now sends a followUp user message, not just system prompt + UI toast (#9d09dd5)
- Auto-breathe triple notification spam reduced (#927bd74)
- Session management — `/inhale` reset, heat dedup on rotation (#044fb2c)
- Dev-only scripts no longer shipped to users (#2c8db4a)
- Restart signal cleared at factory load time, not `session_start` (#0bddce2)
- Dynamic muscle read and script execution detection for heat tracking (#99a7663)
- `soma-route.ts` import path — uses `@mariozechner/pi-coding-agent`, not `@anthropic-ai/claude-code` (#49454ea)
- Internal protocols (`content-triage`, `community-safe`) removed from bundled set (#3ad0884)
- Auto-init `.soma/.git` when `autoCommit` is true (#276f6f2)
- Missing TL;DRs on 4 self-awareness protocols (#c457752)
- `sync-to-cli` path after `_dev/` directory move (#46615ef)
- Grace countdown skips tool turns during auto-breathe — tool-call turns no longer count toward 6-turn limit (#53bd421)
- Resume without fingerprint sends minimal boot instead of full redundant injection — saves ~4-6k tokens (#7fd064b)
- Preload overwrite guard + auto-breathe rotation fix when preload pre-exists (#378a1b1)
- All doc paths updated to `amps/` layout — `.soma/amps/protocols/`, `.soma/amps/muscles/`, etc. (#420f19b)
- Memory layout docs rewritten — core structure is amps/, memory/, projects/, skills/ (#b35c2be)

---

## [0.5.0] — 2026-03-12

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard + stale warning, slash command usage hints**
- **prompt before auto-init + parent inheritance (SX-164, SX-165, SX-241)**
- **show command provenance in /soma status (SX-233)**
- **track cli.js as source in agent repo (SX-252)**
- **settings-driven heat overrides — per-project AMPS control**
- **inherit.automations — separate from tools inheritance**
- **statusline preload indicator + smart /exhale (edit vs write)**
- **auto-archive stale preloads after exhale + archiveStalePreloads()**

- Auto-breathe mode — proactive context management that triggers wrap-up at configurable %, auto-rotates at higher %. Safety net at 85% always on. Opt-in via `breathe.auto` in settings (#1d533bf)
- `/auto-breathe` command — runtime toggle (`on|off|status`), persists to settings.json
- Smarter `/breathe` — context-aware instructions (light/full/urgent), handles preload-already-written and timeout edge cases
- Cold-start muscle boost — muscles created <48h get +3 effective heat for at least 2 sessions
- Orient-from preloads — preload template includes `## Orient From` pointing to files next session should read first
- `soma:recall` event signal — extensions can listen for context pressure events (steno integration)
- `/auto-commit` command — toggle `.soma/` auto-commit on exhale/breathe (`on|off|status`)
- Auto-commit `.soma/` state — changes committed to local git on every exhale/breathe via `checkpoints.soma.autoCommit`
- `/pin` and `/kill` invalidate prompt cache — heat changes take effect next turn, not next session
- `/soma prompt` diagnostic — shows compiled sections, identity status, heat levels, context %, runtime state
- `sync-to-cli.sh` and `sync-to-website.sh` — one-command repo sync scripts
- `soma-compat.sh` — detect protocol/muscle overlap, redundancy, directive conflicts
- `soma-update-check.sh` — compare local protocol/muscle versions against hub
- `/scratch` command — quick notes to `.soma/scratchpad.md`, append-only, agent doesn't see unless `/scratch read`
- `guard.bashCommands` setting — `allow`/`warn`/`block` for dangerous bash command prompts
- Automations system — `.soma/automations/` for step-by-step procedural flows
- Polyglot script discovery — boot discovers `.sh`, `.py`, `.ts`, `.js`, `.mjs` scripts with auto-extracted descriptions
- `soma init --orphan` — `--orphan`/`-o` flag for clean child projects with zero parent inheritance
- Git hooks: `post-commit` auto-changelog + `pre-push` docs-drift nudge
- Bundled protocols: `correction-capture` + `detection-triggers` — learning-agent protocols

### Changed

- Config-first script extensions — `settings.scripts.extensions` controls which file types are discovered
- Command cleanup — removed `/flush`, folded `/preload` into `/soma preload` and `/debug` into `/soma debug`
- CI improvements — PR check and release workflows now run all test suites

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- **defensive settings.heat access + stale test mocks — 567/567 pass**
- **5 UX gaps — smart warnings, resume awareness, write heuristic**

- System prompt dropped after turn 1 — Pi resets each `before_agent_start`, now caches compiled prompt
- Identity never in compiled prompt — `isPiDefaultPrompt()` checked wrong string
- Context warnings never fired — `getContextUsage()` returns undefined on turn 1, handled gracefully
- Identity lost after `/auto-continue` or `/breathe` — `session_switch` now rebuilds from chain
- Guard false positive on `2>/dev/null` — stderr redirects no longer trigger write warnings
- Bash guard false positive on `>>` — append redirects no longer trigger dangerous redirect guard
- Preload auto-injected on continue/resume — `soma -c` and `soma -r` no longer inject stale preloads
- `/soma prompt` crash — `getProtocolHeat` import missing
- Audit false positives — all 11 audit scripts improved across the board

---

## [0.4.0] — 2026-03-11

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard + stale warning, slash command usage hints**
- **prompt before auto-init + parent inheritance (SX-164, SX-165, SX-241)**
- **show command provenance in /soma status (SX-233)**
- **track cli.js as source in agent repo (SX-252)**
- **settings-driven heat overrides — per-project AMPS control**
- **inherit.automations — separate from tools inheritance**
- **statusline preload indicator + smart /exhale (edit vs write)**
- **auto-archive stale preloads after exhale + archiveStalePreloads()**

- Compiled system prompt ("Frontal Cortex") — `core/prompt.ts` assembles complete system prompt from identity chain, protocol summaries, muscle digests, dynamic tool section
- Session-scoped preloads — `preload-<sessionId>.md` prevents multi-terminal conflicts
- Identity in system prompt — moved from boot user message for better token caching
- Parent-child inheritance — `inherit: { identity, protocols, muscles, tools }` in settings
- Persona support — `persona: { name, emoji, icon }` for named agent instances
- Smart init — `detectProjectContext()` scans for parent `.soma/`, `CLAUDE.md`, project signals
- `systemPrompt` settings — toggle docs, guard, CLAUDE.md awareness in system prompt assembly
- `prompts/system-core.md` — static behavioral DNA skeleton
- Debug mode — `.soma/debug/` logging, `/soma debug on|off`
- Protocol graduation — heat decay floor, frontmatter enforcement, preload quality validation
- Configurable boot sequence — `settings.boot.steps` array
- Git context on boot — `git-context` step injects recent commits and changed files
- Configurable context warnings — `settings.context` thresholds

### Changed

- Extension ownership refactor — `soma-boot.ts` owns lifecycle + commands, `soma-statusline.ts` owns rendering + keepalive
- Boot user message trimmed — identity, protocol breadcrumbs, and muscle digests moved to system prompt
- CLAUDE.md awareness, not adoption — system prompt notes existence but doesn't inject content

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- **defensive settings.heat access + stale test mocks — 567/567 pass**
- **5 UX gaps — smart warnings, resume awareness, write heuristic**

- Print-mode race condition — `ctx.hasUI` guard on `sendUserMessage` in `session_start`
- Skip scaffolding core extensions into project `.soma/extensions/`
- Template placeholder substitution on install

---

## [0.3.0] — 2026-03-10

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard + stale warning, slash command usage hints**
- **prompt before auto-init + parent inheritance (SX-164, SX-165, SX-241)**
- **show command provenance in /soma status (SX-233)**
- **track cli.js as source in agent repo (SX-252)**
- **settings-driven heat overrides — per-project AMPS control**
- **inherit.automations — separate from tools inheritance**
- **statusline preload indicator + smart /exhale (edit vs write)**
- **auto-archive stale preloads after exhale + archiveStalePreloads()**

- AMPS content type system — 4 shareable types: Automations, Muscles, Protocols, Skills. `scope` field controls distribution
- Hub commands — `/install <type> <name>`, `/list local|remote` with dependency resolution
- `core/content-cli.ts` — non-interactive content commands for CLI wiring
- `core/install.ts` — hub content installation with dependency resolution
- `core/prompt.ts` — compiled system prompt assembly (12th core module)
- `soma-guard.ts` extension — safe file operation enforcement with `/guard-status` command
- `soma-audit.sh` — ecosystem health check orchestrating 11 focused audits
- `/rest` command — disable cache keepalive + exhale
- `/keepalive` command — toggle cache keepalive on/off/status
- Cache keepalive system — 300s TTL, 45s threshold, 30s cooldown
- Session checkpoints — `.soma/` committed every exhale (local git)
- 10 test suites with 255 passing tests
- Workspace scripts — `soma-scan.sh`, `soma-search.sh`, `soma-snapshot.sh`, `soma-tldr.sh`

### Changed

- Bundled protocols slimmed from all to 4 core (breath-cycle, heat-tracking, session-checkpoints, pattern-evolution)

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- **defensive settings.heat access + stale test mocks — 567/567 pass**
- **5 UX gaps — smart warnings, resume awareness, write heuristic**

- PII scrubbed from git history across all repos
- CLI stripped to distribution only — agent is source of truth

---

## [0.2.0] — 2026-03-09

### Added
- **rewrite DNA.md — self-awareness, owner's manual, link to docs for deep reference**
- **/inhale guard + stale warning, slash command usage hints**
- **prompt before auto-init + parent inheritance (SX-164, SX-165, SX-241)**
- **show command provenance in /soma status (SX-233)**
- **track cli.js as source in agent repo (SX-252)**
- **settings-driven heat overrides — per-project AMPS control**
- **inherit.automations — separate from tools inheritance**
- **statusline preload indicator + smart /exhale (edit vs write)**
- **auto-archive stale preloads after exhale + archiveStalePreloads()**

- Protocols and Heat System — behavioral rules loaded by temperature, heat rises through use, decays through neglect
- Muscle loading at boot — sorted by heat, loaded within configurable token budget
- Settings chain — `settings.json` with resolution: project → parent → global
- Mid-session heat tracking — auto-detects protocol usage from tool results
- Domain scoping — `applies-to` frontmatter + `detectProjectSignals()`
- Breath cycle commands — `/exhale`, `/inhale`, `/pin`, `/kill`
- Script awareness — boot surfaces `.soma/scripts/` inventory
- 9 core modules — discovery, identity, protocols, muscles, settings, init, preload, utils, index

### Fixed
- **help header shows 'CLI v...' not bare version**
- **help rewrite, script theme crash, focus session, postinstall, docs**
- **restore walk-up, keep .soma-only + runtime-home skip**
- **findSomaDir checks current dir only, no walk-up**
- **only .soma/ is a valid soma root, not .claude/ or .cursor/**
- **skip global runtime home in findSomaDir walk-up**
- **defensive settings.heat access + stale test mocks — 567/567 pass**
- **5 UX gaps — smart warnings, resume awareness, write heuristic**

- Extensions load correctly
- Skills install to correct path

---

## [0.1.0] — 2026-03-08

### Born

- σῶμα (sōma) — *Greek for "body."* The vessel that grows around you.
- Built on Pi with `piConfig.configDir: ".soma"`
- Identity system: `.soma/identity.md` — discovered, not configured
- Memory structure: `.soma/memory/` — muscles, sessions, preloads
- Breath cycle concept: sessions exhale what was learned, next session inhales it
- 9 core modules, 4 extensions, logo through 36 SVG iterations
